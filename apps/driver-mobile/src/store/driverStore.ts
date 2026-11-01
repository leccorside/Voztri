import { create } from 'zustand';
import type { DriverEarningsSummary, DriverRideOffer, Ride, User } from '@voztri/shared-types';
import { apiErrorCode, authApi, billingApi, driverApi, errorMessage, onUnauthorized, rideApi, session } from '../api.js';

export type SessionStatus = 'checking' | 'anonymous' | 'authenticated';

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

  bootstrap: () => Promise<void>;
  requestCode: (phone: string) => Promise<string | null>;
  login: (phone: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;

  refresh: () => Promise<void>;
  refreshEarnings: () => Promise<void>;
  toggleOnline: () => Promise<void>;
  acceptOffer: () => Promise<void>;
  rejectOffer: () => Promise<void>;
  validatePin: (pin: string) => Promise<boolean>;
  completeRide: () => Promise<boolean>;
  requestPayout: () => Promise<number | null>;
  dismissError: () => void;
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
    await Promise.all([get().refresh(), get().refreshEarnings()]);
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
      const res = await run(() => driverApi.setOnlineStatus(!get().isOnline));
      if (res) {
        set({ isOnline: res.isOnline, offer: res.isOnline ? get().offer : null });
      }
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
