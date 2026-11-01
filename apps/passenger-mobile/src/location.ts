import Geolocation, { GeolocationError, GeolocationResponse } from '@react-native-community/geolocation';
import { Permission, PermissionsAndroid, Platform } from 'react-native';

// Permissões pedidas por este módulo (não pela biblioteca), sempre "durante o uso".
// enableBackgroundLocationUpdates explícito: a biblioteca usa true quando a opção
// não é informada, e o passageiro não precisa de localização em segundo plano.
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
  enableBackgroundLocationUpdates: false,
});

export type LocationPermission = 'granted' | 'denied' | 'blocked';

export interface DevicePosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  /** Graus (0-360) ou null quando o aparelho não informa (o iOS usa -1). */
  heading: number | null;
  /** m/s ou null quando desconhecida. */
  speed: number | null;
  timestamp: number;
}

// Mesmos valores de PermissionsAndroid.PERMISSIONS.* (tipados como opcionais pelo noUncheckedIndexedAccess)
const FINE_LOCATION: Permission = 'android.permission.ACCESS_FINE_LOCATION';
const COARSE_LOCATION: Permission = 'android.permission.ACCESS_COARSE_LOCATION';

const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

function toPosition(raw: GeolocationResponse): DevicePosition {
  const { latitude, longitude, accuracy, heading, speed } = raw.coords;
  return {
    latitude,
    longitude,
    accuracy,
    heading: heading != null && heading >= 0 && heading <= 360 ? heading : null,
    speed: speed != null && speed >= 0 ? speed : null,
    timestamp: raw.timestamp,
  };
}

export class LocationError extends Error {
  constructor(
    message: string,
    public readonly code: 'denied' | 'timeout' | 'unavailable',
  ) {
    super(message);
  }
}

function toError(err: GeolocationError): LocationError {
  if (err.code === PERMISSION_DENIED) return new LocationError('Permissão de localização negada.', 'denied');
  if (err.code === TIMEOUT) return new LocationError('Não foi possível obter a localização a tempo.', 'timeout');
  return new LocationError('Localização indisponível. Verifique se o GPS está ligado.', 'unavailable');
}

/**
 * Pede a permissão de localização "durante o uso" ao sistema. O texto exibido
 * vem do sistema (Android) ou do NSLocationWhenInUseUsageDescription (iOS).
 * Motivo para o usuário: O VOZTRI usa sua localização para definir o ponto de embarque e para o SOS durante a corrida.
 */
export async function requestLocationPermission(): Promise<LocationPermission> {
  if (Platform.OS === 'android') {
    // Android 12+ ignora o pedido de FINE sozinho: os dois juntos deixam o usuário
    // escolher entre localização precisa e aproximada (ambas aceitas; a precisão aparece na tela)
    const results = await PermissionsAndroid.requestMultiple([FINE_LOCATION, COARSE_LOCATION]);
    const fine = results[FINE_LOCATION];
    const coarse = results[COARSE_LOCATION];
    if (fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    return fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      ? 'blocked'
      : 'denied';
  }

  return new Promise((resolve) => {
    Geolocation.requestAuthorization(
      () => resolve('granted'),
      (err) => resolve(err.code === PERMISSION_DENIED ? 'blocked' : 'denied'),
    );
  });
}

function currentPosition(enableHighAccuracy: boolean, timeout: number): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (raw) => resolve(toPosition(raw)),
      (err) => reject(toError(err)),
      { enableHighAccuracy, timeout, maximumAge: 10_000 },
    );
  });
}

/**
 * Posição atual. Tenta o GPS (alta precisão) e, se demorar demais (comum em
 * ambientes fechados), usa a localização de rede.
 */
export async function getCurrentPosition(): Promise<DevicePosition> {
  try {
    return await currentPosition(true, 10_000);
  } catch (err) {
    if (err instanceof LocationError && err.code === 'timeout') {
      return currentPosition(false, 10_000);
    }
    throw err;
  }
}

/**
 * Acompanha a posição enquanto o app está aberto. Devolve a função que para o
 * acompanhamento.
 */
export function watchPosition(
  onPosition: (position: DevicePosition) => void,
  onError: (error: LocationError) => void,
  options: { distanceFilterMeters: number; intervalMs: number },
): () => void {
  const id = Geolocation.watchPosition(
    (raw) => onPosition(toPosition(raw)),
    (err) => onError(toError(err)),
    {
      enableHighAccuracy: true,
      distanceFilter: options.distanceFilterMeters,
      interval: options.intervalMs,
      fastestInterval: Math.round(options.intervalMs / 2),
    },
  );
  return () => Geolocation.clearWatch(id);
}

export { distanceMeters } from './geo.js';
