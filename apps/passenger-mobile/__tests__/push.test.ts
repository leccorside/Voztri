/**
 * Push do andamento da corrida: registro do token, reação às mensagens e
 * logout, com o React Native Firebase simulado.
 */

const mockApps: unknown[] = [];
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: { get apps() { return mockApps; } },
}));

const mockMessaging = {
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  deleteToken: jest.fn(),
  getInitialNotification: jest.fn(),
  setBackgroundMessageHandler: jest.fn(),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
};
jest.mock('@react-native-firebase/messaging', () => {
  const fn = () => mockMessaging;
  fn.AuthorizationStatus = { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2, EPHEMERAL: 3 };
  return { __esModule: true, default: fn };
});

jest.mock('../src/api', () => ({
  deviceApi: { register: jest.fn(), unregister: jest.fn() },
}));

import { Platform } from 'react-native';
import { deviceApi } from '../src/api';
import { disablePush, enablePush, isPushAvailable, registerBackgroundHandler } from '../src/push';

const api = deviceApi as jest.Mocked<typeof deviceApi>;
// O preset do Jest simula o iOS
const PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

type Listener = (arg: unknown) => unknown;
const listeners: Record<string, Listener> = {};
const unsubscribe = jest.fn();

const statusMessage = (status: string, rideId = 'ride-1') => ({ data: { type: 'ride_status', rideId, status } });

beforeEach(async () => {
  jest.clearAllMocks();
  mockApps.length = 0;
  mockApps.push({ name: '[DEFAULT]' });
  mockMessaging.requestPermission.mockResolvedValue(1);
  mockMessaging.getToken.mockResolvedValue('fcm-token-1');
  mockMessaging.deleteToken.mockResolvedValue(undefined);
  mockMessaging.getInitialNotification.mockResolvedValue(null);
  for (const name of ['onTokenRefresh', 'onMessage', 'onNotificationOpenedApp'] as const) {
    mockMessaging[name].mockImplementation((cb: Listener) => {
      listeners[name] = cb;
      return unsubscribe;
    });
  }
  api.register.mockResolvedValue({ id: 'd1', platform: 'ios' });
  api.unregister.mockResolvedValue(undefined);
  await disablePush(); // zera o token registrado entre os testes
  jest.clearAllMocks();
});

test('sem configuração do Firebase o push fica desligado sem chamar nada', async () => {
  mockApps.length = 0;

  expect(isPushAvailable()).toBe(false);
  registerBackgroundHandler();
  await expect(enablePush(jest.fn())).resolves.toBe('unavailable');

  expect(mockMessaging.setBackgroundMessageHandler).not.toHaveBeenCalled();
  expect(api.register).not.toHaveBeenCalled();
});

test('registra o token e entrega o id da corrida das mensagens de andamento', async () => {
  const onRideUpdate = jest.fn();

  await expect(enablePush(onRideUpdate)).resolves.toBe('enabled');
  expect(api.register).toHaveBeenCalledWith('fcm-token-1', PLATFORM);

  // App aberto: motorista a caminho e chegada; mensagens de outro tipo são ignoradas
  await listeners.onMessage!(statusMessage('DRIVER_EN_ROUTE'));
  await listeners.onMessage!({ data: { type: 'ride_offer', rideId: 'ride-x' } });
  await listeners.onMessage!({ data: { type: 'ride_status' } }); // sem rideId
  // Toque na notificação com o app em segundo plano
  listeners.onNotificationOpenedApp!(statusMessage('DRIVER_ARRIVED', 'ride-2'));

  expect(onRideUpdate.mock.calls).toEqual([['ride-1'], ['ride-2']]);

  listeners.onTokenRefresh!('fcm-token-2');
  await Promise.resolve();
  expect(api.register).toHaveBeenLastCalledWith('fcm-token-2', PLATFORM);
});

test('app aberto pela notificação com ele fechado atualiza a corrida', async () => {
  mockMessaging.getInitialNotification.mockResolvedValue(statusMessage('DRIVER_ARRIVED'));
  const onRideUpdate = jest.fn();

  await enablePush(onRideUpdate);

  expect(onRideUpdate).toHaveBeenCalledWith('ride-1');
});

test('permissão negada ainda registra o token e falha no token não quebra o login', async () => {
  mockMessaging.requestPermission.mockResolvedValueOnce(0);
  await expect(enablePush(jest.fn())).resolves.toBe('denied');
  expect(api.register).toHaveBeenCalled();

  mockMessaging.getToken.mockRejectedValueOnce(new Error('SERVICE_NOT_AVAILABLE'));
  await expect(enablePush(jest.fn())).resolves.toBe('error');
});

test('logout remove o token na API; sessão expirada invalida no Firebase', async () => {
  await enablePush(jest.fn());
  await disablePush();
  expect(api.unregister).toHaveBeenCalledWith('fcm-token-1');
  expect(mockMessaging.deleteToken).not.toHaveBeenCalled();
  expect(unsubscribe).toHaveBeenCalledTimes(3);

  await enablePush(jest.fn());
  await disablePush({ revoke: true });
  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(api.unregister).toHaveBeenCalledTimes(1);
});

test('logout durante o registro não deixa o token ligado à conta antiga', async () => {
  let finishRegister: () => void = () => undefined;
  api.register.mockImplementation(
    () => new Promise((resolve) => { finishRegister = () => resolve({ id: 'd1', platform: 'ios' }); }),
  );

  const pending = enablePush(jest.fn());
  await new Promise((r) => setImmediate(r));
  await disablePush();
  finishRegister();

  await expect(pending).resolves.toBe('unavailable');
  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(mockMessaging.onMessage).not.toHaveBeenCalled();
});
