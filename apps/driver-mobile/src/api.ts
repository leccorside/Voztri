import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApi, BillingApi, DeviceApi, DriverApi, RideApi } from '@voztri/api-client';
import { createMobileApi, resolveMediaUrl } from '@voztri/mobile-core';
import { API_URL } from './config.js';

/**
 * API do app do motorista. A infraestrutura (sessão no AsyncStorage, cliente com o
 * token, 401 e mensagens de erro) está no @voztri/mobile-core.
 */
const core = createMobileApi({
  baseURL: API_URL,
  storage: AsyncStorage,
  tokenKey: 'voztri.driver.token',
});

export const session = core.session;

/** Token da sessão atual (repassado ao serviço nativo de rastreamento). */
export const currentToken = (): string | null => core.session.current();

/** Endereço completo de uma foto (a API devolve a foto enviada como caminho relativo). */
export const mediaUrl = (url: string | null | undefined): string | null => resolveMediaUrl(url, API_URL);

/** Chamado quando a API responde 401 (token expirado ou revogado). */
export const onUnauthorized = (handler: () => void): void => core.onUnauthorized(handler);

/** Mensagem amigável a partir do erro da API ou da rede. */
export const errorMessage = (err: unknown): string => core.errorMessage(err);

/** Código de erro da API ("INVALID_PIN", "OFFER_EXPIRED"...) e status HTTP, se houver. */
export { apiErrorCode, fieldErrors, httpStatus } from '@voztri/mobile-core';

export const authApi = new AuthApi(core.client);
export const driverApi = new DriverApi(core.client);
export const rideApi = new RideApi(core.client);
export const billingApi = new BillingApi(core.client);
export const deviceApi = new DeviceApi(core.client);
