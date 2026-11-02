import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthApi, BillingApi, DeviceApi, RideApi, VoztriApiClient } from '@voztri/api-client';
import { isAxiosError } from 'axios';
import { API_URL } from './config.js';

const TOKEN_KEY = 'voztri.passenger.token';
const ACTIVE_RIDE_KEY = 'voztri.passenger.activeRide';

// Cache em memória: o interceptor do cliente lê o token a cada requisição
let token: string | null = null;
let unauthorizedHandler: () => void = () => undefined;

export const session = {
  async load(): Promise<string | null> {
    token = await AsyncStorage.getItem(TOKEN_KEY);
    return token;
  },
  async save(value: string): Promise<void> {
    token = value;
    await AsyncStorage.setItem(TOKEN_KEY, value);
  },
  async clear(): Promise<void> {
    token = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, ACTIVE_RIDE_KEY]);
  },
};

/** Id da corrida em andamento, para retomar o acompanhamento ao reabrir o app. */
export const activeRideMemory = {
  load: () => AsyncStorage.getItem(ACTIVE_RIDE_KEY),
  save: (rideId: string) => AsyncStorage.setItem(ACTIVE_RIDE_KEY, rideId),
  clear: () => AsyncStorage.removeItem(ACTIVE_RIDE_KEY),
};

/** Chamado quando a API responde 401 (token expirado ou revogado). */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

const client = new VoztriApiClient({
  baseURL: API_URL,
  getToken: () => token,
  onUnauthorized: () => unauthorizedHandler(),
});

export const authApi = new AuthApi(client);
export const rideApi = new RideApi(client);
export const billingApi = new BillingApi(client);
export const deviceApi = new DeviceApi(client);

/** Código de erro da API ("INVALID_EMERGENCY_PIN", "RIDE_ALREADY_ACTIVE"...), se houver. */
export function apiErrorCode(err: unknown): string | null {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? null;
  }
  return null;
}

/** Corpo da resposta de erro (ex.: a corrida já ativa devolvida no 409). */
export function errorBody<T>(err: unknown): T | null {
  return isAxiosError(err) ? ((err.response?.data as T | undefined) ?? null) : null;
}

/** Mensagem amigável a partir do erro da API ou da rede. */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return `Sem conexão com a API (${API_URL}). Verifique se o backend está no ar.`;
    }
    if (err.response.status === 429) {
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
    }
    const data = err.response.data as { message?: string } | undefined;
    return data?.message ?? `Erro ${err.response.status} ao chamar a API.`;
  }
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
