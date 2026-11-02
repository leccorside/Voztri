/**
 * createPushController: Firebase opcional, permissão, registro e renovação do token,
 * entrega do `data` das mensagens e logout, com o React Native Firebase simulado.
 * (O filtro de cada app, ride_offer / ride_status, é testado no próprio app.)
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

import { Platform } from 'react-native';
import { createPushController, PushController } from '../src/push';

// O preset do Jest simula o iOS
const PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

type Listener = (arg: unknown) => unknown;
const listeners: Record<string, Listener> = {};
const unsubscribe = jest.fn();
const deviceApi = { register: jest.fn(), unregister: jest.fn() };
let push: PushController;

beforeEach(() => {
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
  deviceApi.register.mockResolvedValue({ id: 'd1', platform: PLATFORM });
  deviceApi.unregister.mockResolvedValue(undefined);
  // Um controlador novo por teste: o estado (token, ouvintes) é por controlador
  push = createPushController(deviceApi);
});

test('sem configuração do Firebase o push fica desligado sem chamar nada', async () => {
  mockApps.length = 0;

  expect(push.isPushAvailable()).toBe(false);
  push.registerBackgroundHandler();
  await expect(push.enablePush(jest.fn())).resolves.toBe('unavailable');
  await push.disablePush();

  expect(mockMessaging.setBackgroundMessageHandler).not.toHaveBeenCalled();
  expect(mockMessaging.getToken).not.toHaveBeenCalled();
  expect(deviceApi.register).not.toHaveBeenCalled();
  expect(deviceApi.unregister).not.toHaveBeenCalled();
});

test('com o Firebase configurado, registra o handler de segundo plano', () => {
  push.registerBackgroundHandler();
  expect(mockMessaging.setBackgroundMessageHandler).toHaveBeenCalledWith(expect.any(Function));
});

test('registra o token, entrega o data das mensagens e reenvia o token renovado', async () => {
  const onData = jest.fn();

  await expect(push.enablePush(onData)).resolves.toBe('enabled');
  expect(deviceApi.register).toHaveBeenCalledWith('fcm-token-1', PLATFORM);

  // App aberto e toque na notificação: o data vai para o app filtrar
  await listeners.onMessage!({ data: { type: 'ride_offer', rideId: 'r1' } });
  listeners.onNotificationOpenedApp!({ data: { type: 'ride_status', rideId: 'r2', status: 'DRIVER_ARRIVED' } });
  await listeners.onMessage!({ notification: { title: 'sem data' } }); // ignorada
  expect(onData.mock.calls).toEqual([
    [{ type: 'ride_offer', rideId: 'r1' }],
    [{ type: 'ride_status', rideId: 'r2', status: 'DRIVER_ARRIVED' }],
  ]);

  listeners.onTokenRefresh!('fcm-token-2');
  await Promise.resolve();
  expect(deviceApi.register).toHaveBeenLastCalledWith('fcm-token-2', PLATFORM);
});

test('app aberto pela notificação com ele fechado entrega o data', async () => {
  mockMessaging.getInitialNotification.mockResolvedValue({ data: { type: 'ride_offer' } });
  const onData = jest.fn();

  await push.enablePush(onData);

  expect(onData).toHaveBeenCalledWith({ type: 'ride_offer' });
});

test('permissão provisória conta como ativada; negada ainda registra o token', async () => {
  mockMessaging.requestPermission.mockResolvedValueOnce(2);
  await expect(push.enablePush(jest.fn())).resolves.toBe('enabled');

  mockMessaging.requestPermission.mockResolvedValueOnce(0);
  await expect(push.enablePush(jest.fn())).resolves.toBe('denied');
  expect(deviceApi.register).toHaveBeenCalledTimes(2);
});

test('falha ao obter o token não quebra o login', async () => {
  mockMessaging.getToken.mockRejectedValue(new Error('SERVICE_NOT_AVAILABLE'));

  await expect(push.enablePush(jest.fn())).resolves.toBe('error');
  expect(deviceApi.register).not.toHaveBeenCalled();
});

test('ativar de novo troca os ouvintes (sem entregar a mensagem duas vezes)', async () => {
  const first = jest.fn();
  const second = jest.fn();
  await push.enablePush(first);
  await push.enablePush(second);

  expect(unsubscribe).toHaveBeenCalledTimes(3); // os 3 ouvintes da primeira ativação
  await listeners.onMessage!({ data: { type: 'x' } });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

test('logout remove o token na API e para de ouvir as mensagens', async () => {
  await push.enablePush(jest.fn());

  await push.disablePush();

  expect(deviceApi.unregister).toHaveBeenCalledWith('fcm-token-1');
  expect(mockMessaging.deleteToken).not.toHaveBeenCalled();
  expect(unsubscribe).toHaveBeenCalledTimes(3);

  // Sem token registrado, um segundo logout não chama a API
  await push.disablePush();
  expect(deviceApi.unregister).toHaveBeenCalledTimes(1);
});

test('falha ao remover o token na API não quebra o logout', async () => {
  deviceApi.unregister.mockRejectedValue(new Error('offline'));
  await push.enablePush(jest.fn());

  await expect(push.disablePush()).resolves.toBeUndefined();
});

test('sessão expirada invalida o token no Firebase (sem chamar a API)', async () => {
  await push.enablePush(jest.fn());

  await push.disablePush({ revoke: true });

  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(deviceApi.unregister).not.toHaveBeenCalled();
});

test('logout durante o registro não deixa o token ligado à conta antiga', async () => {
  let finishRegister: () => void = () => undefined;
  deviceApi.register.mockImplementation(
    () => new Promise((resolve) => { finishRegister = () => resolve({ id: 'd1', platform: PLATFORM }); }),
  );

  const pending = push.enablePush(jest.fn());
  await new Promise((r) => setImmediate(r));
  await push.disablePush();
  finishRegister();

  await expect(pending).resolves.toBe('unavailable');
  expect(mockMessaging.deleteToken).toHaveBeenCalled();
  expect(mockMessaging.onMessage).not.toHaveBeenCalled();
});

test('logout antes de obter o token não chega a registrar', async () => {
  let resolveToken: (token: string) => void = () => undefined;
  mockMessaging.getToken.mockImplementation(() => new Promise((resolve) => { resolveToken = resolve; }));

  const pending = push.enablePush(jest.fn());
  await new Promise((r) => setImmediate(r));
  await push.disablePush();
  resolveToken('fcm-token-1');

  await expect(pending).resolves.toBe('unavailable');
  expect(deviceApi.register).not.toHaveBeenCalled();
});
