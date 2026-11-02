import { createPushController, PushStatus } from '@voztri/mobile-core';
import { deviceApi } from './api.js';

/**
 * Push do andamento da corrida (canal "ride_updates"): motorista a caminho, no
 * embarque, cancelamento, conclusão e busca sem motorista. A lógica de Firebase,
 * permissão, token e logout está no @voztri/mobile-core; aqui só o filtro das
 * mensagens que interessam ao passageiro.
 */

export type { PushStatus };

const push = createPushController(deviceApi);

export const isPushAvailable = push.isPushAvailable;
export const registerBackgroundHandler = push.registerBackgroundHandler;
export const disablePush = push.disablePush;

/**
 * Ativa o push. `onRideUpdate` recebe o id da corrida quando chega uma mensagem de
 * andamento com o app aberto ou quando o passageiro toca na notificação.
 */
export function enablePush(onRideUpdate: (rideId: string) => void): Promise<PushStatus> {
  return push.enablePush((data) => {
    if (data.type === 'ride_status' && typeof data.rideId === 'string') onRideUpdate(data.rideId);
  });
}
