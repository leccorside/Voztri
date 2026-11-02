/**
 * Localização com o Play Services (locationProvider 'playServices'): ele responde
 * "indisponível" na hora quando o provedor oscila (onLocationAvailability), em vez de
 * esperar o tempo limite. Biblioteca nativa simulada.
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
import {
  getCurrentPosition,
  LocationError,
  UNAVAILABLE_GRACE_MS,
  UNAVAILABLE_RETRY_MS,
  watchPosition,
} from '../src/location';

const geo = Geolocation as unknown as Record<
  'setRNConfiguration' | 'getCurrentPosition' | 'watchPosition' | 'clearWatch',
  jest.Mock
>;

type Ok = (raw: unknown) => void;
type Fail = (err: { code: number; message: string }) => void;

const RAW = {
  coords: { latitude: -17.757, longitude: -48.623, accuracy: 12, heading: -1, speed: null },
  timestamp: 1,
};
const DENIED = { code: 1, message: 'denied' };
const UNAVAILABLE = { code: 2, message: 'Location not available (FusedLocationProvider)' };
const TIMEOUT = { code: 3, message: 'timeout' };

/** Próximas respostas do getCurrentPosition, na ordem (RAW = sucesso). */
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
  geo.watchPosition.mockReset();
});

afterEach(() => jest.useRealTimers());

describe('getCurrentPosition', () => {
  it('provider da biblioteca é o Play Services', () => {
    expect(geo.setRNConfiguration).toHaveBeenCalledWith(expect.objectContaining({ locationProvider: 'playServices' }));
  });

  it('"indisponível" na hora: tenta o GPS de novo depois de 1,5 s', async () => {
    answers(UNAVAILABLE, RAW);
    const pending = getCurrentPosition();
    await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS - 1);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual(expect.objectContaining({ latitude: -17.757, accuracy: 12, heading: null }));
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(highAccuracyOf(1)).toBe(true);
  });

  it('"indisponível" e depois tempo esgotado: usa a localização de rede', async () => {
    answers(UNAVAILABLE, TIMEOUT, RAW);
    const pending = getCurrentPosition();
    await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);

    await expect(pending).resolves.toEqual(expect.objectContaining({ latitude: -17.757 }));
    expect(highAccuracyOf(2)).toBe(false);
  });

  it('"indisponível" duas vezes: avisa (GPS desligado de verdade)', async () => {
    answers(UNAVAILABLE, UNAVAILABLE);
    const pending = getCurrentPosition();
    const check = expect(pending).rejects.toMatchObject({ code: 'unavailable' });
    await jest.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);
    await check;
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('tempo esgotado no GPS: vai direto para a rede, sem esperar', async () => {
    answers(TIMEOUT, RAW);
    await expect(getCurrentPosition()).resolves.toEqual(expect.objectContaining({ latitude: -17.757 }));
    expect(highAccuracyOf(1)).toBe(false);
  });

  it('permissão negada: falha na hora, sem nova tentativa', async () => {
    answers(DENIED);
    await expect(getCurrentPosition()).rejects.toBeInstanceOf(LocationError);
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  });
});

describe('watchPosition', () => {
  function startWatch() {
    const onPosition = jest.fn();
    const onError = jest.fn();
    watchPosition(onPosition, onError, { distanceFilterMeters: 25, intervalMs: 5000 });
    const [ok, fail] = geo.watchPosition.mock.calls[0] as [Ok, Fail];
    return { onPosition, onError, ok, fail };
  }

  it('"indisponível" logo depois de uma posição boa é ignorado', () => {
    const { onPosition, onError, ok, fail } = startWatch();
    ok(RAW);
    jest.advanceTimersByTime(UNAVAILABLE_GRACE_MS - 1);
    fail(UNAVAILABLE);

    expect(onPosition).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('"indisponível" sem posição há 30 s (ou nenhuma ainda) chega à tela', () => {
    const { onError, ok, fail } = startWatch();
    fail(UNAVAILABLE); // antes de qualquer posição
    expect(onError).toHaveBeenCalledTimes(1);

    ok(RAW);
    jest.advanceTimersByTime(UNAVAILABLE_GRACE_MS);
    fail(UNAVAILABLE);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1][0]).toMatchObject({ code: 'unavailable' });
  });

  it('permissão negada chega à tela mesmo logo depois de uma posição', () => {
    const { onError, ok, fail } = startWatch();
    ok(RAW);
    fail(DENIED);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'denied' }));
  });
});
