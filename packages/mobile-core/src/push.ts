import firebase from '@react-native-firebase/app';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

/**
 * Notificações push dos apps VOZTRI (FCM no Android; no iOS o FCM repassa ao APNs),
 * compartilhadas pelo driver-mobile e pelo passenger-mobile. Cada app só decide
 * quais mensagens interessam (src/push.ts de cada app filtra o `data`).
 *
 * Com o app em segundo plano ou fechado, o sistema mostra a notificação que o
 * backend envia; ao tocar nela o app abre e recebe o `data` da mensagem. Com o
 * app aberto a notificação não aparece: a mensagem só antecipa o polling.
 *
 * Tudo aqui é opcional: sem o google-services.json / GoogleService-Info.plist
 * nenhum app do Firebase é criado e o push fica desligado sem quebrar nada.
 */

export type PushStatus = 'enabled' | 'denied' | 'unavailable' | 'error';

export type PushPlatform = 'android' | 'ios';

/** `data` da mensagem do FCM (o backend só envia strings). */
export type PushData = Record<string, unknown>;

/** Registro do token na API (POST/DELETE /devices), injetado por cada app. */
export interface PushDeviceApi {
  register(token: string, platform: PushPlatform): Promise<unknown>;
  unregister(token: string): Promise<void>;
}

export interface PushController {
  /** O Firebase foi configurado neste build (arquivo do projeto presente). */
  isPushAvailable(): boolean;
  /**
   * Handler das mensagens recebidas com o app em segundo plano. Precisa ser
   * registrado antes do AppRegistry. A notificação já é mostrada pelo sistema;
   * não há nada a fazer aqui (o app atualiza quando abre).
   */
  registerBackgroundHandler(): void;
  /**
   * Pede permissão, registra o token do aparelho na API e passa a ouvir as
   * mensagens. `onData` recebe o `data` de cada mensagem com o app aberto, ao
   * tocar na notificação e quando o app foi aberto por ela (estava fechado).
   */
  enablePush(onData: (data: PushData) => void): Promise<PushStatus>;
  /**
   * Logout: remove o token da conta na API (precisa da sessão ainda válida).
   * Com `revoke` (sessão expirada, sem como chamar a API) o token é invalidado no
   * próprio Firebase; o backend apaga o registro no próximo envio (UNREGISTERED).
   */
  disablePush(options?: { revoke?: boolean }): Promise<void>;
}

export function createPushController(deviceApi: PushDeviceApi): PushController {
  let registeredToken: string | null = null;
  let unsubscribers: Array<() => void> = [];
  /** Incrementa a cada ativação/desativação: descarta um enablePush atropelado pelo logout. */
  let generation = 0;

  const isPushAvailable = (): boolean => {
    try {
      return firebase.apps.length > 0;
    } catch {
      return false; // módulo nativo ausente (ex.: build antigo)
    }
  };

  const register = async (token: string): Promise<void> => {
    await deviceApi.register(token, Platform.OS === 'ios' ? 'ios' : 'android');
    registeredToken = token;
  };

  const disposeListeners = (): void => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
  };

  return {
    isPushAvailable,

    registerBackgroundHandler() {
      if (!isPushAvailable()) return;
      messaging().setBackgroundMessageHandler(async () => undefined);
    },

    async enablePush(onData) {
      if (!isPushAvailable()) return 'unavailable';
      disposeListeners();
      const gen = ++generation;

      try {
        const m = messaging();
        // iOS: alerta do sistema; Android 13+: POST_NOTIFICATIONS (se já foi pedida, não
        // pergunta de novo). Abaixo disso, o Android sempre autoriza.
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
          if (message?.data) onData(message.data);
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
    },

    async disablePush(options = {}) {
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
    },
  };
}
