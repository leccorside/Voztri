/**
 * Ligação do src/api.ts do motorista ao @voztri/mobile-core: chave do token no
 * AsyncStorage, token exposto ao serviço nativo e endereço da API nas mensagens.
 * Sessão, cliente e erros em si são testados no pacote.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { currentToken, errorMessage, session } from '../src/api';
import { API_URL } from '../src/config';

beforeEach(async () => {
  await AsyncStorage.clear();
  await session.clear();
});

it('guarda o token na chave do motorista e o expõe ao serviço nativo', async () => {
  await session.save('tok-1');
  expect(await AsyncStorage.getItem('voztri.driver.token')).toBe('tok-1');
  expect(currentToken()).toBe('tok-1');

  await session.clear();
  expect(await AsyncStorage.getItem('voztri.driver.token')).toBeNull();
  expect(currentToken()).toBeNull();
});

it('retoma a sessão salva pela chave do motorista', async () => {
  await AsyncStorage.setItem('voztri.driver.token', 'tok-salvo');
  expect(await session.load()).toBe('tok-salvo');
});

it('as mensagens de erro citam o endereço da API do app', () => {
  const offline = new AxiosError('Network Error', 'ERR_NETWORK', { headers: {} } as InternalAxiosRequestConfig);
  expect(errorMessage(offline)).toContain(`(${API_URL})`);
});
