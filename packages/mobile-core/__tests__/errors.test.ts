/**
 * Funções de erro da API: código, status, corpo e mensagem amigável.
 */
import { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiErrorCode, errorBody, errorMessageFor, httpStatus } from '../src/errors';

const API = 'http://api.test/api/v1';
const config = { headers: {} } as InternalAxiosRequestConfig;
const fail = (status: number, data: unknown) =>
  new AxiosError(String(status), 'ERR_BAD_RESPONSE', config, null, {
    data,
    status,
    statusText: '',
    headers: {},
    config,
  } as never);
const offline = () => new AxiosError('Network Error', 'ERR_NETWORK', config);

describe('errorMessageFor', () => {
  it('sem resposta: falta de conexão com o endereço da API', () => {
    expect(errorMessageFor(offline(), API)).toBe(`Sem conexão com a API (${API}). Verifique se o backend está no ar.`);
  });

  it('429: limite de tentativas', () => {
    expect(errorMessageFor(fail(429, { message: 'Too Many Attempts.' }), API)).toBe(
      'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
    );
  });

  it('mensagem da API, ou o status quando ela não manda mensagem', () => {
    expect(errorMessageFor(fail(409, { message: 'A oferta expirou.', error: 'OFFER_EXPIRED' }), API)).toBe('A oferta expirou.');
    expect(errorMessageFor(fail(500, {}), API)).toBe('Erro 500 ao chamar a API.');
    expect(errorMessageFor(fail(502, '<html>Bad Gateway</html>'), API)).toBe('Erro 502 ao chamar a API.');
  });

  it('erros que não são da API', () => {
    expect(errorMessageFor(new Error('falhou'), API)).toBe('falhou');
    expect(errorMessageFor('???', API)).toBe('Erro inesperado.');
    expect(errorMessageFor(undefined, API)).toBe('Erro inesperado.');
  });
});

describe('apiErrorCode / httpStatus / errorBody', () => {
  it('extraem o código, o status e o corpo da resposta de erro', () => {
    const body = { message: 'Você já tem uma corrida em andamento.', error: 'RIDE_ALREADY_ACTIVE', ride: { id: 'ride-9' } };
    const err = fail(409, body);
    expect(apiErrorCode(err)).toBe('RIDE_ALREADY_ACTIVE');
    expect(httpStatus(err)).toBe(409);
    expect(errorBody<typeof body>(err)?.ride.id).toBe('ride-9');
  });

  it('sem resposta ou fora do axios devolvem null', () => {
    expect(apiErrorCode(offline())).toBeNull();
    expect(httpStatus(offline())).toBeNull();
    expect(errorBody(offline())).toBeNull();
    expect(apiErrorCode(new Error('x'))).toBeNull();
    expect(httpStatus('x')).toBeNull();
    expect(errorBody(null)).toBeNull();
  });

  it('resposta sem o campo error não tem código', () => {
    expect(apiErrorCode(fail(422, { message: 'Dados inválidos.' }))).toBeNull();
  });
});
