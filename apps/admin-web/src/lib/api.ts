import { AdminApi, AuthApi, VoztriApiClient } from '@voztri/api-client';
import { isAxiosError } from 'axios';

const TOKEN_KEY = 'voztri.admin.token';

/** Disparado quando a API responde 401 (token expirado ou revogado). */
export const UNAUTHORIZED_EVENT = 'voztri:unauthorized';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

const client = new VoztriApiClient({
  // Padrão: mesma origem, via proxy do Vite → http://localhost:8080
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  getToken: tokenStorage.get,
  onUnauthorized: () => {
    tokenStorage.clear();
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  },
});

export const authApi = new AuthApi(client);
export const adminApi = new AdminApi(client);

/** Extrai a mensagem de erro amigável devolvida pelo Laravel. */
export function errorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return 'Não foi possível conectar à API. Verifique se o backend está no ar em localhost:8080.';
    }
    if (err.response.status === 429) {
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
    }
    const data = err.response.data as { message?: string } | undefined;
    return data?.message || `Erro ${err.response.status} ao chamar a API.`;
  }
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
