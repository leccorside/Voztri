/**
 * Configuração do app do motorista. O endereço da API e o intervalo do polling são
 * comuns aos dois apps e ficam no @voztri/mobile-core; aqui ficam os valores
 * próprios do motorista (envio da localização).
 */
export { API_URL, POLL_INTERVAL_MS } from '@voztri/mobile-core';

/** Envio da posição para /driver/location: no máximo uma vez por intervalo... */
export const LOCATION_SEND_INTERVAL_MS = 10_000;
/** ...a não ser que o motorista tenha andado mais do que isto desde o último envio. */
export const LOCATION_SEND_DISTANCE_M = 200;
/** O GPS só avisa mudanças de posição maiores que isto. */
export const LOCATION_DISTANCE_FILTER_M = 25;
/**
 * Parado, a posição é reenviada a cada intervalo destes (batimento): sem isso o
 * last_location_at envelhece e, depois de RideDispatcher::LOCATION_MAX_AGE_MINUTES
 * (10 min), o despacho manda o motorista para o fim da fila.
 */
export const LOCATION_HEARTBEAT_MS = 120_000;
