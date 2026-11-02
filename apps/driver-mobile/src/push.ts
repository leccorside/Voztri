import firebase from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { deviceApi } from './api.js';

/**
 * Notificações push de novas ofertas de corrida (FCM no Android; no iOS o FCM
 * repassa ao APNs).
 *
 * Com o app em segundo plano ou fechado, o sistema mostra a notificação que o
 * backend envia (título, corpo e canal "ride_offers"); ao tocar nela o app abre
 * e o store busca a oferta. Com o app aberto a notificação não aparece: a
 * mensagem só antecipa o polling.
 *
 * Tudo aqui é opcional: sem o google-services.json / GoogleService-Info.plist
 * nenhum app do Firebase é criado e o push fica desligado sem quebrar nada.
 */

export type PushStatus = 'enabled' | 'denied' | 'unavailable' | 'error';

let registeredToken: string | null = null;
let unsubscribers: Array<() => void> = [];
/** Incrementa a cada ativação/desativação: descarta um enablePush atropelado pelo logout. */
let generation = 0;

/** O Firebase foi configurado neste build (arquivo do projeto presente). */
export function isPushAvailable(): boolean {
  try {
    return firebase.apps.length > 0;
  } catch {
    return false; // módulo nativo ausente (ex.: build antigo)
  }
}

function isRideOffer(message: FirebaseMessagingTypes.RemoteMessage | null | undefined): boolean {
  return message?.data?.type === 'ride_offer';
}

/**
 * Handler das mensagens recebidas com o app em segundo plano. Precisa ser
 * registrado antes do AppRegistry. A notificação já é mostrada pelo sistema;
 * não há nada a fazer aqui (a oferta é buscada quando o app abre).
 */
export function registerBackgroundHandler(): void {
  if (!isPushAvailable()) return;
  messaging().setBackgroundMessageHandler(async () => undefined);
}

/**
 * Pede permissão, registra o token do aparelho na API e passa a ouvir as
 * mensagens. `onOffer` é chamado quando chega uma oferta com o app aberto ou
 * quando o motorista toca na notificação.
 */
export async function enablePush(onOffer: () => void): Promise<PushStatus> {
  if (!isPushAvailable()) return 'unavailable';
  disposeListeners();
  const gen = ++generation;

  try {
    const m = messaging();
    // iOS: alerta do sistema; Android 13+: POST_NOTIFICATIONS (se já foi pedida
    // pelo serviço de localização, não pergunta de novo). Abaixo disso, sempre autoriza.
    const status = await m.requestPermission();
    const allowed =
      status === messaging.AuthorizationStatus.AUTHORIZED || status === messaging.AuthorizationStatus.PROVISIONAL;

    const token = await m.getToken();
    if (gen !== generation) return 'unavailable'; // logout no meio do caminho
    await register(token);
    if (gen !== generation) {
      // O logout aconteceu durante o registro: a sessão já foi limpa, então
      // invalida o token no Firebase em vez de deixá-lo ligado à conta antiga.
      registeredToken = null;
      await m.deleteToken().catch(() => undefined);
      return 'unavailable';
    }

    unsubscribers = [
      m.onTokenRefresh((fresh) => {
        void register(fresh).catch(() => undefined);
      }),
      m.onMessage(async (message) => {
        if (isRideOffer(message)) onOffer();
      }),
      m.onNotificationOpenedApp((message) => {
        if (isRideOffer(message)) onOffer();
      }),
    ];

    // App aberto a partir da notificação (estava fechado)
    if (isRideOffer(await m.getInitialNotification())) onOffer();

    return allowed ? 'enabled' : 'denied';
  } catch {
    return 'error';
  }
}

/**
 * Logout: remove o token da conta na API (precisa da sessão ainda válida).
 * Com `revoke` (sessão expirada, sem como chamar a API) o token é invalidado no
 * próprio Firebase; o backend apaga o registro no próximo envio (UNREGISTERED).
 */
export async function disablePush(options: { revoke?: boolean } = {}): Promise<void> {
  generation++;
  disposeListeners();
  const token = registeredToken;
  registeredToken = null;
  if (!token || !isPushAvailable()) return;

  if (options.revoke) {
    await messaging().deleteToken().catch(() => undefined);
  } else {
    await deviceApi.unregister(token).catch(() => undefined);
  }
}

async function register(token: string): Promise<void> {
  await deviceApi.register(token, Platform.OS === 'ios' ? 'ios' : 'android');
  registeredToken = token;
}

function disposeListeners(): void {
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  unsubscribers = [];
}
