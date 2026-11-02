/**
 * Infraestrutura de API do motorista (src/api.ts sobre o @voztri/mobile-core), sem
 * mock do módulo: AsyncStorage pelo mock oficial e respostas por um adapter falso
 * do axios.
 */
// O índice do @voztri/mobile-core também exporta o push: o RNFB (ESM, não transformado
// pelo Jest) fica simulado aqui, como nos testes de push; estes testes não usam push.
jest.mock('@react-native-firebase/app', () => ({ __esModule: true, default: { apps: [] } }));
jest.mock('@react-native-firebase/messaging', () => ({ __esModule: true, default: () => ({}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiErrorCode, currentToken, driverApi, errorMessage, httpStatus, onUnauthorized, session } from '../src/api';
import { API_URL } from '../src/config';

type Adapter = (config: InternalAxiosRequestConfig) => Promise<unknown>;
const http = (driverApi as unknown as { client: { instance: { defaults: { adapter: Adapter } } } }).client.instance;

const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown = {}) => ({
  data,
  status,
  statusText: '',
  headers: {},
  config,
});
const fail = (config: InternalAxiosRequestConfig, status: number, data: unknown) =>
  new AxiosError(String(status), 'ERR_BAD_RESPONSE', config, null, reply(config, status, data) as never);

beforeEach(async () => {
  await AsyncStorage.clear();
  await session.clear();
});

describe('sessão', () => {
  it('guarda o token no AsyncStorage e na memória, e limpa no logout', async () => {
    await session.save('tok-1');
    expect(await AsyncStorage.getItem('voztri.driver.token')).toBe('tok-1');
    expect(currentToken()).toBe('tok-1');

    await session.clear();
    expect(await AsyncStorage.getItem('voztri.driver.token')).toBeNull();
    expect(currentToken()).toBeNull();
  });

  it('retoma o token salvo ao abrir o app', async () => {
    await AsyncStorage.setItem('voztri.driver.token', 'tok-salvo');
    expect(await session.load()).toBe('tok-salvo');
    expect(currentToken()).toBe('tok-salvo');
  });
});

describe('cliente', () => {
  it('envia o token da sessão e chama o handler de 401', async () => {
    const seen: Array<string | undefined> = [];
    http.defaults.adapter = async (config) => {
      seen.push(config.headers.Authorization as string | undefined);
      if (seen.length === 2) throw fail(config, 401, { message: 'Unauthenticated.' });
      return reply(config, 200, { isOnline: true, offer: null, ride: null });
    };
    const unauthorized = jest.fn();
    onUnauthorized(unauthorized);

    await session.save('tok-1');
    await driverApi.getCurrent();
    await expect(driverApi.getCurrent()).rejects.toBeInstanceOf(AxiosError);

    expect(seen).toEqual(['Bearer tok-1', 'Bearer tok-1']);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});

describe('erros', () => {
  const config = { headers: {} } as InternalAxiosRequestConfig;

  it('traduz falta de conexão, limite de tentativas, mensagem da API e erro genérico', () => {
    expect(errorMessage(new AxiosError('Network Error', 'ERR_NETWORK', config))).toBe(
      `Sem conexão com a API (${API_URL}). Verifique se o backend está no ar.`,
    );
    expect(errorMessage(fail(config, 429, {}))).toBe('Muitas tentativas seguidas. Aguarde um minuto e tente de novo.');
    expect(errorMessage(fail(config, 409, { message: 'A oferta expirou.', error: 'OFFER_EXPIRED' }))).toBe('A oferta expirou.');
    expect(errorMessage(fail(config, 500, {}))).toBe('Erro 500 ao chamar a API.');
    expect(errorMessage(new Error('falhou'))).toBe('falhou');
    expect(errorMessage('???')).toBe('Erro inesperado.');
  });

  it('extrai o código de erro e o status HTTP', () => {
    const err = fail(config, 409, { message: 'A oferta expirou.', error: 'OFFER_EXPIRED' });
    expect(apiErrorCode(err)).toBe('OFFER_EXPIRED');
    expect(httpStatus(err)).toBe(409);
    expect(apiErrorCode(new Error('x'))).toBeNull();
    expect(httpStatus(new AxiosError('Network Error', 'ERR_NETWORK', config))).toBeNull();
  });
});
