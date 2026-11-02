import { create } from 'zustand';
import type { AddressLocation, ChatMessage, FareEstimate, PaymentMethodType, Ride, RideStatus, User } from '@voztri/shared-types';
import {
  activeRideMemory,
  apiErrorCode,
  authApi,
  billingApi,
  errorBody,
  errorMessage,
  onUnauthorized,
  rideApi,
  session,
} from '../api.js';
import { getCurrentPosition, LocationError, requestLocationPermission } from '../location.js';
import { disablePush, enablePush, PushStatus } from '../push.js';

export type SessionStatus = 'checking' | 'anonymous' | 'authenticated';

/** gps: posição real; locating: lendo o GPS; fallback: origem padrão (sem permissão ou sem sinal). */
export type OriginSource = 'gps' | 'locating' | 'fallback';

export type PassengerFlowStep =
  | 'HOME'
  | 'DESTINATION'
  | 'SELECT_CATEGORY'
  | 'SEARCHING'
  | 'DRIVER_EN_ROUTE'
  | 'IN_TRIP'
  | 'COMPLETED';

export type Category = 'pop' | 'black' | 'mulher' | 'moto';

export interface PassengerState {
  sessionStatus: SessionStatus;
  user: User | null;

  currentStep: PassengerFlowStep;
  /** Ponto de embarque: a posição do GPS ou, sem ela, a origem padrão. */
  origin: AddressLocation;
  originSource: OriginSource;
  /** Precisão da posição do GPS, em metros. */
  originAccuracy: number | null;
  /** Por que a origem padrão está sendo usada. */
  originWarning: string | null;
  destination: AddressLocation | null;
  estimates: FareEstimate[];
  estimatesLoading: boolean;
  selectedCategory: Category;
  selectedPaymentMethod: PaymentMethodType;
  activeRide: Ride | null;
  chatMessages: ChatMessage[];
  isSosActive: boolean;
  /** Push do andamento da corrida (off: ainda não ativado nesta sessão). */
  pushStatus: PushStatus | 'off';

  busy: boolean;
  error: string | null;
  connectionError: string | null;

  bootstrap: () => Promise<void>;
  requestCode: (phone: string) => Promise<string | null>;
  login: (phone: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;

  /** Lê o GPS e usa a posição como ponto de embarque. */
  locateOrigin: () => Promise<void>;
  setStep: (step: PassengerFlowStep) => void;
  setDestination: (destination: AddressLocation) => Promise<void>;
  loadEstimates: () => Promise<void>;
  selectCategory: (category: Category) => void;
  selectPaymentMethod: (method: PaymentMethodType) => void;
  confirmRideRequest: () => Promise<void>;
  refreshRide: () => Promise<void>;
  /** Chegou um push sobre a corrida (app aberto ou toque na notificação). */
  onRidePush: (rideId: string) => Promise<void>;
  cancelActiveRide: (reason: string) => Promise<void>;
  loadChat: () => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  triggerSos: () => Promise<void>;
  cancelSos: (pin: string) => Promise<boolean>;
  finishRideEvaluation: (evaluation: { rating: number; tipCents?: number; tags?: string[] }) => Promise<void>;
  dismissError: () => void;
}

/** Usada só quando o GPS não está disponível (sinalizada na tela inicial). */
const DEFAULT_ORIGIN: AddressLocation = {
  address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
  shortAddress: 'Av. Paulista, 1578',
  latitude: -23.561414,
  longitude: -46.655881,
  city: 'São Paulo',
  state: 'SP',
};

const OPEN_STATUSES: RideStatus[] = ['REQUESTED', 'SEARCHING', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'IN_PROGRESS'];

/** Etapa da interface correspondente ao status da corrida na API. */
export function stepForStatus(status: RideStatus): PassengerFlowStep {
  switch (status) {
    case 'REQUESTED':
    case 'SEARCHING':
    case 'OFFERED':
      return 'SEARCHING';
    case 'ACCEPTED':
    case 'DRIVER_EN_ROUTE':
    case 'DRIVER_ARRIVED':
      return 'DRIVER_EN_ROUTE';
    case 'IN_PROGRESS':
      return 'IN_TRIP';
    case 'COMPLETED':
      return 'COMPLETED';
    default:
      return 'HOME';
  }
}

const tripReset = {
  currentStep: 'HOME' as PassengerFlowStep,
  destination: null,
  estimates: [],
  estimatesLoading: false,
  activeRide: null,
  chatMessages: [],
  isSosActive: false,
};

const signedOut = {
  ...tripReset,
  sessionStatus: 'anonymous' as SessionStatus,
  user: null,
  origin: DEFAULT_ORIGIN,
  originSource: 'fallback' as OriginSource,
  originAccuracy: null,
  originWarning: null,
  selectedCategory: 'pop' as Category,
  selectedPaymentMethod: 'pix' as PaymentMethodType,
  pushStatus: 'off' as PushStatus | 'off',
  busy: false,
  error: null,
  connectionError: null,
};

export const usePassengerStore = create<PassengerState>((set, get) => {
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

  /** Aplica uma corrida vinda da API e decide a etapa da interface. */
  const applyRide = async (ride: Ride) => {
    if (ride.status === 'CANCELLED' || ride.status === 'NO_DRIVER_AVAILABLE') {
      await activeRideMemory.clear();
      const byMe = get().activeRide === null;
      set({
        ...tripReset,
        error: byMe ? null : ride.status === 'CANCELLED' ? 'A corrida foi cancelada.' : 'Nenhum motorista disponível no momento.',
      });
      return;
    }
    set({ activeRide: ride, currentStep: stepForStatus(ride.status) });
  };

  // Leitura do GPS em andamento (escolher o destino espera por ela)
  let locating: Promise<void> | null = null;

  const startSession = async (user: User) => {
    set({ ...signedOut, sessionStatus: 'authenticated', user });
    void get().locateOrigin();
    // Push em paralelo: avisa quando o motorista aceita e quando chega, com o app em
    // segundo plano; com o app aberto (ou ao tocar na notificação) só antecipa o polling.
    void enablePush((rideId) => void get().onRidePush(rideId)).then((pushStatus) => {
      if (get().user?.id === user.id) set({ pushStatus });
    });
    // Retoma a corrida em andamento (ou a avaliação pendente) após reabrir o app
    const rideId = await activeRideMemory.load();
    if (!rideId) return;
    try {
      const ride = await rideApi.getRide(rideId);
      if (OPEN_STATUSES.includes(ride.status) || ride.status === 'COMPLETED') {
        set({ activeRide: ride, currentStep: stepForStatus(ride.status) });
      } else {
        await activeRideMemory.clear();
      }
    } catch {
      await activeRideMemory.clear();
    }
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
        if (user.role !== 'passenger') {
          await session.clear();
          set({ sessionStatus: 'anonymous' });
          return;
        }
        await startSession(user);
      } catch (err) {
        set({ sessionStatus: 'anonymous', error: errorMessage(err) });
      }
    },

    requestCode: async (phone) => {
      const res = await run(() => authApi.requestOtp(phone, 'passenger'));
      return res ? res.debugOtp ?? '' : null;
    },

    login: async (phone, code) => {
      const res = await run(() => authApi.verifyOtp(phone, code));
      if (!res) return false;
      if (res.user.role !== 'passenger') {
        set({ error: 'Este telefone não pertence a um passageiro VOZTRI.' });
        return false;
      }
      await session.save(res.token);
      await startSession(res.user);
      return true;
    },

    logout: async () => {
      // Antes de limpar a sessão: o DELETE /devices precisa do token da API
      await disablePush();
      await session.clear();
      set({ ...signedOut });
    },

    locateOrigin: () => {
      if (locating) return locating;
      locating = (async () => {
        set({ originSource: 'locating', originWarning: null });
        const permission = await requestLocationPermission();
        if (permission !== 'granted') {
          set({
            origin: DEFAULT_ORIGIN,
            originSource: 'fallback',
            originAccuracy: null,
            originWarning:
              permission === 'blocked'
                ? 'Localização bloqueada nas configurações do aparelho.'
                : 'Sem permissão de localização.',
          });
          return;
        }
        try {
          const position = await getCurrentPosition();
          const coords = `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
          set({
            origin: {
              // Sem geocodificação reversa ainda: o endereço é a coordenada
              address: `Localização GPS (${coords})`,
              shortAddress: 'Sua localização atual',
              latitude: position.latitude,
              longitude: position.longitude,
            },
            originSource: 'gps',
            originAccuracy: position.accuracy,
            originWarning: null,
          });
        } catch (err) {
          set({
            origin: DEFAULT_ORIGIN,
            originSource: 'fallback',
            originAccuracy: null,
            originWarning: err instanceof LocationError ? err.message : 'Não foi possível obter a localização.',
          });
        }
      })().finally(() => {
        locating = null;
      });
      return locating;
    },

    setStep: (step) => set({ currentStep: step }),

    setDestination: async (destination) => {
      set({ destination, currentStep: 'SELECT_CATEGORY' });
      // A estimativa precisa da origem final (GPS ainda sendo lido)
      if (locating) await locating;
      await get().loadEstimates();
    },

    loadEstimates: async () => {
      const { origin, destination } = get();
      if (!destination) return;
      set({ estimatesLoading: true, error: null });
      try {
        const estimates = await rideApi.getEstimates(origin, destination);
        set({ estimates });
      } catch (err) {
        set({ estimates: [], error: errorMessage(err) });
      } finally {
        set({ estimatesLoading: false });
      }
    },

    selectCategory: (category) => set({ selectedCategory: category }),

    selectPaymentMethod: (method) => set({ selectedPaymentMethod: method }),

    confirmRideRequest: async () => {
      const { origin, destination, selectedCategory, selectedPaymentMethod } = get();
      if (!destination) return;
      set({ busy: true, error: null });
      try {
        const ride = await rideApi.requestRide({
          origin,
          destination,
          category: selectedCategory,
          paymentMethod: selectedPaymentMethod,
        });
        await activeRideMemory.save(ride.id);
        set({ chatMessages: [], isSosActive: false });
        await applyRide(ride);
      } catch (err) {
        // Já existe uma corrida em andamento: retoma o acompanhamento dela
        const existing = apiErrorCode(err) === 'RIDE_ALREADY_ACTIVE' ? errorBody<{ ride: Ride }>(err)?.ride : null;
        if (existing) {
          await activeRideMemory.save(existing.id);
          await applyRide(existing);
        } else {
          set({ error: errorMessage(err) });
        }
      } finally {
        set({ busy: false });
      }
    },

    refreshRide: async () => {
      const ride = get().activeRide;
      if (!ride) return;
      try {
        const updated = await rideApi.getRide(ride.id);
        set({ connectionError: null });
        await applyRide(updated);
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    onRidePush: async (rideId) => {
      if (get().sessionStatus !== 'authenticated') return;
      const current = get().activeRide;
      if (current?.id === rideId) {
        await get().refreshRide();
        return;
      }
      // Aviso de outra corrida (antiga) com uma em andamento: ignora
      if (current) return;
      // Sem corrida na tela (ex.: app aberto pela notificação): passa a acompanhar esta
      try {
        const ride = await rideApi.getRide(rideId);
        if (get().activeRide || !OPEN_STATUSES.includes(ride.status)) return;
        await activeRideMemory.save(ride.id);
        set({ activeRide: ride, currentStep: stepForStatus(ride.status), connectionError: null });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    cancelActiveRide: async (reason) => {
      const ride = get().activeRide;
      if (!ride) return;
      const res = await run(() => rideApi.cancelRide(ride.id, reason));
      if (res) {
        await activeRideMemory.clear();
        set({ ...tripReset });
      }
    },

    loadChat: async () => {
      const ride = get().activeRide;
      if (!ride) return;
      try {
        const chatMessages = await rideApi.getChatMessages(ride.id);
        set({ chatMessages });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    sendChat: async (text) => {
      const ride = get().activeRide;
      if (!ride) return;
      const msg = await run(() => rideApi.sendChatMessage(ride.id, text));
      if (msg) set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
    },

    triggerSos: async () => {
      const ride = get().activeRide;
      if (!ride) return;
      // Posição atual do GPS; sem ela, o último ponto conhecido (o embarque)
      let lat = ride.origin.latitude ?? get().origin.latitude;
      let lng = ride.origin.longitude ?? get().origin.longitude;
      try {
        const now = await getCurrentPosition();
        lat = now.latitude;
        lng = now.longitude;
      } catch {
        // segue com o embarque: o alerta não pode deixar de ser enviado
      }
      const res = await run(() => rideApi.triggerSos(ride.id, lat, lng));
      if (res) set({ isSosActive: true });
    },

    cancelSos: async (pin) => {
      const ride = get().activeRide;
      if (!ride) return false;
      set({ busy: true, error: null });
      try {
        await rideApi.cancelSos(ride.id, pin);
        set({ isSosActive: false });
        return true;
      } catch (err) {
        if (apiErrorCode(err) !== 'INVALID_EMERGENCY_PIN') set({ error: errorMessage(err) });
        return false;
      } finally {
        set({ busy: false });
      }
    },

    finishRideEvaluation: async ({ rating, tipCents, tags }) => {
      const ride = get().activeRide;
      if (ride) {
        set({ busy: true, error: null });
        try {
          await billingApi.submitRating({ rideId: ride.id, rating, tipCents, tags });
        } catch (err) {
          // Avaliação repetida não impede de seguir; outros erros ficam visíveis
          if (apiErrorCode(err) !== 'ALREADY_RATED') {
            set({ busy: false, error: errorMessage(err) });
            return;
          }
        }
      }
      await activeRideMemory.clear();
      set({ ...tripReset, busy: false });
    },

    dismissError: () => set({ error: null }),
  };
});
