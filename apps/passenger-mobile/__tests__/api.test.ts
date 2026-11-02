/**
 * Ligação do src/api.ts do passageiro ao @voztri/mobile-core: chaves do
 * AsyncStorage (a corrida guardada sai no logout), correção do relógio e endereço
 * da API nas mensagens. Sessão, cliente e erros em si são testados no pacote.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { activeRideMemory, errorMessage, rideApi, session } from '../src/api';
import { API_URL } from '../src/config';
import { serverClock } from '../src/serverClock';

type Adapter = (config: InternalAxiosRequestConfig) => Promise<unknown>;
const http = (rideApi as unknown as { client: { instance: { defaults: { adapter: Adapter } } } }).client.instance;

beforeEach(async () => {
  await AsyncStorage.clear();
  await session.clear();
  serverClock.reset();
});

it('logout apaga o token e a corrida guardada (chaves do passageiro)', async () => {
  await session.save('tok-1');
  await activeRideMemory.save('ride-1');
  expect(await AsyncStorage.getItem('voztri.passenger.token')).toBe('tok-1');
  expect(await activeRideMemory.load()).toBe('ride-1');

  await session.clear();
  expect(await AsyncStorage.getItem('voztri.passenger.token')).toBeNull();
  expect(await activeRideMemory.load()).toBeNull();
});

it('as respostas da API alimentam a correção do relógio (header Date)', async () => {
  http.defaults.adapter = async (config) => ({
    data: { id: 'ride-1' },
    status: 200,
    statusText: '',
    headers: { date: new Date(Date.now() + 90_000).toUTCString() },
    config,
  });

  await rideApi.getRide('ride-1');

  expect(serverClock.offsetMs()).toBeGreaterThanOrEqual(89_000);
  expect(serverClock.offsetMs()).toBeLessThanOrEqual(91_000);
});

it('as mensagens de erro citam o endereço da API do app', () => {
  const offline = new AxiosError('Network Error', 'ERR_NETWORK', { headers: {} } as InternalAxiosRequestConfig);
  expect(errorMessage(offline)).toContain(`(${API_URL})`);
});
