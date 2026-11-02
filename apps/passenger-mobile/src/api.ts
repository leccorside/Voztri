import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApi, BillingApi, DeviceApi, GeoApi, PassengerApi, PlacesApi, RideApi } from '@voztri/api-client';
import { createMobileApi, resolveMediaUrl } from '@voztri/mobile-core';
import { API_URL } from './config.js';
import { serverClock } from './serverClock.js';

/**
 * API do app do passageiro. A infraestrutura (sessão no AsyncStorage, cliente com o
 * token, 401 e mensagens de erro) está no @voztri/mobile-core.
 */
const ACTIVE_RIDE_KEY = 'voztri.passenger.activeRide';

const core = createMobileApi({
  baseURL: API_URL,
  storage: AsyncStorage,
  tokenKey: 'voztri.passenger.token',
  // A corrida guardada é da conta: sai junto no logout
  clearKeys: [ACTIVE_RIDE_KEY],
  // Corrige o relógio do aparelho nos prazos do servidor (contador da busca)
  onClockSample: (offsetMs) => serverClock.record(offsetMs),
});

export const session = core.session;

/** Id da corrida em andamento, para retomar o acompanhamento ao reabrir o app. */
export const activeRideMemory = {
  load: () => AsyncStorage.getItem(ACTIVE_RIDE_KEY),
  save: (rideId: string) => AsyncStorage.setItem(ACTIVE_RIDE_KEY, rideId),
  clear: () => AsyncStorage.removeItem(ACTIVE_RIDE_KEY),
};

/** Token da sessão atual (para carregar as fotos, que a API só serve com login). */
export const currentToken = (): string | null => core.session.current();

/** Endereço completo de uma foto (a API devolve a foto enviada como caminho relativo). */
export const mediaUrl = (url: string | null | undefined): string | null => resolveMediaUrl(url, API_URL);

/** Chamado quando a API responde 401 (token expirado ou revogado). */
export const onUnauthorized = (handler: () => void): void => core.onUnauthorized(handler);

/** Mensagem amigável a partir do erro da API ou da rede. */
export const errorMessage = (err: unknown): string => core.errorMessage(err);

/** Código de erro ("INVALID_EMERGENCY_PIN", "RIDE_ALREADY_ACTIVE"...) e corpo da resposta de erro. */
export { apiErrorCode, errorBody, fieldErrors } from '@voztri/mobile-core';

export const authApi = new AuthApi(core.client);
export const rideApi = new RideApi(core.client);
export const billingApi = new BillingApi(core.client);
export const deviceApi = new DeviceApi(core.client);
export const geoApi = new GeoApi(core.client);
export const placesApi = new PlacesApi(core.client);
export const passengerApi = new PassengerApi(core.client);
