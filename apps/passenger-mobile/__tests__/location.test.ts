/**
 * Localização do embarque com o Play Services (locationProvider 'playServices'): ele
 * responde "indisponível" na hora quando o provedor oscila, em vez de esperar o tempo
 * limite. Biblioteca nativa simulada.
 */
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    setRNConfiguration: jest.fn(),
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn(),
    requestAuthorization: jest.fn(),
  },
}));

import Geolocation from '@react-native-community/geolocation';
import { getCurrentPosition, LocationError, UNAVAILABLE_RETRY_MS } from '../src/location';

const geo = Geolocation as unknown as Record<'setRNConfiguration' | 'getCurrentPosition', jest.Mock>;

type Ok = (raw: unknown) => void;
type Fail = (err: { code: number; message: string }) => void;

const RAW = {
  coords: { latitude: -17.7607, longitude: -48.6262, accuracy: 22, heading: null, speed: null },
  timestamp: 1,
};
const DENIED = { code: 1, message: 'denied' };
const UNAVAILABLE = { code: 2, message: 'Location not available (FusedLocationProvider/lastLocation)' };
const TIMEOUT = { code: 3, message: 'timeout' };

function answers(...list: Array<typeof RAW | { code: number; message: string }>) {
  for (const answer of list) {
    geo.getCurrentPosition.mockImplementationOnce((ok: Ok, fail: Fail) =>
      'coords' in answer ? ok(answer) : fail(answer),
    );
  }
}

const highAccuracyOf = (call: number) => geo.getCurrentPosition.mock.calls[call][2].enableHighAccuracy;

beforeEach(() => {
  jest.useFakeTimers();
  geo.getCurrentPosition.mockReset();
});

afterEach(() => jest.useRealTimers());

it('provider da biblioteca é o Play Services (com "auto" ela fica no LocationManager)', () => {
  expect(geo.setRNConfiguration).toHaveBeenCalledWith(expect.objectContaining({ locationProvider: 'playServices' }));
});

it('"indisponível" na hora: tenta o GPS de novo depois de 1,5 s', async () => {
  answers(UNAVAILABLE, RAW);
  const pending = getCurrentPosition();
  await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);

  await expect(pending).resolves.toEqual(expect.objectContaining({ latitude: -17.7607, accuracy: 22 }));
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
  expect(highAccuracyOf(1)).toBe(true);
});

it('"indisponível" e depois tempo esgotado: usa a localização de rede', async () => {
  answers(UNAVAILABLE, TIMEOUT, RAW);
  const pending = getCurrentPosition();
  await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);

  await expect(pending).resolves.toEqual(expect.objectContaining({ latitude: -17.7607 }));
  expect(highAccuracyOf(2)).toBe(false);
});

it('"indisponível" duas vezes: avisa', async () => {
  answers(UNAVAILABLE, UNAVAILABLE);
  const pending = getCurrentPosition();
  const check = expect(pending).rejects.toMatchObject({ code: 'unavailable' });
  await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);
  await check;
});

it('tempo esgotado no GPS: vai direto para a rede', async () => {
  answers(TIMEOUT, RAW);
  await expect(getCurrentPosition()).resolves.toEqual(expect.objectContaining({ latitude: -17.7607 }));
  expect(highAccuracyOf(1)).toBe(false);
});

it('permissão negada: falha na hora, sem nova tentativa', async () => {
  answers(DENIED);
  await expect(getCurrentPosition()).rejects.toBeInstanceOf(LocationError);
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
});
