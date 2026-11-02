import { create } from 'zustand';
import type { DriverEarningsSummary, DriverRideOffer, Ride, User } from '@voztri/shared-types';
import { apiErrorCode, authApi, billingApi, driverApi, errorMessage, onUnauthorized, rideApi, session } from '../api.js';
import { LOCATION_SEND_DISTANCE_M, LOCATION_SEND_INTERVAL_MS } from '../config.js';
import {
  DevicePosition,
  distanceMeters,
  getCurrentPosition,
  LocationError,
  LocationPermission,
  requestLocationPermission,
} from '../location.js';
import { disablePush, enablePush, PushStatus } from '../push.js';

export type SessionStatus = 'checking' | 'anonymous' | 'authenticated';

/** off: offline; tracking: GPS acompanhando; denied/unavailable: sem localização. */
export type LocationStatus = 'off' | 'tracking' | 'denied' | 'unavailable';

/**
 * Quem envia a posição com o app em segundo plano:
 * native: rastreamento nativo (LocationTrackingService no Android, VoztriLocationTracking no iOS);
 * ios: fallback do iOS sem o módulo nativo (JS com allowsBackgroundLocationUpdates, que o iOS pode pausar);
 * foreground-only: o serviço não iniciou, o envio só acontece com o app aberto.
 */
export type BackgroundMode = 'off' | 'native' | 'ios' | 'foreground-only';

export type BackgroundPermission = 'unknown' | 'granted' | 'denied';

/** Última leitura do GPS aceita no aviso de chegada quando a leitura na hora falha. */
const ARRIVAL_POSITION_MAX_AGE_MS = 60_000;

const PERMISSION_MESSAGE: Record<Exclude<LocationPermission, 'granted'>, string> = {
  denied: 'Permita o acesso à localização para ficar online e receber corridas próximas.',
  blocked: 'A localização está bloqueada para o VOZTRI Driver. Libere nas configurações do aparelho para ficar online.',
};

export interface DriverState {
  sessionStatus: SessionStatus;
  user: User | null;

  isOnline: boolean;
  earnings: DriverEarningsSummary | null;
  offer: DriverRideOffer | null;
  currentRide: Ride | null;

  /** Ação em andamento (desabilita botões e mostra "Aguarde…"). */
  busy: boolean;
  /** Falha de uma ação do usuário (dispensável). */
  error: string | null;
  /** Falha do polling (some sozinha quando a conexão volta). */
  connectionError: string | null;

  locationStatus: LocationStatus;
  /** Última posição lida do GPS. */
  lastPosition: DevicePosition | null;
  /** Aviso sobre a localização (permissão negada, GPS desligado). */
  locationWarning: string | null;
  /** Último envio a /driver/location (controla o intervalo mínimo). */
  lastSentLocation: { at: number; position: DevicePosition } | null;
  backgroundMode: BackgroundMode;
  backgroundPermission: BackgroundPermission;
  /** O aviso sobre a localização em segundo plano já apareceu nesta sessão. */
  backgroundPromptShown: boolean;
  /** Push de novas ofertas (off: ainda não ativado nesta sessão). */
  pushStatus: PushStatus | 'off';

  bootstrap: () => Promise<void>;
  requestCode: (phone: string) => Promise<string | null>;
  login: (phone: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;

  refresh: () => Promise<void>;
  refreshEarnings: () => Promise<void>;
  toggleOnline: () => Promise<void>;
  acceptOffer: () => Promise<void>;
  rejectOffer: () => Promise<void>;
  /** Avisa o passageiro de que o motorista chegou ao embarque. */
  markArrived: () => Promise<boolean>;
  validatePin: (pin: string) => Promise<boolean>;
  completeRide: () => Promise<boolean>;
  requestPayout: () => Promise<number | null>;
  dismissError: () => void;

  /** Recebe uma posição do GPS e envia à API respeitando o intervalo mínimo. */
  reportPosition: (position: DevicePosition, force?: boolean) => Promise<void>;
  setLocationStatus: (status: LocationStatus, warning?: string | null) => void;
  onLocationError: (error: LocationError) => void;
  onLocationPermission: (permission: LocationPermission) => void;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setBackgroundPermission: (permission: BackgroundPermission) => void;
  markBackgroundPromptShown: () => void;
}

const signedOut = {
  sessionStatus: 'anonymous' as SessionStatus,
  user: null,
  isOnline: false,
  earnings: null,
  offer: null,
  currentRide: null,
  busy: false,
  error: null,
  connectionError: null,
  locationStatus: 'off' as LocationStatus,
  lastPosition: null,
  locationWarning: null,
  lastSentLocation: null,
  backgroundMode: 'off' as BackgroundMode,
  backgroundPermission: 'unknown' as BackgroundPermission,
  backgroundPromptShown: false,
  pushStatus: 'off' as PushStatus | 'off',
};


export const useDriverStore = create<DriverState>((set, get) => {
  /** Executa uma ação do usuário com indicador de carregamento e tratamento de erro. */
  const run = async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    set({ busy: true, error: null });
    try {
      return await action();
    } catch (err) {
      set({ error: errorMessage(err) });
      return undefined;
    } finally {
      set({ busy: false });
    }
  };

  const startSession = async (user: User) => {
    set({ ...signedOut, sessionStatus: 'authenticated', user });
    // Push em paralelo: avisa de novas ofertas com o app em segundo plano; com o app
    // aberto (ou ao tocar na notificação) só antecipa o polling.
    void enablePush(() => {
      if (get().sessionStatus === 'authenticated') void get().refresh();
    }).then((pushStatus) => {
      if (get().user?.id === user.id) set({ pushStatus });
    });
    await Promise.all([get().refresh(), get().refreshEarnings()]);
  };

  return {
    ...signedOut,
    sessionStatus: 'checking',

    bootstrap: async () => {
      onUnauthorized(() => {
        void session.clear();
        // Sem sessão não dá para chamar DELETE /devices: invalida o token no Firebase
        void disablePush({ revoke: true });
        set({ ...signedOut, error: 'Sua sessão expirou. Entre novamente.' });
      });

      const token = await session.load();
      if (!token) {
        set({ sessionStatus: 'anonymous' });
        return;
      }
      try {
        const user = await authApi.getMe();
        if (user.role !== 'driver') {
          await session.clear();
          set({ sessionStatus: 'anonymous' });
          return;
        }
        await startSession(user);
      } catch (err) {
        // Sem rede: mantém o token e deixa o usuário tentar de novo
        set({ sessionStatus: 'anonymous', error: errorMessage(err) });
      }
    },

    requestCode: async (phone) => {
      const res = await run(() => authApi.requestOtp(phone, 'driver'));
      return res ? res.debugOtp ?? '' : null;
    },

    login: async (phone, code) => {
      const res = await run(() => authApi.verifyOtp(phone, code));
      if (!res) return false;
      if (res.user.role !== 'driver') {
        set({ error: 'Este telefone não pertence a um motorista VOZTRI.' });
        return false;
      }
      await session.save(res.token);
      await startSession(res.user);
      return true;
    },

    logout: async () => {
      if (get().isOnline) {
        // Melhor esforço: não continuar recebendo ofertas depois de sair
        await driverApi.setOnlineStatus(false).catch(() => undefined);
      }
      // Antes de limpar a sessão: o DELETE /devices precisa do token da API
      await disablePush();
      await session.clear();
      set({ ...signedOut });
    },

    refresh: async () => {
      try {
        const state = await driverApi.getCurrent();
        set({ isOnline: state.isOnline, offer: state.offer, currentRide: state.ride, connectionError: null });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    refreshEarnings: async () => {
      try {
        const earnings = await driverApi.getEarnings();
        set({ earnings, isOnline: earnings.isOnline, connectionError: null });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    toggleOnline: async () => {
      const goingOnline = !get().isOnline;

      if (goingOnline) {
        // Sem localização a API não consegue ofertar corridas próximas
        const permission = await requestLocationPermission();
        if (permission !== 'granted') {
          get().onLocationPermission(permission);
          return;
        }
      }

      const res = await run(() => driverApi.setOnlineStatus(goingOnline));
      if (!res) return;
      set({ isOnline: res.isOnline, offer: res.isOnline ? get().offer : null });

      if (res.isOnline) {
        // Posição imediata, para já entrar no despacho com a localização certa
        try {
          await get().reportPosition(await getCurrentPosition(), true);
        } catch (err) {
          if (err instanceof LocationError) get().onLocationError(err);
        }
      } else {
        set({ locationStatus: 'off', locationWarning: null, lastSentLocation: null });
      }
    },

    reportPosition: async (position, force = false) => {
      set({ lastPosition: position, locationStatus: 'tracking', locationWarning: null });
      if (!get().isOnline || get().sessionStatus !== 'authenticated') return;
      // Com o serviço nativo ativo, ele é quem envia (inclusive em segundo plano)
      if (get().backgroundMode === 'native') return;

      const now = Date.now();
      const lastSent = get().lastSentLocation;
      const due =
        force ||
        !lastSent ||
        now - lastSent.at >= LOCATION_SEND_INTERVAL_MS ||
        distanceMeters(lastSent.position, position) >= LOCATION_SEND_DISTANCE_M;
      if (!due) return;

      set({ lastSentLocation: { at: now, position } });
      try {
        const res = await driverApi.updateLocation({
          latitude: position.latitude,
          longitude: position.longitude,
          ...(position.heading != null ? { heading: position.heading } : {}),
          ...(position.speed != null ? { speed: position.speed } : {}),
          // Precisão do GPS: a chegada automática exige distância + precisão <= 100 m
          ...(Number.isFinite(position.accuracy) && position.accuracy >= 0 ? { accuracy: position.accuracy } : {}),
        });
        // Esta posição marcou a chegada ao embarque (a até 100 m): atualiza a tela já
        if (res?.arrivedAtPickup) void get().refresh();
      } catch (err) {
        set({ lastSentLocation: null }); // tenta de novo na próxima leitura
        set({ connectionError: errorMessage(err) });
      }
    },

    setLocationStatus: (status, warning = null) => set({ locationStatus: status, locationWarning: warning }),

    onLocationError: (error) => {
      if (error.code === 'denied') {
        set({ locationStatus: 'denied', locationWarning: PERMISSION_MESSAGE.denied });
      } else {
        set({ locationStatus: 'unavailable', locationWarning: `${error.message} Sem ela você não recebe corridas próximas.` });
      }
    },

    setBackgroundMode: (mode) => set({ backgroundMode: mode }),

    setBackgroundPermission: (permission) => set({ backgroundPermission: permission }),

    markBackgroundPromptShown: () => set({ backgroundPromptShown: true }),

    onLocationPermission: (permission) => {
      if (permission === 'granted') return;
      set({ locationStatus: 'denied', locationWarning: PERMISSION_MESSAGE[permission] });
    },

    acceptOffer: async () => {
      const offer = get().offer;
      if (!offer) return;
      set({ busy: true, error: null });
      try {
        const ride = await driverApi.acceptOffer(offer.rideId);
        set({ currentRide: ride, offer: null });
      } catch (err) {
        // Oferta expirada ou corrida cancelada: a oferta deixa de valer
        set({ offer: null, error: errorMessage(err) });
      } finally {
        set({ busy: false });
      }
    },

    rejectOffer: async () => {
      const offer = get().offer;
      if (!offer) return;
      set({ offer: null });
      // 404 = a oferta já tinha expirado no servidor; não é erro para o usuário
      await driverApi.rejectOffer(offer.rideId).catch(() => undefined);
    },

    markArrived: async () => {
      const ride = get().currentRide;
      if (!ride) return false;
      // A API só aceita perto do embarque: manda a posição de agora (ou a última
      // leitura recente); sem nenhuma, a API usa a última que recebeu.
      const updated = await run(async () => {
        let position: DevicePosition | null = null;
        try {
          position = await getCurrentPosition();
        } catch {
          const last = get().lastPosition;
          position = last && Date.now() - last.timestamp <= ARRIVAL_POSITION_MAX_AGE_MS ? last : null;
        }
        const coords = position ? { latitude: position.latitude, longitude: position.longitude } : undefined;
        return rideApi.markArrived(ride.id, coords);
      });
      if (!updated) return false;
      set({ currentRide: updated });
      return true;
    },

    validatePin: async (pin) => {
      const ride = get().currentRide;
      if (!ride) return false;
      set({ busy: true, error: null });
      try {
        const updated = await rideApi.validatePin(ride.id, pin);
        set({ currentRide: updated });
        return true;
      } catch (err) {
        if (apiErrorCode(err) !== 'INVALID_PIN') {
          set({ error: errorMessage(err) });
        }
        return false;
      } finally {
        set({ busy: false });
      }
    },

    completeRide: async () => {
      const ride = get().currentRide;
      if (!ride) return false;
      const done = await run(() => rideApi.completeRide(ride.id));
      if (!done) return false;
      set({ currentRide: null });
      await get().refreshEarnings();
      return true;
    },

    requestPayout: async () => {
      const earnings = get().earnings;
      if (!earnings || !earnings.pixKey || !earnings.pixKeyType) {
        set({ error: 'Cadastre uma chave Pix para receber os repasses.' });
        return null;
      }
      const amount = earnings.availableBalanceCents;
      const res = await run(() =>
        billingApi.requestPayout({ amountCents: amount, pixKey: earnings.pixKey!, pixKeyType: earnings.pixKeyType! }),
      );
      if (!res) return null;
      await get().refreshEarnings();
      return amount;
    },

    dismissError: () => set({ error: null }),
  };
});
