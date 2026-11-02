/**
 * Push de novas ofertas: registro do token, reação às mensagens e logout, com
 * o React Native Firebase simulado.
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
  api.register.mockResolvedValue({ id: 'd1', platform: 'android' });
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
  expect(mockMessaging.getToken).not.toHaveBeenCalled();
  expect(api.register).not.toHaveBeenCalled();
});

test('registra o token, reage às ofertas e reenvia o token renovado', async () => {
  const onOffer = jest.fn();

  await expect(enablePush(onOffer)).resolves.toBe('enabled');
  expect(api.register).toHaveBeenCalledWith('fcm-token-1', PLATFORM);

  // App aberto: mensagem de oferta antecipa o polling; outras mensagens são ignoradas
  await listeners.onMessage!({ data: { type: 'ride_offer', rideId: 'r1' } });
  await listeners.onMessage!({ data: { type: 'outro' } });
  expect(onOffer).toHaveBeenCalledTimes(1);

  // Toque na notificação com o app em segundo plano
  listeners.onNotificationOpenedApp!({ data: { type: 'ride_offer' } });
  expect(onOffer).toHaveBeenCalledTimes(2);

  listeners.onTokenRefresh!('fcm-token-2');
  await Promise.resolve();
  expect(api.register).toHaveBeenLastCalledWith('fcm-token-2', PLATFORM);
});

test('app aberto pela notificação com ele fechado busca a oferta', async () => {
  mockMessaging.getInitialNotification.mockResolvedValue({ data: { type: 'ride_offer' } });
  const onOffer = jest.fn();

  await enablePush(onOffer);

  expect(onOffer).toHaveBeenCalledTimes(1);
});

test('permissão negada ainda registra o token (o motorista pode liberar depois)', async () => {
  mockMessaging.requestPermission.mockResolvedValue(0);

  await expect(enablePush(jest.fn())).resolves.toBe('denied');
  expect(api.register).toHaveBeenCalled();
});

test('falha ao obter o token não quebra o login', async () => {
  mockMessaging.getToken.mockRejectedValue(new Error('SERVICE_NOT_AVAILABLE'));

  await expect(enablePush(jest.fn())).resolves.toBe('error');
  expect(api.register).not.toHaveBeenCalled();
});

test('logout remove o token na API e para de ouvir as mensagens', async () => {
  await enablePush(jest.fn());

  await disablePush();

  expect(api.unregister).toHaveBeenCalledWith('fcm-token-1');
  expect(mockMessaging.deleteToken).not.toHaveBeenCalled();
  expect(unsubscribe).toHaveBeenCalledTimes(3);
});

test('sessão expirada invalida o token no Firebase (sem chamar a API)', async () => {
  await enablePush(jest.fn());

  await disablePush({ revoke: true });

  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(api.unregister).not.toHaveBeenCalled();
});

test('logout durante o registro não deixa o token ligado à conta antiga', async () => {
  let finishRegister: () => void = () => undefined;
  api.register.mockImplementation(
    () => new Promise((resolve) => { finishRegister = () => resolve({ id: 'd1', platform: 'android' }); }),
  );

  const pending = enablePush(jest.fn());
  await new Promise((r) => setImmediate(r));
  await disablePush();
  finishRegister();

  await expect(pending).resolves.toBe('unavailable');
  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(mockMessaging.onMessage).not.toHaveBeenCalled();
});
