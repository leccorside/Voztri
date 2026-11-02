import { VoztriApiClient } from '@voztri/api-client';
import { errorMessageFor } from './errors.js';
import { createSession, KeyValueStorage, Session } from './session.js';

export interface MobileApiOptions {
  /** Endereço da API (ex.: http://10.0.2.2:8080/api/v1). */
  baseURL: string;
  /** AsyncStorage do app (injetado). */
  storage: KeyValueStorage;
  tokenKey: string;
  /** Outras chaves apagadas no logout. */
  clearKeys?: readonly string[];
  /** Deslocamento do relógio do servidor, medido em cada resposta (VoztriApiClient). */
  onClockSample?: (offsetMs: number) => void;
}

export interface MobileApi {
  /** Cliente HTTP autenticado com o token da sessão (para montar AuthApi, RideApi...). */
  client: VoztriApiClient;
  session: Session;
  /** Define o que fazer quando a API responde 401 (token expirado ou revogado). */
  onUnauthorized(handler: () => void): void;
  /** Mensagem amigável do erro, com o endereço desta API na falta de conexão. */
  errorMessage(err: unknown): string;
}

/**
 * Infraestrutura de API comum aos apps: sessão (token em memória + AsyncStorage),
 * cliente que envia o token em cada requisição e um handler de 401 substituível
 * (o store o registra no bootstrap).
 */
export function createMobileApi({ baseURL, storage, tokenKey, clearKeys, onClockSample }: MobileApiOptions): MobileApi {
  const session = createSession({ storage, tokenKey, clearKeys });
  let unauthorizedHandler: () => void = () => undefined;

  const client = new VoztriApiClient({
    baseURL,
    getToken: () => session.current(),
    onUnauthorized: () => unauthorizedHandler(),
    ...(onClockSample ? { onClockSample } : {}),
  });

  return {
    client,
    session,
    onUnauthorized(handler) {
      unauthorizedHandler = handler;
    },
    errorMessage: (err) => errorMessageFor(err, baseURL),
  };
}
