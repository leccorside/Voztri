import { Platform } from 'react-native';

/**
 * Endereço da API (Nginx do docker-compose na porta 8080).
 * - Emulador Android: 10.0.2.2 é o "localhost" da máquina que roda o emulador.
 * - Simulador iOS: localhost funciona direto.
 * - Aparelho físico: troque pelo IP da máquina na rede, ex.: http://192.168.0.10:8080/api/v1
 *   (o build de release bloqueia HTTP sem TLS; use HTTPS em produção).
 */
export const API_URL: string =
  Platform.select({ android: 'http://10.0.2.2:8080/api/v1', default: 'http://localhost:8080/api/v1' }) ??
  'http://localhost:8080/api/v1';

/** Intervalo do polling da corrida em andamento e do chat. */
export const POLL_INTERVAL_MS = 3000;
