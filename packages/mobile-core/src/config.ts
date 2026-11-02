import { Platform } from 'react-native';

// Preenchido no bundle pelo babel-plugin-transform-inline-environment-variables dos
// apps (só VOZTRI_API_URL); em tempo de execução o React Native não tem outras variáveis.
declare const process: { env: { VOZTRI_API_URL?: string } };

/** Endereço padrão: emulador Android (10.0.2.2 = a máquina) ou simulador iOS (localhost). */
export const DEFAULT_API_URL: string =
  Platform.select({ android: 'http://10.0.2.2:8080/api/v1', default: 'http://localhost:8080/api/v1' }) ??
  'http://localhost:8080/api/v1';

/**
 * Endereço da API vindo do ambiente: aceita http(s)://..., sem a barra final. Vazio
 * usa o padrão; inválido avisa e usa o padrão (melhor do que o app sem conexão).
 */
export function resolveApiUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (!/^https?:\/\/[^\s/]+/i.test(trimmed)) {
    console.warn(`[VOZTRI] VOZTRI_API_URL inválida ("${trimmed}"); usando ${fallback}`);
    return fallback;
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Endereço da API (Nginx do docker-compose na porta 8080), comum aos dois apps.
 * - Padrão: emulador Android (10.0.2.2) ou simulador iOS (localhost).
 * - Aparelho físico: defina VOZTRI_API_URL ao subir o Metro, sem editar o código, ex.:
 *     VOZTRI_API_URL=http://192.168.0.10:8080/api/v1 npx react-native start --reset-cache
 *   (o valor é embutido no bundle; para o build de release, exporte a variável antes do
 *   Gradle/Xcode). O release bloqueia HTTP sem TLS: use HTTPS fora do debug.
 */
export const API_URL: string = resolveApiUrl(process.env.VOZTRI_API_URL, DEFAULT_API_URL);

/**
 * Intervalo do polling da API: ofertas e corrida em andamento no app do motorista;
 * corrida em andamento e chat no do passageiro.
 */
export const POLL_INTERVAL_MS = 3000;
