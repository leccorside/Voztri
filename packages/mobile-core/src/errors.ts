import { isAxiosError } from 'axios';

/** Código de erro da API ("INVALID_PIN", "RIDE_ALREADY_ACTIVE"...), se houver. */
export function apiErrorCode(err: unknown): string | null {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? null;
  }
  return null;
}

/** Status HTTP da resposta de erro, se houve resposta. */
export function httpStatus(err: unknown): number | null {
  return isAxiosError(err) ? err.response?.status ?? null : null;
}

/** Corpo da resposta de erro (ex.: a corrida já ativa devolvida no 409). */
export function errorBody<T>(err: unknown): T | null {
  return isAxiosError(err) ? ((err.response?.data as T | undefined) ?? null) : null;
}

/**
 * Mensagem amigável a partir do erro da API ou da rede. `apiUrl` entra na
 * mensagem de falta de conexão (ajuda a ver para onde o app está apontando).
 */
export function errorMessageFor(err: unknown, apiUrl: string): string {
  if (isAxiosError(err)) {
    if (!err.response) {
      return `Sem conexão com a API (${apiUrl}). Verifique se o backend está no ar.`;
    }
    if (err.response.status === 429) {
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
    }
    const data = err.response.data as { message?: string } | undefined;
    return data?.message ?? `Erro ${err.response.status} ao chamar a API.`;
  }
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
