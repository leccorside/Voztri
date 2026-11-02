import { createPushController, PushStatus } from '@voztri/mobile-core';
import { deviceApi } from './api.js';

/**
 * Push de novas ofertas de corrida (canal "ride_offers"). A lógica de Firebase,
 * permissão, token e logout está no @voztri/mobile-core; aqui só o filtro das
 * mensagens que interessam ao motorista.
 */

export type { PushStatus };

const push = createPushController(deviceApi);

export const isPushAvailable = push.isPushAvailable;
export const registerBackgroundHandler = push.registerBackgroundHandler;
export const disablePush = push.disablePush;

/**
 * Ativa o push. `onOffer` é chamado quando chega uma oferta com o app aberto ou
 * quando o motorista toca na notificação (o store busca a oferta na API).
 */
export function enablePush(onOffer: () => void): Promise<PushStatus> {
  return push.enablePush((data) => {
    if (data.type === 'ride_offer') onOffer();
  });
}
