import { create } from 'zustand';
import type {
  CnhCategory,
  DriverEarningsSummary,
  DriverRegistration,
  DriverRideOffer,
  Ride,
  SelfServiceVehicleCategory,
  User,
} from '@voztri/shared-types';
import type { PickedPhoto, ProfileFields, ProfileSaveResult } from '@voztri/mobile-core';
import {
  apiErrorCode,
  authApi,
  billingApi,
  driverApi,
  errorMessage,
  fieldErrors,
  onUnauthorized,
  rideApi,
  session,
} from '../api.js';
import { LOCATION_HEARTBEAT_MS, LOCATION_SEND_DISTANCE_M, LOCATION_SEND_INTERVAL_MS } from '../config.js';
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

/** Resultado de uma etapa do cadastro: ok, ou a mensagem geral e as mensagens por campo (422). */
export type RegistrationSaveResult = { ok: true } | { ok: false; message: string; fields: Record<string, string> };

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
  /**
   * Leitura segurada pelo intervalo mínimo (ou cujo envio falhou), enviada quando
   * o intervalo vence. Parado, o GPS do JS (filtro de 25 m) não entrega leitura
   * nova: sem isso, a última posição antes de parar podia nunca chegar à API (e a
   * chegada automática ao embarque não aconteceria no modo foreground-only).
   */
  pendingLocation: DevicePosition | null;
  backgroundMode: BackgroundMode;
  backgroundPermission: BackgroundPermission;
  /** O aviso sobre a localização em segundo plano já apareceu nesta sessão. */
  backgroundPromptShown: boolean;
  /** Push de novas ofertas (off: ainda não ativado nesta sessão). */
  pushStatus: PushStatus | 'off';
  /** Cadastro pelo app (só carregado enquanto o motorista está em `registering`). */
  registration: DriverRegistration | null;

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
  /** Salva nome e e-mail (só os alterados); erros por campo voltam para a tela. */
  updateProfile: (changes: Partial<ProfileFields>) => Promise<ProfileSaveResult>;
  /** Envia ou troca a foto do perfil; devolve null ou a mensagem de erro. */
  uploadAvatar: (photo: PickedPhoto) => Promise<string | null>;
  /** Tira a foto do perfil; devolve null ou a mensagem de erro. */
  removeAvatar: () => Promise<string | null>;
  /** Exclui a conta e encerra a sessão; devolve null ou a mensagem de erro. */
  deleteAccount: (confirmation: string) => Promise<string | null>;
  loadRegistration: () => Promise<void>;
  /** Etapa "Dados pessoais" do cadastro (data em AAAA-MM-DD). */
  savePersonalData: (data: { name: string; cpf: string; birthDate: string; email: string | null }) => Promise<RegistrationSaveResult>;
  /** Etapa "CNH" do cadastro (validade em AAAA-MM-DD). */
  saveCnh: (data: { number: string; category: CnhCategory; expiresAt: string; hasEar: boolean }) => Promise<RegistrationSaveResult>;
  /** Etapa "Veículo" do cadastro. */
  saveVehicle: (data: {
    brand: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    renavam: string;
    category: SelfServiceVehicleCategory;
  }) => Promise<RegistrationSaveResult>;

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
  pendingLocation: null,
  backgroundMode: 'off' as BackgroundMode,
  backgroundPermission: 'unknown' as BackgroundPermission,
  backgroundPromptShown: false,
  pushStatus: 'off' as PushStatus | 'off',
  registration: null as DriverRegistration | null,
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

  // Timer do envio pendente. Sempre recriado (nunca reaproveitado), para um handle
  // velho não impedir o agendamento; o disparo confere sessão, turno e modo.
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  // Batimento: parado, o GPS do JS (filtro de 25 m) não entrega leitura nova, então um timer
  // reenvia a última posição para o last_location_at não envelhecer no despacho
  let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  /** Cancela os envios agendados (pendente e batimento): offline, logout, modo nativo. */
  const cancelPending = () => {
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = null;
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
    if (get().pendingLocation) set({ pendingLocation: null });
  };

  /** Reenvia a posição atual daqui a LOCATION_HEARTBEAT_MS, se nada for enviado antes. */
  const scheduleHeartbeat = () => {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      heartbeatTimer = null;
      const position = get().lastPosition;
      // O reportPosition confere sessão, turno e modo; passado o batimento, o envio é devido
      if (position) void get().reportPosition(position);
    }, LOCATION_HEARTBEAT_MS);
  };

  /** Guarda a leitura e envia daqui a `delayMs` (a mais nova substitui a anterior). */
  const schedulePending = (position: DevicePosition, delayMs: number) => {
    if (pendingTimer) clearTimeout(pendingTimer);
    set({ pendingLocation: position });
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      const pending = get().pendingLocation;
      if (!pending) return;
      set({ pendingLocation: null });
      void get().reportPosition(pending);
    }, Math.max(500, delayMs));
  };

  const startSession = async (user: User) => {
    cancelPending();
    set({ ...signedOut, sessionStatus: 'authenticated', user });
    // Push em paralelo: avisa de novas ofertas com o app em segundo plano; com o app
    // aberto (ou ao tocar na notificação) só antecipa o polling.
    void enablePush(() => {
      if (get().sessionStatus === 'authenticated') void get().refresh();
    }).then((pushStatus) => {
      if (get().user?.id === user.id) set({ pushStatus });
    });
    // Cadastro em andamento: o app mostra as etapas no lugar do painel (sem ofertas nem ganhos)
    if (user.driverStatus === 'registering') {
      await get().loadRegistration();
      return;
    }
    await Promise.all([get().refresh(), get().refreshEarnings()]);
  };

  /** Salva uma etapa do cadastro e guarda a situação nova (nome e CPF também no usuário). */
  const saveStep = async (action: () => Promise<DriverRegistration>): Promise<RegistrationSaveResult> => {
    set({ busy: true, error: null });
    try {
      const registration = await action();
      const user = get().user;
      const personal = registration.steps.personal.data;
      set({
        registration,
        user: user ? { ...user, name: personal.name, cpf: personal.cpf, email: personal.email, driverStatus: registration.status } : user,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorMessage(err), fields: fieldErrors(err) as Record<string, string> };
    } finally {
      set({ busy: false });
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
        cancelPending();
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
      cancelPending();
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
        cancelPending();
        set({ locationStatus: 'off', locationWarning: null, lastSentLocation: null });
      }
    },

    reportPosition: async (position, force = false) => {
      set({ lastPosition: position, locationStatus: 'tracking', locationWarning: null });
      if (!get().isOnline || get().sessionStatus !== 'authenticated') return cancelPending();
      // Com o serviço nativo ativo, ele é quem envia (inclusive em segundo plano)
      if (get().backgroundMode === 'native') return cancelPending();

      const now = Date.now();
      const lastSent = get().lastSentLocation;
      const due =
        force ||
        !lastSent ||
        now - lastSent.at >= LOCATION_SEND_INTERVAL_MS ||
        distanceMeters(lastSent.position, position) >= LOCATION_SEND_DISTANCE_M;
      if (!due) {
        // Segura a leitura e envia quando o intervalo vencer (a última antes de parar)
        schedulePending(position, LOCATION_SEND_INTERVAL_MS - (now - lastSent!.at));
        return;
      }

      cancelPending();
      set({ lastSentLocation: { at: now, position } });
      scheduleHeartbeat();
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
        // Tenta de novo na próxima leitura ou, se nenhuma chegar (parado), daqui a um intervalo
        set({ lastSentLocation: null, connectionError: errorMessage(err) });
        if (!get().pendingLocation) schedulePending(position, LOCATION_SEND_INTERVAL_MS);
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

    setBackgroundMode: (mode) => {
      if (mode === 'native' || mode === 'off') cancelPending();
      set({ backgroundMode: mode });
    },

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

    uploadAvatar: async (photo) => {
      try {
        const avatarUrl = await authApi.uploadAvatar(photo);
        const user = get().user;
        if (user) set({ user: { ...user, avatarUrl } });
        return null;
      } catch (err) {
        return fieldErrors(err).photo ?? errorMessage(err);
      }
    },

    removeAvatar: async () => {
      try {
        await authApi.removeAvatar();
        const user = get().user;
        if (user) set({ user: { ...user, avatarUrl: null } });
        return null;
      } catch (err) {
        return errorMessage(err);
      }
    },

    loadRegistration: async () => {
      try {
        set({ registration: await driverApi.getRegistration(), connectionError: null });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    savePersonalData: (data) => saveStep(() => driverApi.savePersonalData(data)),

    saveCnh: (data) => saveStep(() => driverApi.saveCnh(data)),

    saveVehicle: (data) => saveStep(() => driverApi.saveVehicle(data)),

    deleteAccount: async (confirmation) => {
      try {
        await authApi.deleteAccount(confirmation);
      } catch (err) {
        return fieldErrors(err).confirmation ?? errorMessage(err);
      }
      // A API já tirou o motorista do ar e apagou aparelhos e tokens: sem chamar a API
      // de novo, só invalida o token no Firebase e limpa a sessão local
      void disablePush({ revoke: true });
      await session.clear();
      cancelPending();
      set({ ...signedOut });
      return null;
    },

    updateProfile: async (changes) => {
      set({ busy: true, error: null });
      try {
        const updated = await authApi.updateProfile(changes);
        set({ user: { ...get().user, ...updated } as User });
        return { ok: true };
      } catch (err) {
        return { ok: false, message: errorMessage(err), fields: fieldErrors(err) };
      } finally {
        set({ busy: false });
      }
    },
  };
});
