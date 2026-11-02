/**
 * Adaptador de push do motorista (src/push.ts): só o filtro das mensagens. O
 * controlador (Firebase, token, logout) é testado no @voztri/mobile-core.
 */
// O controlador é criado dentro da fábrica: o jest.mock e os imports sobem para o topo
// do arquivo, e o adaptador chama createPushController já na importação.
jest.mock('@voztri/mobile-core', () => ({
  ...jest.requireActual('@voztri/mobile-core'),
  createPushController: jest.fn(() => ({
    isPushAvailable: jest.fn(),
    registerBackgroundHandler: jest.fn(),
    enablePush: jest.fn(),
    disablePush: jest.fn(),
  })),
}));
jest.mock('../src/api', () => ({ deviceApi: { register: jest.fn(), unregister: jest.fn() } }));

import { createPushController } from '@voztri/mobile-core';
import { deviceApi } from '../src/api';
import { disablePush, enablePush, isPushAvailable, registerBackgroundHandler } from '../src/push';

const mockController = (createPushController as jest.Mock).mock.results[0]!.value as Record<
  'isPushAvailable' | 'registerBackgroundHandler' | 'enablePush' | 'disablePush',
  jest.Mock
>;

/** O onData que o adaptador passou ao controlador. */
let deliver: (data: Record<string, unknown>) => void;

beforeEach(() => {
  mockController.enablePush.mockReset().mockImplementation(async (onData) => {
    deliver = onData;
    return 'enabled';
  });
});

it('usa um controlador com o deviceApi do app e repassa as demais funções', () => {
  expect(createPushController).toHaveBeenCalledWith(deviceApi);
  expect(isPushAvailable).toBe(mockController.isPushAvailable);
  expect(registerBackgroundHandler).toBe(mockController.registerBackgroundHandler);
  expect(disablePush).toBe(mockController.disablePush);
});

it('avisa o store só nas mensagens de nova oferta', async () => {
  const onOffer = jest.fn();
  await expect(enablePush(onOffer)).resolves.toBe('enabled');

  deliver({ type: 'ride_offer', rideId: 'r1', expiresAt: '2026-11-02T12:00:15Z' });
  deliver({ type: 'ride_status', rideId: 'r1', status: 'DRIVER_EN_ROUTE' }); // do passageiro
  deliver({});

  expect(onOffer).toHaveBeenCalledTimes(1);
});
