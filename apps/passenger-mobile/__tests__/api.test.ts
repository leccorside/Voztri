/**
 * Infraestrutura de API do passageiro (src/api.ts sobre o @voztri/mobile-core), sem
 * mock do módulo: AsyncStorage pelo mock oficial e respostas por um adapter falso
 * do axios.
 */
// O índice do @voztri/mobile-core também exporta o push: o RNFB (ESM, não transformado
// pelo Jest) fica simulado aqui, como nos testes de push; estes testes não usam push.
jest.mock('@react-native-firebase/app', () => ({ __esModule: true, default: { apps: [] } }));
jest.mock('@react-native-firebase/messaging', () => ({ __esModule: true, default: () => ({}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { activeRideMemory, apiErrorCode, errorBody, errorMessage, rideApi, session } from '../src/api';
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

it('erros: código, corpo da resposta (corrida já ativa) e mensagem com o endereço da API', () => {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const body = { message: 'Você já tem uma corrida em andamento.', error: 'RIDE_ALREADY_ACTIVE', ride: { id: 'ride-9' } };
  const conflict = new AxiosError('409', 'ERR_BAD_REQUEST', config, null, {
    data: body,
    status: 409,
    statusText: '',
    headers: {},
    config,
  } as never);

  expect(apiErrorCode(conflict)).toBe('RIDE_ALREADY_ACTIVE');
  expect(errorBody<typeof body>(conflict)?.ride.id).toBe('ride-9');
  expect(errorMessage(conflict)).toBe('Você já tem uma corrida em andamento.');
  expect(errorMessage(new AxiosError('Network Error', 'ERR_NETWORK', config))).toContain(`(${API_URL})`);
});
