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

export type SessionStatus = 'checking' | 'anonymous' | 'authenticated';

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
  /** Origem fixa enquanto o app não lê o GPS do aparelho. */
  origin: AddressLocation;
  destination: AddressLocation | null;
  estimates: FareEstimate[];
  estimatesLoading: boolean;
  selectedCategory: Category;
  selectedPaymentMethod: PaymentMethodType;
  activeRide: Ride | null;
  chatMessages: ChatMessage[];
  isSosActive: boolean;

  busy: boolean;
  error: string | null;
  connectionError: string | null;

  bootstrap: () => Promise<void>;
  requestCode: (phone: string) => Promise<string | null>;
  login: (phone: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;

  setStep: (step: PassengerFlowStep) => void;
  setDestination: (destination: AddressLocation) => Promise<void>;
  loadEstimates: () => Promise<void>;
  selectCategory: (category: Category) => void;
  selectPaymentMethod: (method: PaymentMethodType) => void;
  confirmRideRequest: () => Promise<void>;
  refreshRide: () => Promise<void>;
  cancelActiveRide: (reason: string) => Promise<void>;
  loadChat: () => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  triggerSos: () => Promise<void>;
  cancelSos: (pin: string) => Promise<boolean>;
  finishRideEvaluation: (evaluation: { rating: number; tipCents?: number; tags?: string[] }) => Promise<void>;
  dismissError: () => void;
}

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
  selectedCategory: 'pop' as Category,
  selectedPaymentMethod: 'pix' as PaymentMethodType,
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

  const startSession = async (user: User) => {
    set({ ...signedOut, sessionStatus: 'authenticated', user });
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
      await session.clear();
      set({ ...signedOut });
    },

    setStep: (step) => set({ currentStep: step }),

    setDestination: async (destination) => {
      set({ destination, currentStep: 'SELECT_CATEGORY' });
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
      // Sem GPS no app, envia a última posição conhecida: o embarque da corrida
      const lat = ride.origin.latitude ?? get().origin.latitude;
      const lng = ride.origin.longitude ?? get().origin.longitude;
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
