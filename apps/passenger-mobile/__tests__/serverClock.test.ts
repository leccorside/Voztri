/**
 * Correção do relógio do aparelho pelo header Date das respostas da API: a medida
 * no VoztriApiClient e a mediana no serverClock.
 */
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clockOffsetFromDate, VoztriApiClient } from '@voztri/api-client';
import { serverClock } from '../src/serverClock';

beforeEach(() => serverClock.reset());

describe('clockOffsetFromDate', () => {
  const sent = Date.parse('2026-11-02T12:00:00.000Z');

  it('compara com o ponto médio da ida e volta e centraliza a resolução de 1 s', () => {
    // Servidor 2 min à frente; resposta em 200 ms
    const header = new Date(sent + 120_000 + 100).toUTCString(); // trunca os ms
    expect(clockOffsetFromDate(header, sent, sent + 200)).toBe(120_000 + 500 - 100);
  });

  it('aceita relógio do servidor atrás do aparelho (offset negativo)', () => {
    const header = new Date(sent - 90_000).toUTCString();
    expect(clockOffsetFromDate(header, sent, sent)).toBe(-90_000 + 500);
  });

  it('descarta header ausente, inválido ou ida e volta longa demais', () => {
    expect(clockOffsetFromDate(undefined, sent, sent)).toBeNull();
    expect(clockOffsetFromDate('ontem', sent, sent)).toBeNull();
    expect(clockOffsetFromDate(new Date(sent).toUTCString(), sent, sent + 5001)).toBeNull();
    expect(clockOffsetFromDate(new Date(sent).toUTCString(), sent, sent - 1)).toBeNull();
  });
});

describe('serverClock', () => {
  it('sem medidas usa o relógio do aparelho', () => {
    expect(serverClock.offsetMs()).toBe(0);
  });

  it('usa a mediana das últimas medidas (uma resposta lenta isolada não desloca)', () => {
    [120_000, 120_400, 119_800, 135_000, 120_200].forEach((o) => serverClock.record(o));
    expect(serverClock.offsetMs()).toBe(120_200);

    serverClock.record(Number.NaN); // ignorada
    expect(serverClock.offsetMs()).toBe(120_200);
  });

  it('guarda só as 7 medidas mais recentes', () => {
    for (let i = 0; i < 7; i++) serverClock.record(1000);
    for (let i = 0; i < 7; i++) serverClock.record(-2000);
    expect(serverClock.offsetMs()).toBe(-2000);
  });

  it('now() aplica o deslocamento', () => {
    serverClock.record(60_000);
    expect(Math.abs(serverClock.now() - (Date.now() + 60_000))).toBeLessThan(50);
  });
});

describe('VoztriApiClient.onClockSample', () => {
  type Adapter = (config: InternalAxiosRequestConfig) => Promise<unknown>;
  const withAdapter = (adapter: Adapter, onClockSample: jest.Mock) => {
    const client = new VoztriApiClient({ baseURL: 'http://api.test', onClockSample });
    (client as unknown as { instance: { defaults: { adapter: Adapter } } }).instance.defaults.adapter = adapter;
    return client;
  };
  const response = (config: InternalAxiosRequestConfig, status: number, headers: Record<string, string>) => ({
    data: {},
    status,
    statusText: '',
    headers,
    config,
  });

  it('mede o deslocamento a cada resposta, inclusive de erro', async () => {
    const onClockSample = jest.fn();
    const ahead = () => new Date(Date.now() + 120_000).toUTCString();

    const ok = withAdapter(async (config) => response(config, 200, { date: ahead() }), onClockSample);
    await ok.get('/rides/1');

    const failing = withAdapter(async (config) => {
      throw new AxiosError('422', 'ERR_BAD_REQUEST', config, null, response(config, 422, { date: ahead() }) as never);
    }, onClockSample);
    await expect(failing.post('/rides/request')).rejects.toBeInstanceOf(AxiosError);

    expect(onClockSample).toHaveBeenCalledTimes(2);
    for (const [offset] of onClockSample.mock.calls) {
      // 2 min à frente, com o erro de ±0,5 s da resolução do header
      expect(offset).toBeGreaterThanOrEqual(119_000);
      expect(offset).toBeLessThanOrEqual(121_000);
    }
  });

  it('sem o header Date não registra nada', async () => {
    const onClockSample = jest.fn();
    const client = withAdapter(async (config) => response(config, 200, {}), onClockSample);
    await client.get('/rides/1');
    expect(onClockSample).not.toHaveBeenCalled();
  });
});
