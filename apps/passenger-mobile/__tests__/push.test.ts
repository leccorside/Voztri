/**
 * Adaptador de push do passageiro (src/push.ts): só o filtro das mensagens. O
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

it('entrega ao store o id da corrida só nas mensagens de andamento com rideId', async () => {
  const onRideUpdate = jest.fn();
  await expect(enablePush(onRideUpdate)).resolves.toBe('enabled');

  deliver({ type: 'ride_status', rideId: 'ride-1', status: 'DRIVER_ARRIVED' });
  deliver({ type: 'ride_status', rideId: 'ride-2', status: 'NO_DRIVER_AVAILABLE' });
  deliver({ type: 'ride_status' }); // sem rideId
  deliver({ type: 'ride_status', rideId: 42 }); // rideId que não é texto
  deliver({ type: 'ride_offer', rideId: 'r9' }); // do motorista

  expect(onRideUpdate.mock.calls).toEqual([['ride-1'], ['ride-2']]);
});
