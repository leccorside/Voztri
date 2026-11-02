/**
 * Endereço da API configurável por VOZTRI_API_URL (embutida pelo Babel no bundle).
 */
import { API_URL, DEFAULT_API_URL, POLL_INTERVAL_MS, resolveApiUrl } from '@voztri/mobile-core';

const FALLBACK = 'http://localhost:8080/api/v1';

describe('resolveApiUrl', () => {
  it('sem valor (ou só espaços) usa o padrão', () => {
    expect(resolveApiUrl(undefined, FALLBACK)).toBe(FALLBACK);
    expect(resolveApiUrl('', FALLBACK)).toBe(FALLBACK);
    expect(resolveApiUrl('   ', FALLBACK)).toBe(FALLBACK);
  });

  it('aceita http e https e remove espaços e a barra final', () => {
    expect(resolveApiUrl(' http://192.168.0.10:8080/api/v1/ ', FALLBACK)).toBe('http://192.168.0.10:8080/api/v1');
    expect(resolveApiUrl('https://api.voztri.com.br/api/v1//', FALLBACK)).toBe('https://api.voztri.com.br/api/v1');
    expect(resolveApiUrl('HTTP://10.0.0.5:8080/api/v1', FALLBACK)).toBe('HTTP://10.0.0.5:8080/api/v1');
  });

  it('valor inválido avisa e usa o padrão', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(resolveApiUrl('192.168.0.10:8080/api/v1', FALLBACK)).toBe(FALLBACK); // sem protocolo
      expect(resolveApiUrl('ftp://servidor/api', FALLBACK)).toBe(FALLBACK);
      expect(resolveApiUrl('http://', FALLBACK)).toBe(FALLBACK);
      expect(warn).toHaveBeenCalledTimes(3);
      expect(warn.mock.calls[0]![0]).toContain('VOZTRI_API_URL inválida ("192.168.0.10:8080/api/v1")');
    } finally {
      warn.mockRestore();
    }
  });
});

it('nos testes a variável é ignorada (jest.config.js) e vale o padrão do simulador', () => {
  expect(API_URL).toBe(DEFAULT_API_URL);
  expect(DEFAULT_API_URL).toBe('http://localhost:8080/api/v1'); // o Jest simula o iOS
  expect(POLL_INTERVAL_MS).toBe(3000);
});
