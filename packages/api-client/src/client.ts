import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  getToken?: () => Promise<string | null> | string | null;
  onUnauthorized?: () => void;
  /**
   * Recebe, a cada resposta da API (inclusive de erro), quanto o relógio do servidor
   * está à frente (+) ou atrás (-) do relógio do aparelho, em ms, medido pelo header
   * Date. Serve para exibir prazos calculados pelo servidor (ex.: contador da busca)
   * sem depender do relógio do aparelho estar certo.
   */
  onClockSample?: (offsetMs: number) => void;
}

/** Ida e volta acima disso deixam a medida do relógio imprecisa demais: descartada. */
const MAX_CLOCK_SAMPLE_RTT_MS = 5000;

/**
 * Deslocamento do relógio do servidor em relação ao do aparelho, pelo header Date.
 * O servidor carimba o horário entre o envio e o recebimento, então a comparação é
 * com o ponto médio da ida e volta. O header tem resolução de 1 s (trunca os ms):
 * +500 ms centraliza o erro, que fica em ±0,5 s mais metade da ida e volta.
 */
export function clockOffsetFromDate(dateHeader: unknown, sentAt: number, receivedAt: number): number | null {
  if (typeof dateHeader !== 'string') return null;
  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) return null;
  if (receivedAt < sentAt || receivedAt - sentAt > MAX_CLOCK_SAMPLE_RTT_MS) return null;
  return serverMs + 500 - (sentAt + receivedAt) / 2;
}

export class VoztriApiClient {
  private instance: AxiosInstance;
  private getToken?: () => Promise<string | null> | string | null;
  /** Momento do envio de cada requisição (para a medida do relógio). */
  private sentAt = new WeakMap<object, number>();

  constructor(config: ApiClientConfig) {
    this.getToken = config.getToken;
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.instance.interceptors.request.use(async (reqConfig) => {
      if (this.getToken) {
        const token = await this.getToken();
        if (token) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      // Depois de obter o token: o mais perto possível do envio
      if (config.onClockSample) this.sentAt.set(reqConfig, Date.now());
      return reqConfig;
    });

    const sampleClock = (response: AxiosResponse | undefined) => {
      if (!config.onClockSample || !response) return;
      const sentAt = this.sentAt.get(response.config);
      if (sentAt === undefined) return;
      this.sentAt.delete(response.config);
      const headers = response.headers as Record<string, unknown> | undefined;
      const offset = clockOffsetFromDate(headers?.['date'] ?? headers?.['Date'], sentAt, Date.now());
      if (offset !== null) config.onClockSample(offset);
    };

    this.instance.interceptors.response.use(
      (response) => {
        sampleClock(response);
        return response;
      },
      (error) => {
        sampleClock(error.response);
        if (error.response?.status === 401 && config.onUnauthorized) {
          config.onUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  public get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  public post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  public put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }
}
