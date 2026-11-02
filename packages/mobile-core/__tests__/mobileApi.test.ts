/**
 * createMobileApi: sessão + cliente autenticado, handler de 401 substituível,
 * medida do relógio e mensagens de erro com o endereço da API.
 */
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createMobileApi, KeyValueStorage, MobileApi } from '../src';

type Adapter = (config: InternalAxiosRequestConfig) => Promise<unknown>;
const API = 'http://api.test/api/v1';

const memoryStorage = (): KeyValueStorage => {
  const data = new Map<string, string>();
  return {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    multiRemove: async (keys) => keys.forEach((k) => data.delete(k)),
  };
};

const reply = (config: InternalAxiosRequestConfig, status: number, headers: Record<string, string> = {}) => ({
  data: {},
  status,
  statusText: '',
  headers,
  config,
});

function withAdapter(api: MobileApi, adapter: Adapter): void {
  (api.client as unknown as { instance: { defaults: { adapter: Adapter } } }).instance.defaults.adapter = adapter;
}

it('envia o token da sessão em cada requisição (e nenhum sem sessão)', async () => {
  const api = createMobileApi({ baseURL: API, storage: memoryStorage(), tokenKey: 'app.token' });
  const seen: Array<unknown> = [];
  withAdapter(api, async (config) => {
    seen.push(config.headers.Authorization);
    return reply(config, 200);
  });

  await api.client.get('/auth/me');
  await api.session.save('tok-1');
  await api.client.get('/auth/me');
  await api.session.clear();
  await api.client.get('/auth/me');

  expect(seen).toEqual([undefined, 'Bearer tok-1', undefined]);
});

it('401 chama o handler registrado por último (o store o registra no bootstrap)', async () => {
  const api = createMobileApi({ baseURL: API, storage: memoryStorage(), tokenKey: 'app.token' });
  withAdapter(api, async (config) => {
    throw new AxiosError('401', 'ERR_BAD_REQUEST', config, null, reply(config, 401) as never);
  });

  // Sem handler: só rejeita
  await expect(api.client.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

  const first = jest.fn();
  const second = jest.fn();
  api.onUnauthorized(first);
  api.onUnauthorized(second);
  await expect(api.client.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('repassa a medida do relógio quando o app pede (onClockSample)', async () => {
  const onClockSample = jest.fn();
  const api = createMobileApi({ baseURL: API, storage: memoryStorage(), tokenKey: 'app.token', onClockSample });
  withAdapter(api, async (config) => reply(config, 200, { date: new Date(Date.now() + 60_000).toUTCString() }));

  await api.client.get('/rides/1');

  expect(onClockSample).toHaveBeenCalledTimes(1);
  expect(onClockSample.mock.calls[0]![0]).toBeGreaterThanOrEqual(59_000);
  expect(onClockSample.mock.calls[0]![0]).toBeLessThanOrEqual(61_000);
});

it('errorMessage usa o endereço desta API na falta de conexão', () => {
  const api = createMobileApi({ baseURL: API, storage: memoryStorage(), tokenKey: 'app.token' });
  const offline = new AxiosError('Network Error', 'ERR_NETWORK', { headers: {} } as InternalAxiosRequestConfig);
  expect(api.errorMessage(offline)).toBe(`Sem conexão com a API (${API}). Verifique se o backend está no ar.`);
});
