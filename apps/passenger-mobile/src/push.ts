import firebase from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { deviceApi } from './api.js';

/**
 * Notificações push do andamento da corrida: motorista a caminho (enviada no
 * aceite) e motorista no embarque. FCM no Android; no iOS o FCM repassa ao APNs.
 *
 * Com o app em segundo plano ou fechado, o sistema mostra a notificação que o
 * backend envia (canal "ride_updates"); ao tocar nela o app abre e o store
 * atualiza a corrida. Com o app aberto a notificação não aparece: a mensagem
 * só antecipa o polling.
 *
 * Tudo aqui é opcional: sem o google-services.json / GoogleService-Info.plist
 * nenhum app do Firebase é criado e o push fica desligado sem quebrar nada.
 *
 * Mesma estrutura do src/push.ts do driver-mobile (candidato a pacote comum).
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

/** Id da corrida, se a mensagem for de andamento de corrida. */
function rideIdOf(message: FirebaseMessagingTypes.RemoteMessage | null | undefined): string | null {
  const data = message?.data;
  return data?.type === 'ride_status' && typeof data.rideId === 'string' ? data.rideId : null;
}

/**
 * Handler das mensagens recebidas com o app em segundo plano. Precisa ser
 * registrado antes do AppRegistry. A notificação já é mostrada pelo sistema;
 * não há nada a fazer aqui (a corrida é atualizada quando o app abre).
 */
export function registerBackgroundHandler(): void {
  if (!isPushAvailable()) return;
  messaging().setBackgroundMessageHandler(async () => undefined);
}

/**
 * Pede permissão, registra o token do aparelho na API e passa a ouvir as
 * mensagens. `onRideUpdate` recebe o id da corrida quando chega uma mensagem
 * com o app aberto ou quando o passageiro toca na notificação.
 */
export async function enablePush(onRideUpdate: (rideId: string) => void): Promise<PushStatus> {
  if (!isPushAvailable()) return 'unavailable';
  disposeListeners();
  const gen = ++generation;

  try {
    const m = messaging();
    // iOS: alerta do sistema; Android 13+: POST_NOTIFICATIONS. Abaixo disso, sempre autoriza.
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

    const deliver = (message: FirebaseMessagingTypes.RemoteMessage | null | undefined) => {
      const rideId = rideIdOf(message);
      if (rideId) onRideUpdate(rideId);
    };

    unsubscribers = [
      m.onTokenRefresh((fresh) => {
        void register(fresh).catch(() => undefined);
      }),
      m.onMessage(async (message) => deliver(message)),
      m.onNotificationOpenedApp(deliver),
    ];

    // App aberto a partir da notificação (estava fechado)
    deliver(await m.getInitialNotification());

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
