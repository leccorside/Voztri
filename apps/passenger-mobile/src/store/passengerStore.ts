import { create } from 'zustand';
import type { AddressLocation, ChatMessage, FareEstimate, PaymentMethodType, Ride, RideStatus, User } from '@voztri/shared-types';
import type { RecentDestination, SavedPlaceKind, SavedPlaces, TrustedContact } from '@voztri/api-client';
import type { PickedPhoto, ProfileFields, ProfileSaveResult } from '@voztri/mobile-core';
import {
  activeRideMemory,
  passengerApi,
  placesApi,
  geoApi,
  apiErrorCode,
  authApi,
  billingApi,
  errorBody,
  errorMessage,
  fieldErrors,
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
  /**
   * Corrida cuja busca terminou sem motorista (NO_DRIVER_AVAILABLE). A tela de
   * busca mostra o aviso e oferece refazer a solicitação com os mesmos dados.
   */
  noDriverRide: Ride | null;
  chatMessages: ChatMessage[];
  isSosActive: boolean;
  /** Casa e Trabalho da conta (null: ainda não carregados ou falha ao carregar). */
  savedPlaces: SavedPlaces | null;
  /** Com um tipo, a tela de busca escolhe o endereço desse tipo em vez do destino. */
  placePicker: SavedPlaceKind | null;
  /** Últimos destinos da conta, mostrados na busca antes de digitar. */
  recentDestinations: RecentDestination[];
  /** Troca do PIN de emergência aberta (a definição inicial depende só do user). */
  changingPin: boolean;
  /** Tela "Meu perfil" aberta. */
  profileOpen: boolean;
  /** Tela "Segurança" (contatos de confiança e troca do PIN) aberta. */
  safetyOpen: boolean;
  /** Contatos de confiança (null: ainda não carregados ou falha ao carregar). */
  trustedContacts: TrustedContact[] | null;
  /** Quantos contatos de confiança recebem o SMS do SOS ativo (null: sem SOS acionado). */
  sosContactsNotified: number | null;
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
  loadSavedPlaces: () => Promise<void>;
  /** Abre a busca para escolher o endereço de Casa ou do Trabalho. */
  openPlacePicker: (kind: SavedPlaceKind) => void;
  /** Salva o endereço do tipo e volta ao início. */
  savePlace: (kind: SavedPlaceKind, place: AddressLocation) => Promise<boolean>;
  removePlace: (kind: SavedPlaceKind) => Promise<boolean>;
  /** Busca o histórico na API (a cada abertura da busca: a última corrida entra nele). */
  loadRecentDestinations: () => Promise<void>;
  removeRecentDestination: (id: string) => Promise<boolean>;
  clearRecentDestinations: () => Promise<boolean>;
  setDestination: (destination: AddressLocation) => Promise<void>;
  loadEstimates: () => Promise<void>;
  selectCategory: (category: Category) => void;
  selectPaymentMethod: (method: PaymentMethodType) => void;
  confirmRideRequest: () => Promise<void>;
  refreshRide: () => Promise<void>;
  /** Refaz a solicitação da busca encerrada (mesma origem, destino, categoria e pagamento). */
  retrySearch: () => Promise<void>;
  /** Sai do aviso de busca sem motorista e volta ao início. */
  dismissNoDriver: () => void;
  /** Chegou um push sobre a corrida (app aberto ou toque na notificação). */
  onRidePush: (rideId: string) => Promise<void>;
  cancelActiveRide: (reason: string) => Promise<void>;
  loadChat: () => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  triggerSos: () => Promise<void>;
  /** Desativa o SOS com o PIN de emergência; devolve null ou a mensagem de erro. */
  cancelSos: (pin: string) => Promise<string | null>;
  /**
   * Define (primeira vez) ou troca o PIN de emergência (para trocar, o atual);
   * devolve null ou a mensagem de erro, mostrada na própria tela do PIN.
   */
  saveEmergencyPin: (pin: string, currentPin?: string) => Promise<string | null>;
  /** Abre ou fecha a troca do PIN de emergência (tela Segurança). */
  setChangingPin: (open: boolean) => void;
  /** Abre ou fecha a tela Segurança (menu da conta); ao abrir, carrega os contatos. */
  setSafetyOpen: (open: boolean) => void;
  loadTrustedContacts: () => Promise<void>;
  /** Cadastra um contato; erros por campo voltam para a tela. */
  addTrustedContact: (
    name: string,
    phone: string,
  ) => Promise<{ ok: true } | { ok: false; message: string; fields: Partial<Record<'name' | 'phone', string>> }>;
  /** Remove um contato; devolve null ou a mensagem de erro. */
  removeTrustedContact: (id: string) => Promise<string | null>;
  /** Salva nome e e-mail (só os alterados); erros por campo voltam para a tela. */
  updateProfile: (changes: Partial<ProfileFields>) => Promise<ProfileSaveResult>;
  /** Abre ou fecha "Meu perfil" (menu da conta). */
  setProfileOpen: (open: boolean) => void;
  /** Envia ou troca a foto do perfil; devolve null ou a mensagem de erro. */
  uploadAvatar: (photo: PickedPhoto) => Promise<string | null>;
  /** Tira a foto do perfil; devolve null ou a mensagem de erro. */
  removeAvatar: () => Promise<string | null>;
  /** Exclui a conta e encerra a sessão; devolve null ou a mensagem de erro. */
  deleteAccount: (confirmation: string) => Promise<string | null>;
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

const WRONG_PIN_MESSAGE = 'PIN incorreto! Verifique e tente novamente.';
const DRIVER_CANCELLED_MESSAGE ='O motorista cancelou a corrida. Peça um novo motorista quando quiser.';
/** A API encerra a busca depois de 3 min sem motorista (NO_DRIVER_AVAILABLE). */
const NO_DRIVER_MESSAGE = 'Nenhum motorista disponível no momento. Tente de novo em instantes.';
/** Quanto a solicitação espera o endereço do embarque antes de seguir com a coordenada. */
export const ORIGIN_NAMING_WAIT_MS = 2500;

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
  noDriverRide: null,
  chatMessages: [],
  isSosActive: false,
  sosContactsNotified: null as number | null,
};

const signedOut = {
  ...tripReset,
  sessionStatus: 'anonymous' as SessionStatus,
  user: null,
  origin: DEFAULT_ORIGIN,
  originSource: 'fallback' as OriginSource,
  originAccuracy: null,
  originWarning: null,
  savedPlaces: null as SavedPlaces | null,
  placePicker: null as SavedPlaceKind | null,
  recentDestinations: [] as RecentDestination[],
  selectedCategory: 'pop' as Category,
  selectedPaymentMethod: 'pix' as PaymentMethodType,
  changingPin: false,
  profileOpen: false,
  safetyOpen: false,
  trustedContacts: null as TrustedContact[] | null,
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
    if (ride.status === 'NO_DRIVER_AVAILABLE') {
      // Fica na tela de busca, com o aviso e o "Tentar de novo"
      await activeRideMemory.clear();
      set({ ...tripReset, currentStep: 'SEARCHING', noDriverRide: ride, error: null });
      return;
    }
    if (ride.status === 'CANCELLED') {
      await activeRideMemory.clear();
      const byMe = get().activeRide === null;
      set({ ...tripReset, error: byMe ? null : 'A corrida foi cancelada.' });
      return;
    }
    set({ activeRide: ride, currentStep: stepForStatus(ride.status), noDriverRide: null });
  };

  /** Solicita a corrida e passa a acompanhá-la (ou retoma a que já estava ativa). */
  const requestWith = async (params: Parameters<typeof rideApi.requestRide>[0]) => {
    set({ busy: true, error: null });
    try {
      const ride = await rideApi.requestRide(params);
      await activeRideMemory.save(ride.id);
      set({ chatMessages: [], isSosActive: false, sosContactsNotified: null });
      await applyRide(ride);
    } catch (err) {
      // Já existe uma corrida em andamento: retoma o acompanhamento dela
      const existing = apiErrorCode(err) === 'RIDE_ALREADY_ACTIVE' ? errorBody<{ ride: Ride }>(err)?.ride : null;
      if (existing) {
        await activeRideMemory.save(existing.id);
        await applyRide(existing);
      } else if (apiErrorCode(err) === 'EMERGENCY_PIN_REQUIRED') {
        // Conta sem PIN (ex.: de antes da mudança): a tela de definição aparece no lugar,
        // com a explicação; depois de salvar, a escolha da categoria continua onde estava
        const user = get().user;
        set({ user: user ? { ...user, hasEmergencyPin: false } : user });
      } else {
        set({ error: errorMessage(err) });
      }
    } finally {
      set({ busy: false });
    }
  };

  // Leitura do GPS em andamento (escolher o destino espera por ela)
  let locating: Promise<void> | null = null;
  // Geocodificação reversa do embarque em andamento (a solicitação espera um pouco por ela)
  let naming: Promise<void> | null = null;

  /**
   * Troca a coordenada do embarque pelo endereço (API → Photon). Só aplica se o
   * embarque ainda for esta leitura do GPS; sem endereço ou com falha, fica a coordenada.
   */
  const nameOrigin = (latitude: number, longitude: number) => {
    // Dentro de uma promise: nenhum erro da geocodificação (nem síncrono) afeta o GPS
    naming = Promise.resolve()
      .then(() => geoApi.reverse(latitude, longitude))
      .then((place) => {
        const { origin, originSource } = get();
        if (originSource !== 'gps' || origin.latitude !== latitude || origin.longitude !== longitude) return;
        set({
          origin: {
            ...origin,
            address: place.address,
            shortAddress: place.shortAddress,
            ...(place.city ? { city: place.city } : {}),
            ...(place.state ? { state: place.state } : {}),
          },
        });
      })
      .catch(() => undefined)
      .finally(() => {
        naming = null;
      });
  };

  /** Espera o endereço do embarque por até ORIGIN_NAMING_WAIT_MS. */
  const waitForOriginName = async () => {
    const pending = naming;
    if (!pending) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([pending, new Promise<void>((resolve) => (timer = setTimeout(resolve, ORIGIN_NAMING_WAIT_MS)))]);
    if (timer) clearTimeout(timer);
  };

  const startSession = async (user: User) => {
    set({ ...signedOut, sessionStatus: 'authenticated', user });
    void get().locateOrigin();
    void get().loadSavedPlaces();
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
              // Na hora, a coordenada; o endereço chega pela geocodificação reversa
              address: `Localização GPS (${coords})`,
              shortAddress: 'Sua localização atual',
              latitude: position.latitude,
              longitude: position.longitude,
            },
            originSource: 'gps',
            originAccuracy: position.accuracy,
            originWarning: null,
          });
          nameOrigin(position.latitude, position.longitude);
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

    // Sair da busca encerra a escolha de Casa/Trabalho
    setStep: (step) => set({ currentStep: step, ...(step !== 'DESTINATION' ? { placePicker: null } : {}) }),

    loadSavedPlaces: async () => {
      try {
        const savedPlaces = await placesApi.list();
        if (get().sessionStatus === 'authenticated') set({ savedPlaces });
      } catch {
        // Sem os endereços salvos, os atalhos só oferecem "Adicionar"; nada a avisar
      }
    },

    openPlacePicker: (kind) => set({ placePicker: kind, currentStep: 'DESTINATION' }),

    savePlace: async (kind, place) => {
      const savedPlaces = await run(() => placesApi.save(kind, place));
      if (!savedPlaces) return false; // erro no banner; continua na busca para tentar de novo
      set({ savedPlaces, placePicker: null, currentStep: 'HOME' });
      return true;
    },

    removePlace: async (kind) => {
      const done = await run(async () => {
        await placesApi.remove(kind);
        return true;
      });
      if (!done) return false;
      const current = get().savedPlaces;
      set({
        savedPlaces: { home: current?.home ?? null, work: current?.work ?? null, [kind]: null },
        placePicker: null,
        currentStep: 'HOME',
      });
      return true;
    },

    loadRecentDestinations: async () => {
      try {
        const recentDestinations = await placesApi.recent();
        if (get().sessionStatus === 'authenticated') set({ recentDestinations });
      } catch {
        // Sem o histórico, a busca só pede para digitar; nada a avisar
      }
    },

    removeRecentDestination: async (id) => {
      const done = await run(async () => {
        await placesApi.removeRecent(id);
        return true;
      });
      if (!done) return false;
      set({ recentDestinations: get().recentDestinations.filter((r) => r.id !== id) });
      return true;
    },

    clearRecentDestinations: async () => {
      const done = await run(async () => {
        await placesApi.clearRecent();
        return true;
      });
      if (!done) return false; // erro no aviso; a lista continua
      set({ recentDestinations: [] });
      return true;
    },

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
      if (!get().destination) return;
      // O motorista vê o endereço do embarque: espera a geocodificação por um instante
      await waitForOriginName();
      const { origin, destination, selectedCategory, selectedPaymentMethod } = get();
      if (!destination) return;
      await requestWith({ origin, destination, category: selectedCategory, paymentMethod: selectedPaymentMethod });
    },

    retrySearch: async () => {
      const failed = get().noDriverRide;
      if (!failed || get().busy) return;
      // Mesmos dados da busca encerrada; em caso de erro, o aviso e o botão continuam na tela
      set({ destination: failed.destination, selectedCategory: failed.category, selectedPaymentMethod: failed.paymentMethod });
      await requestWith({
        origin: failed.origin,
        destination: failed.destination,
        category: failed.category,
        paymentMethod: failed.paymentMethod,
      });
    },

    dismissNoDriver: () => set({ ...tripReset }),

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
        if (get().activeRide) return;
        if (ride.status === 'NO_DRIVER_AVAILABLE') {
          await activeRideMemory.clear();
          // Na tela inicial, abre o aviso com o "Tentar de novo"; no meio de outro fluxo, só avisa
          if (get().currentStep === 'HOME') {
            set({ ...tripReset, currentStep: 'SEARCHING', noDriverRide: ride, connectionError: null });
          } else {
            set({ error: NO_DRIVER_MESSAGE, connectionError: null });
          }
          return;
        }
        if (ride.status === 'CANCELLED') {
          // Só o cancelamento pelo motorista gera push: explica por que a corrida sumiu
          await activeRideMemory.clear();
          set({ error: DRIVER_CANCELLED_MESSAGE, connectionError: null });
          return;
        }
        // Concluída: o aviso convida a avaliar (avaliação repetida é tratada no envio)
        if (!OPEN_STATUSES.includes(ride.status) && ride.status !== 'COMPLETED') return;
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
      if (res) set({ isSosActive: true, sosContactsNotified: res.trustedContactsNotified ?? 0 });
    },

    cancelSos: async (pin) => {
      const ride = get().activeRide;
      if (!ride) return 'Nenhuma corrida em andamento.';
      set({ busy: true, error: null });
      try {
        await rideApi.cancelSos(ride.id, pin);
        set({ isSosActive: false, sosContactsNotified: null });
        return null;
      } catch (err) {
        // Mostrado no próprio modal do SOS (o aviso geral fica atrás dele)
        return apiErrorCode(err) === 'INVALID_EMERGENCY_PIN' ? WRONG_PIN_MESSAGE : errorMessage(err);
      } finally {
        set({ busy: false });
      }
    },

    saveEmergencyPin: async (pin, currentPin) => {
      set({ busy: true, error: null });
      try {
        await passengerApi.setEmergencyPin(pin, currentPin);
        const user = get().user;
        set({ user: user ? { ...user, hasEmergencyPin: true } : user, changingPin: false });
        return null;
      } catch (err) {
        return apiErrorCode(err) === 'INVALID_EMERGENCY_PIN' ? 'PIN atual incorreto.' : errorMessage(err);
      } finally {
        set({ busy: false });
      }
    },

    setChangingPin: (open) => set({ changingPin: open }),

    setSafetyOpen: (open) => {
      set({ safetyOpen: open });
      if (open) void get().loadTrustedContacts();
    },

    loadTrustedContacts: async () => {
      try {
        set({ trustedContacts: await passengerApi.listTrustedContacts() });
      } catch (err) {
        set({ connectionError: errorMessage(err) });
      }
    },

    addTrustedContact: async (name, phone) => {
      try {
        const contact = await passengerApi.addTrustedContact({ name, phone });
        set({ trustedContacts: [...(get().trustedContacts ?? []), contact] });
        return { ok: true };
      } catch (err) {
        const fields = fieldErrors(err);
        return {
          ok: false,
          message: errorMessage(err),
          fields: { ...(fields.name ? { name: fields.name } : {}), ...(fields.phone ? { phone: fields.phone } : {}) },
        };
      }
    },

    removeTrustedContact: async (id) => {
      try {
        set({ trustedContacts: await passengerApi.removeTrustedContact(id) });
        return null;
      } catch (err) {
        return errorMessage(err);
      }
    },

    updateProfile: async (changes) => {
      set({ busy: true, error: null });
      try {
        const updated = await authApi.updateProfile(changes);
        // A resposta não traz tudo do /auth/me: mantém o que já se sabia (ex.: o PIN)
        set({ user: { ...get().user, ...updated } as User });
        return { ok: true };
      } catch (err) {
        return { ok: false, message: errorMessage(err), fields: fieldErrors(err) };
      } finally {
        set({ busy: false });
      }
    },

    setProfileOpen: (open) => set({ profileOpen: open }),

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

    deleteAccount: async (confirmation) => {
      try {
        await authApi.deleteAccount(confirmation);
      } catch (err) {
        return fieldErrors(err).confirmation ?? errorMessage(err);
      }
      // A API já apagou os aparelhos e os tokens: sem DELETE /devices, só invalida o
      // token no Firebase; a sessão local (e a corrida guardada) sai junto
      void disablePush({ revoke: true });
      await session.clear();
      set({ ...signedOut });
      return null;
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
