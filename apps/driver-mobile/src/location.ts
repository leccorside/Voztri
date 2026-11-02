import Geolocation, { GeolocationError, GeolocationResponse } from '@react-native-community/geolocation';
import { Permission, PermissionsAndroid, Platform } from 'react-native';

// Permissões pedidas por este módulo (não pela biblioteca). Atenção: a biblioteca
// usa enableBackgroundLocationUpdates = true quando a opção não é informada; aqui
// ela fica desligada e só é ligada no turno online (setBackgroundUpdates).
const BASE_CONFIG = {
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse' as const,
  // 'playServices' (FusedLocationProvider: Wi-Fi, antenas e GPS juntos). Com 'auto', a
  // biblioteca (3.4.0) nunca troca de gerenciador e fica no LocationManager cru, que em
  // aparelho real, dentro de casa, não entrega posição a tempo. Sem Play Services no
  // aparelho, a biblioteca continua no LocationManager.
  locationProvider: 'playServices' as const,
};
let backgroundUpdates = false;
Geolocation.setRNConfiguration({ ...BASE_CONFIG, enableBackgroundLocationUpdates: false });

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
const BACKGROUND_LOCATION: Permission = 'android.permission.ACCESS_BACKGROUND_LOCATION';
const POST_NOTIFICATIONS: Permission = 'android.permission.POST_NOTIFICATIONS';

/** Versão da API do Android (0 no iOS). */
const androidApi = (): number => (Platform.OS === 'android' ? Number(Platform.Version) : 0);

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
 * Motivo para o usuário: O VOZTRI Driver usa sua localização enquanto você está online para receber corridas próximas.
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

/**
 * iOS: liga/desliga o allowsBackgroundLocationUpdates do CLLocationManager
 * (exige UIBackgroundModes: location no Info.plist, já declarado). Vale para os
 * acompanhamentos iniciados depois da chamada. No Android não faz nada: lá o
 * envio em segundo plano é feito pelo LocationTrackingService.
 */
export function setBackgroundUpdates(enabled: boolean): void {
  if (Platform.OS !== 'ios' || backgroundUpdates === enabled) return;
  backgroundUpdates = enabled;
  Geolocation.setRNConfiguration({ ...BASE_CONFIG, enableBackgroundLocationUpdates: enabled });
}

/** A permissão de localização em segundo plano já foi concedida? */
export async function hasBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    // Antes do Android 10 a permissão comum já vale para o segundo plano
    return androidApi() < 29 || PermissionsAndroid.check(BACKGROUND_LOCATION);
  }
  return false; // no iOS o status "sempre" só é conhecido ao pedir
}

/**
 * Pede a localização em segundo plano, separada da "durante o uso" (exigência do
 * Android 11+ e recomendação da Apple). Android: ACCESS_BACKGROUND_LOCATION (o
 * sistema leva o usuário à opção "Permitir o tempo todo"). iOS: autorização
 * "sempre" — se o usuário mantiver "durante o uso", o iOS não responde, por isso
 * há um tempo limite.
 */
export async function requestBackgroundLocationPermission(): Promise<LocationPermission> {
  if (Platform.OS === 'android') {
    if (androidApi() < 29) return 'granted';
    const result = await PermissionsAndroid.request(BACKGROUND_LOCATION);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = (value: LocationPermission) => {
      if (done) return;
      done = true;
      // Volta ao nível "durante o uso" para os próximos pedidos
      Geolocation.setRNConfiguration({ ...BASE_CONFIG, enableBackgroundLocationUpdates: backgroundUpdates });
      resolve(value);
    };
    Geolocation.setRNConfiguration({ ...BASE_CONFIG, authorizationLevel: 'always', enableBackgroundLocationUpdates: true });
    Geolocation.requestAuthorization(
      () => finish('granted'),
      (err) => finish(err.code === PERMISSION_DENIED ? 'blocked' : 'denied'),
    );
    setTimeout(() => finish('denied'), 20_000);
  });
}

/** Android 13+: a notificação do serviço de rastreamento depende desta permissão. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (androidApi() < 33) return true;
  const result = await PermissionsAndroid.request(POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
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

/** Espera antes de repetir o pedido quando o Play Services responde "indisponível". */
export const UNAVAILABLE_RETRY_MS = 1500;

/**
 * No acompanhamento, um "indisponível" logo depois de uma posição boa é oscilação do
 * Play Services (onLocationAvailability), não perda do GPS: só avisa sem posição há isso.
 */
export const UNAVAILABLE_GRACE_MS = 30_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Posição atual. Tenta o GPS (alta precisão); se o Play Services responder
 * "indisponível" na hora (ele não espera o tempo limite), tenta de novo depois de
 * 1,5 s; se demorar demais (comum em ambientes fechados), usa a localização de rede.
 */
export async function getCurrentPosition(): Promise<DevicePosition> {
  try {
    return await currentPosition(true, 10_000);
  } catch (err) {
    if (!(err instanceof LocationError) || err.code === 'denied') throw err;
    if (err.code === 'unavailable') {
      await wait(UNAVAILABLE_RETRY_MS);
      try {
        return await currentPosition(true, 10_000);
      } catch (retryErr) {
        if (!(retryErr instanceof LocationError) || retryErr.code !== 'timeout') throw retryErr;
      }
    }
    return currentPosition(false, 10_000);
  }
}

/**
 * Acompanha a posição enquanto o app está aberto. Devolve a função que para o
 * acompanhamento. Um "indisponível" a menos de 30 s da última posição é ignorado
 * (oscilação do Play Services; com o motorista parado, nenhuma posição nova viria
 * apagar o aviso).
 */
export function watchPosition(
  onPosition: (position: DevicePosition) => void,
  onError: (error: LocationError) => void,
  options: { distanceFilterMeters: number; intervalMs: number },
): () => void {
  let lastPositionAt = 0;
  const id = Geolocation.watchPosition(
    (raw) => {
      lastPositionAt = Date.now();
      onPosition(toPosition(raw));
    },
    (err) => {
      const error = toError(err);
      if (error.code === 'unavailable' && Date.now() - lastPositionAt < UNAVAILABLE_GRACE_MS) return;
      onError(error);
    },
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
