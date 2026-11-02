import React from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { ChatMessage, FareEstimate, Ride } from '@voztri/shared-types';
import { App } from '../src/App';
import { usePassengerStore } from '../src/store/passengerStore';
import * as api from '../src/api';
import * as location from '../src/location';
import * as push from '../src/push';
import { serverClock } from '../src/serverClock';
import {
  advanceAsync,
  expectNoStrayText,
  findStrayText,
  pressAsync,
  settle,
  typeAsync,
  useTestTimers,
  visibleText,
} from './rnTree';

jest.mock('../src/api', () => ({
  session: { load: jest.fn(), save: jest.fn(), clear: jest.fn() },
  activeRideMemory: { load: jest.fn(), save: jest.fn(), clear: jest.fn() },
  onUnauthorized: jest.fn(),
  authApi: {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getMe: jest.fn(),
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    deleteAccount: jest.fn(),
  },
  // Como o real: caminho da API ganha a origem; endereço completo fica igual
  mediaUrl: (url: string | null | undefined) => (!url ? null : url.startsWith('/') ? `http://api.test${url}` : url),
  currentToken: () => 'token-salvo',
  geoApi: { reverse: jest.fn(), search: jest.fn() },
  placesApi: { list: jest.fn(), save: jest.fn(), remove: jest.fn(), recent: jest.fn(), removeRecent: jest.fn(), clearRecent: jest.fn() },
  passengerApi: { setEmergencyPin: jest.fn() },
  rideApi: {
    getEstimates: jest.fn(),
    requestRide: jest.fn(),
    getRide: jest.fn(),
    cancelRide: jest.fn(),
    getChatMessages: jest.fn(),
    sendChatMessage: jest.fn(),
    triggerSos: jest.fn(),
    cancelSos: jest.fn(),
  },
  billingApi: { submitRating: jest.fn() },
  apiErrorCode: (err: { code?: string }) => err?.code ?? null,
  errorBody: (err: { body?: unknown }) => err?.body ?? null,
  errorMessage: (err: { message?: string }) => err?.message ?? 'Erro',
  fieldErrors: (err: { fields?: Record<string, string> }) => err?.fields ?? {},
}));

// Push simulado: o teste guarda o callback para "entregar" uma mensagem
jest.mock('../src/push', () => ({
  enablePush: jest.fn(),
  disablePush: jest.fn(),
  registerBackgroundHandler: jest.fn(),
}));

// GPS e permissões simulados
jest.mock('../src/location', () => {
  class LocationError extends Error {
    readonly code: string;
    constructor(message: string, errorCode: string) {
      super(message);
      this.code = errorCode;
    }
  }
  return {
    LocationError,
    distanceMeters: jest.requireActual('../src/geo').distanceMeters,
    requestLocationPermission: jest.fn(),
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
  };
});

const gpsAt = (latitude: number, longitude: number) => ({ latitude, longitude, accuracy: 12, heading: null, speed: null, timestamp: 0 });

type Mocks<K extends string> = Record<K, jest.Mock>;
const m = api as unknown as {
  session: Mocks<'load' | 'save' | 'clear'>;
  activeRideMemory: Mocks<'load' | 'save' | 'clear'>;
  authApi: Mocks<'requestOtp' | 'verifyOtp' | 'getMe' | 'updateProfile' | 'uploadAvatar' | 'removeAvatar' | 'deleteAccount'>;
  rideApi: Mocks<
    'getEstimates' | 'requestRide' | 'getRide' | 'cancelRide' | 'getChatMessages' | 'sendChatMessage' | 'triggerSos' | 'cancelSos'
  >;
  billingApi: Mocks<'submitRating'>;
  geoApi: Mocks<'reverse' | 'search'>;
  placesApi: Mocks<'list' | 'save' | 'remove' | 'recent' | 'removeRecent' | 'clearRecent'>;
  passengerApi: Mocks<'setEmergencyPin'>;
};
const loc = location as unknown as Mocks<'requestLocationPermission' | 'getCurrentPosition'>;
const pushMock = push as unknown as Mocks<'enablePush' | 'disablePush'>;
/** Callback que o store passou ao enablePush (simula a chegada de um push da corrida). */
let deliverPush: ((rideId: string) => void) | null = null;

// Já com PIN de emergência (o fluxo de definição tem testes próprios)
const PASSENGER = { id: 'u-bia', name: 'Beatriz Lima', role: 'passenger', status: 'active', phone: '11999991111', hasEmergencyPin: true };

const ESTIMATES: FareEstimate[] = [
  { category: 'pop', categoryName: 'VozTri Pop', priceCents: 1869, formattedPrice: 'R$ 18,69', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Pop' },
  { category: 'black', categoryName: 'VozTri Black', priceCents: 3052, formattedPrice: 'R$ 30,52', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Black' },
  { category: 'mulher', categoryName: 'VozTri Mulher', priceCents: 1988, formattedPrice: 'R$ 19,88', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Mulher' },
  { category: 'moto', categoryName: 'VozTri Moto', priceCents: 1230, formattedPrice: 'R$ 12,30', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Moto' },
];

/** Status em que a API envia o prazo da busca (RideDispatcher::SEARCH_STATUSES). */
const SEARCH_STATUSES: Ride['status'][] = ['REQUESTED', 'SEARCHING', 'OFFERED', 'NO_DRIVER_AVAILABLE'];

/** Como a API: searchExpiresAt = createdAt + 3 min nos status de busca (sobrescrevível). */
const ride = (status: Ride['status'], over: Partial<Ride> = {}): Ride => {
  const base = rideBase(status, over);
  if ('searchExpiresAt' in over) return base;
  return {
    ...base,
    searchExpiresAt: SEARCH_STATUSES.includes(status) ? new Date(Date.parse(base.createdAt) + 180_000).toISOString() : null,
  };
};

const rideBase = (status: Ride['status'], over: Partial<Ride> = {}): Ride => ({
  id: 'ride-1',
  passengerId: 'p-1',
  passenger: { id: 'p-1', user: { id: 'u-bia', name: 'Beatriz Lima', avatarUrl: null, rating: 4.95 } },
  driverId: ['SEARCHING', 'OFFERED'].includes(status) ? null : 'd-1',
  driver: ['SEARCHING', 'OFFERED'].includes(status)
    ? null
    : {
        id: 'd-1',
        user: { id: 'u-carlos', name: 'Carlos Eduardo Silva', avatarUrl: null, rating: 4.98 },
        vehicle: { brand: 'Toyota', model: 'Corolla XEi', color: 'Prata Metálico', plate: 'VOZ2026', category: 'pop' },
      },
  status,
  category: 'black',
  categoryName: 'VozTri Black',
  origin: { address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP', shortAddress: 'Av. Paulista, 1578', latitude: -23.561414, longitude: -46.655881 },
  destination: { address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP', shortAddress: 'Av. Faria Lima, 3477', latitude: -23.585721, longitude: -46.679199 },
  route: { distanceMeters: 4860, durationSeconds: 600, encodedPolyline: '' },
  priceCents: 3052,
  formattedPrice: 'R$ 30,52',
  boardingPin: '4821',
  driverEarningsCents: null,
  paymentMethod: 'cash',
  paymentStatus: 'pending',
  createdAt: '2026-11-01T12:00:00Z',
  ...over,
});

let serverRide: Ride;
let chat: ChatMessage[];
let tree: ReactTestRenderer;
const initialState = usePassengerStore.getState();

async function renderLoggedIn(storedRideId: string | null = null, user: object = PASSENGER) {
  m.session.load.mockResolvedValue('token-salvo');
  m.authApi.getMe.mockResolvedValue(user);
  m.activeRideMemory.load.mockResolvedValue(storedRideId);
  act(() => {
    tree = renderer.create(<App />);
  });
  await settle();
}

/** Destino devolvido pela busca (mock da geoApi.search). */
const FARIA_LIMA = {
  address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
  shortAddress: 'Av. Faria Lima, 3477',
  latitude: -23.585721,
  longitude: -46.679199,
  city: 'São Paulo',
  state: 'SP',
};

/** Abre a busca, digita o destino, espera a busca (400 ms) e escolhe a Faria Lima. */
async function chooseFariaLima() {
  await pressAsync(tree, 'Buscar endereço de destino');
  await typeAsync(tree, 'Destino', 'Faria Lima');
  await advanceAsync(400);
  await pressAsync(tree, /^Av\. Faria Lima, 3477,/);
}

/** Da tela inicial até a corrida solicitada (Black, dinheiro). */
async function requestBlackRide() {
  await chooseFariaLima();
  await pressAsync(tree, /^VozTri Black,/);
  await pressAsync(tree, /^Forma de pagamento: /);
  await pressAsync(tree, 'Dinheiro em espécie');
  await pressAsync(tree, /^SOLICITAR VOZTRI BLACK/);
}

beforeEach(() => {
  useTestTimers();
  serverClock.reset(); // relógio do aparelho igual ao do servidor, salvo nos testes do deslocamento
  jest.clearAllMocks();
  usePassengerStore.setState(initialState, true);
  serverRide = ride('SEARCHING');
  chat = [];
  deliverPush = null;
  pushMock.enablePush.mockImplementation(async (onRideUpdate: (rideId: string) => void) => {
    deliverPush = onRideUpdate;
    return 'enabled';
  });
  pushMock.disablePush.mockResolvedValue(undefined);
  m.session.load.mockResolvedValue(null);
  m.session.save.mockResolvedValue(undefined);
  m.session.clear.mockResolvedValue(undefined);
  m.activeRideMemory.load.mockResolvedValue(null);
  m.activeRideMemory.save.mockResolvedValue(undefined);
  m.activeRideMemory.clear.mockResolvedValue(undefined);
  m.rideApi.getEstimates.mockResolvedValue(ESTIMATES);
  // Geocodificação reversa indisponível por padrão: o embarque fica com a coordenada
  m.geoApi.reverse.mockRejectedValue({ message: 'GEOCODING_UNAVAILABLE' });
  // Busca de destino: a Faria Lima, como o Photon devolve
  m.geoApi.search.mockResolvedValue([FARIA_LIMA]);
  // Sem endereços salvos por padrão
  m.placesApi.list.mockResolvedValue({ home: null, work: null });
  m.placesApi.save.mockImplementation(async (kind: string, place: unknown) => ({ home: null, work: null, [kind]: place }));
  m.placesApi.remove.mockResolvedValue(undefined);
  // Sem histórico de destinos por padrão
  m.placesApi.recent.mockResolvedValue([]);
  m.placesApi.removeRecent.mockResolvedValue(undefined);
  m.placesApi.clearRecent.mockResolvedValue(undefined);
  m.passengerApi.setEmergencyPin.mockResolvedValue({ hasEmergencyPin: true });
  // Praça da Sé: diferente da origem padrão, para provar que a estimativa usa o GPS
  loc.requestLocationPermission.mockResolvedValue('granted');
  loc.getCurrentPosition.mockResolvedValue(gpsAt(-23.55052, -46.633308));
  m.rideApi.requestRide.mockImplementation(async () => serverRide);
  m.rideApi.getRide.mockImplementation(async () => serverRide);
  m.rideApi.getChatMessages.mockImplementation(async () => [...chat]);
  m.rideApi.sendChatMessage.mockImplementation(async (_id: string, text: string) => {
    const msg: ChatMessage = { id: `m${chat.length}`, rideId: 'ride-1', senderId: 'u-bia', senderRole: 'passenger', text, createdAt: '' };
    chat.push(msg);
    return msg;
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

it('o detector acusa texto fora de <Text> (controle negativo)', () => {
  let probe!: ReactTestRenderer;
  act(() => {
    probe = renderer.create(
      <View>
        <Text>dentro</Text>
        {'fora do Text'}
      </View>,
    );
  });
  expect(findStrayText(probe.toJSON())).toEqual(['fora do Text']);
  act(() => probe.unmount());
});

describe('passenger-mobile integrado à API', () => {
  it('faz login por OTP como passageiro', async () => {
    m.authApi.requestOtp.mockResolvedValue({ message: 'ok', expiresInSeconds: 600, debugOtp: '123456' });
    m.authApi.verifyOtp.mockResolvedValue({ token: 'novo-token', user: PASSENGER });
    act(() => {
      tree = renderer.create(<App />);
    });
    await settle();
    expectNoStrayText(tree);

    await typeAsync(tree, 'Telefone', '11999991111');
    await pressAsync(tree, 'Receber código');
    expect(m.authApi.requestOtp).toHaveBeenCalledWith('11999991111', 'passenger');
    await typeAsync(tree, 'Código de verificação', '123456');
    await pressAsync(tree, 'Entrar');
    expect(m.session.save).toHaveBeenCalledWith('novo-token');
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');
  });

  it('percorre estimativa → solicitação → motorista → embarque → avaliação com a API', async () => {
    await renderLoggedIn();
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');

    // Destino pela busca da API (Photon), perto do embarque
    await chooseFariaLima();
    expect(m.geoApi.search).toHaveBeenCalledWith('Faria Lima', expect.objectContaining({ latitude: -23.55052 }));

    // Estimativas vêm da API, com a origem do GPS e o destino escolhido
    expect(m.rideApi.getEstimates).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -23.55052, longitude: -46.633308, shortAddress: 'Sua localização atual' }),
      expect.objectContaining({ shortAddress: 'Av. Faria Lima, 3477' }),
    );
    expectNoStrayText(tree);
    let text = visibleText(tree);
    expect(text).toContain('R$ 30,52');
    expect(text).toContain('4,86 km');

    await pressAsync(tree, /^VozTri Black,/);
    await pressAsync(tree, /^Forma de pagamento: /);
    await pressAsync(tree, 'Dinheiro em espécie');
    await pressAsync(tree, /^SOLICITAR VOZTRI BLACK • R\$ 30,52/);
    expect(m.rideApi.requestRide).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'black',
        paymentMethod: 'cash',
        origin: expect.objectContaining({ address: 'Localização GPS (-23.55052, -46.63331)', latitude: -23.55052 }),
      }),
    );
    expect(m.activeRideMemory.save).toHaveBeenCalledWith('ride-1');
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('Buscando o melhor motorista...');
    expect(text).toContain('VozTri Black • Pagamento em dinheiro');

    // Polling: o motorista aceita
    serverRide = ride('DRIVER_EN_ROUTE');
    await advanceAsync(3000);
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('Seu motorista está a caminho');
    expect(text).toContain('4821');
    expect(text).toContain('Carlos Eduardo Silva');
    expect(text).toContain('Toyota Corolla XEi • Prata Metálico');

    // Chat pela API (histórico + envio)
    chat.push({ id: 'm-d', rideId: 'ride-1', senderId: 'u-carlos', senderRole: 'driver', text: 'Chegando!', createdAt: '' });
    await pressAsync(tree, '💬 Mensagem (Chat)');
    expect(m.rideApi.getChatMessages).toHaveBeenCalledWith('ride-1');
    expect(visibleText(tree)).toContain('Chegando!');
    await typeAsync(tree, 'Mensagem para o motorista', 'Estou de camisa azul');
    await pressAsync(tree, 'Enviar');
    expect(m.rideApi.sendChatMessage).toHaveBeenCalledWith('ride-1', 'Estou de camisa azul');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Estou de camisa azul');
    await pressAsync(tree, 'Fechar chat');

    // SOS pela API: aciona, PIN errado, PIN certo
    // SOS envia a posição atual, não a do embarque
    m.rideApi.triggerSos.mockResolvedValue({ success: true, incidentId: 'inc-1' });
    loc.getCurrentPosition.mockResolvedValueOnce(gpsAt(-23.57, -46.64));
    await pressAsync(tree, 'Acionar central de emergência SOS 24 horas');
    await pressAsync(tree, 'ACIONAR SOS IMEDIATAMENTE');
    expect(m.rideApi.triggerSos).toHaveBeenCalledWith('ride-1', -23.57, -46.64);
    expect(visibleText(tree)).toContain('O ALERTA SOS ESTÁ ATIVO!');
    m.rideApi.cancelSos.mockRejectedValueOnce({ code: 'INVALID_EMERGENCY_PIN', message: 'PIN de segurança inválido.' });
    await typeAsync(tree, 'PIN de emergência', '0000');
    await pressAsync(tree, 'Desativar Alerta com PIN');
    expect(visibleText(tree)).toContain('PIN incorreto!');
    m.rideApi.cancelSos.mockResolvedValueOnce({ success: true });
    await typeAsync(tree, 'PIN de emergência', '1234');
    await pressAsync(tree, 'Desativar Alerta com PIN');
    expect(m.rideApi.cancelSos).toHaveBeenLastCalledWith('ride-1', '1234');
    expect(visibleText(tree)).not.toContain('Central de Emergência SOS 24h');

    // Polling: viagem em andamento (sem PIN e sem cancelar)
    serverRide = ride('IN_PROGRESS');
    await advanceAsync(3000);
    text = visibleText(tree);
    expect(text).toContain('Destino: Av. Faria Lima, 3477');
    expect(text).not.toContain('4821');
    expect(text).not.toContain('Cancelar corrida');

    // Polling: concluída → avaliação enviada à API
    serverRide = ride('COMPLETED');
    await advanceAsync(3000);
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('Você chegou ao seu destino!');
    expect(text).toContain('R$ 30,52');
    expect(text).toContain('Dinheiro');
    expect(text).toContain('Como foi a viagem com Carlos?');

    m.billingApi.submitRating.mockResolvedValue({ success: true });
    await pressAsync(tree, '3 estrelas');
    await pressAsync(tree, '+ R$ 5,00');
    await pressAsync(tree, 'Carro Limpo');
    await pressAsync(tree, 'CONCLUIR AVALIAÇÃO');
    expect(m.billingApi.submitRating).toHaveBeenCalledWith({ rideId: 'ride-1', rating: 3, tipCents: 500, tags: ['Carro Limpo'] });
    expect(m.activeRideMemory.clear).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');
  });

  it('cancela a busca pela API', async () => {
    await renderLoggedIn();
    await requestBlackRide();
    m.rideApi.cancelRide.mockResolvedValue(ride('CANCELLED'));
    await pressAsync(tree, 'Cancelar Busca');
    expect(m.rideApi.cancelRide).toHaveBeenCalledWith('ride-1', expect.any(String));
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');

    // O polling para depois do cancelamento
    const calls = m.rideApi.getRide.mock.calls.length;
    await advanceAsync(9000);
    expect(m.rideApi.getRide.mock.calls.length).toBe(calls);
  });

  it('volta ao início com aviso quando o motorista cancela', async () => {
    await renderLoggedIn();
    await requestBlackRide();
    serverRide = ride('DRIVER_EN_ROUTE');
    await advanceAsync(3000);

    serverRide = ride('CANCELLED');
    await advanceAsync(3000);
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('A corrida foi cancelada.');
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');
  });

  it('retoma a corrida já ativa quando a API responde 409', async () => {
    await renderLoggedIn();
    const existing = ride('DRIVER_EN_ROUTE', { id: 'ride-antiga' });
    m.rideApi.requestRide.mockRejectedValueOnce({
      code: 'RIDE_ALREADY_ACTIVE',
      message: 'Você já tem uma corrida em andamento.',
      body: { ride: existing },
    });
    serverRide = existing; // o polling passa a acompanhar a corrida retomada
    await requestBlackRide();
    expect(m.activeRideMemory.save).toHaveBeenCalledWith('ride-antiga');
    expect(m.rideApi.getRide).toHaveBeenCalledWith('ride-antiga');
    expect(visibleText(tree)).toContain('Seu motorista está a caminho');
  });

  it('retoma a corrida salva ao reabrir o app', async () => {
    serverRide = ride('DRIVER_EN_ROUTE');
    await renderLoggedIn('ride-1');
    expect(m.rideApi.getRide).toHaveBeenCalledWith('ride-1');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Seu motorista está a caminho');
  });

  it('mostra a foto do motorista na corrida (o passageiro confere quem vai buscá-lo)', async () => {
    const base = ride('DRIVER_EN_ROUTE');
    serverRide = { ...base, driver: { ...base.driver!, user: { ...base.driver!.user, avatarUrl: '/api/v1/users/u-carlos/avatar?v=9' } } };
    await renderLoggedIn('ride-1');

    const image = tree.root.find((n) => n.props.source?.uri === 'http://api.test/api/v1/users/u-carlos/avatar?v=9');
    expect(image.props.source.headers).toEqual({ Authorization: 'Bearer token-salvo' });
    expect(visibleText(tree)).toContain('Carlos Eduardo Silva');
  });

  it('mostra erro e permite tentar de novo quando a estimativa falha', async () => {
    await renderLoggedIn();
    m.rideApi.getEstimates.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
    await chooseFariaLima();
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Não foi possível calcular os preços.');
    expect(visibleText(tree)).toContain('Sem conexão com a API.');

    await pressAsync(tree, 'Tentar de novo');
    expect(visibleText(tree)).toContain('R$ 18,69');
  });

  it('mostra o embarque pelo GPS na tela inicial', async () => {
    await renderLoggedIn();
    expect(loc.requestLocationPermission).toHaveBeenCalled();
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Sua localização atual (±12 m)');
    expect(visibleText(tree)).not.toContain('Usar minha localização');
  });

  it('usa a origem padrão sinalizada sem permissão e tenta o GPS de novo', async () => {
    loc.requestLocationPermission.mockResolvedValueOnce('denied');
    await renderLoggedIn();
    expectNoStrayText(tree);
    let text = visibleText(tree);
    expect(text).toContain('Av. Paulista, 1578 (endereço padrão)');
    expect(text).toContain('Sem permissão de localização.');

    await pressAsync(tree, 'Usar minha localização');
    text = visibleText(tree);
    expect(text).toContain('Sua localização atual (±12 m)');
    expect(text).not.toContain('endereço padrão');
  });

  it('usa a origem padrão quando o GPS não responde', async () => {
    const LocationError = (location as unknown as { LocationError: new (m: string, c: string) => Error }).LocationError;
    loc.getCurrentPosition.mockRejectedValueOnce(new LocationError('Não foi possível obter a localização a tempo.', 'timeout'));
    await renderLoggedIn();
    expect(visibleText(tree)).toContain('(endereço padrão)');
    expect(visibleText(tree)).toContain('Não foi possível obter a localização a tempo.');

    // A estimativa segue funcionando com a origem padrão
    await chooseFariaLima();
    expect(m.rideApi.getEstimates).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -23.561414, longitude: -46.655881 }),
      expect.anything(),
    );
  });

  it('sai da conta pelo avatar (menu da conta → confirmação)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      // Menu da conta: "Sair da conta"; confirmação: "Sair"
      buttons?.find((b) => b.text === 'Sair da conta' || b.text === 'Sair')?.onPress?.();
    });
    await renderLoggedIn();
    await pressAsync(tree, /^Conta de Beatriz Lima/);
    await settle();
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy.mock.calls[1][0]).toBe('Sair da conta');
    expect(m.session.clear).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Entrar na VOZTRI');
    alertSpy.mockRestore();
  });

  it('menu da conta: no Android só 3 botões (o Alert descarta o 4º) e fecha tocando fora', async () => {
    const originalOS = Platform.OS;
    const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    try {
      await renderLoggedIn();

      setOS('android');
      await pressAsync(tree, /^Conta de Beatriz Lima/);
      let [, , buttons, options] = alertSpy.mock.calls[0]!;
      expect(buttons?.map((b) => b.text)).toEqual(['Meu perfil', 'Trocar PIN de emergência', 'Sair da conta']);
      expect(options).toEqual({ cancelable: true });

      setOS('ios');
      await pressAsync(tree, /^Conta de Beatriz Lima/);
      [, , buttons] = alertSpy.mock.calls[1]!;
      expect(buttons?.map((b) => b.text)).toEqual(['Meu perfil', 'Trocar PIN de emergência', 'Sair da conta', 'Cancelar']);
    } finally {
      setOS(originalOS);
      alertSpy.mockRestore();
    }
  });

  describe('Meu perfil (PUT /auth/profile)', () => {
    /** Abre "Meu perfil" pelo menu da conta no avatar. */
    async function openProfile() {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.text === 'Meu perfil')?.onPress?.();
      });
      await pressAsync(tree, /^Conta de Beatriz Lima/);
      alertSpy.mockRestore();
    }

    it('abre pelo menu da conta, salva o nome e a tela inicial mostra as iniciais novas', async () => {
      m.authApi.updateProfile.mockImplementation(async (changes: object) => ({ ...PASSENGER, email: null, ...changes }));
      await renderLoggedIn(null, { ...PASSENGER, email: 'bia@exemplo.com' });
      await openProfile();

      expectNoStrayText(tree);
      let text = visibleText(tree);
      expect(text).toContain('Meu perfil');
      expect(text).toContain('(11) 99999-1111');

      await typeAsync(tree, 'Nome', 'Ana Souza');
      await pressAsync(tree, 'Salvar perfil');
      expect(m.authApi.updateProfile).toHaveBeenCalledWith({ name: 'Ana Souza' });
      expect(visibleText(tree)).toContain('Perfil atualizado.');

      await pressAsync(tree, 'Voltar');
      text = visibleText(tree);
      expect(text).toContain('Para onde vamos hoje?');
      expect(text).toContain('AS');
      // A resposta não traz o PIN: a conta continua com PIN (sem a tela de criação)
      expect(usePassengerStore.getState().user).toMatchObject({ name: 'Ana Souza', hasEmergencyPin: true });
    });

    it('erro por campo da API aparece no campo e nada muda na conta', async () => {
      m.authApi.updateProfile.mockRejectedValueOnce({
        message: 'Este e-mail já está em uso por outra conta.',
        fields: { email: 'Este e-mail já está em uso por outra conta.' },
      });
      await renderLoggedIn();
      await openProfile();
      await typeAsync(tree, 'E-mail', 'ocupado@exemplo.com');
      await pressAsync(tree, 'Salvar perfil');

      expect(visibleText(tree)).toContain('Este e-mail já está em uso por outra conta.');
      expect(usePassengerStore.getState().user?.email).toBeUndefined();
      expect(usePassengerStore.getState().error).toBeNull();
    });

    it('foto pela galeria: envia, mostra no perfil e no avatar da tela inicial', async () => {
      const picker = jest.requireMock('react-native-image-picker') as Record<'launchImageLibrary', jest.Mock>;
      picker.launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///cache/eu.jpg', fileName: 'eu.jpg', type: 'image/jpeg' }] });
      m.authApi.uploadAvatar.mockResolvedValueOnce('/api/v1/users/u-bia/avatar?v=abc123');
      await renderLoggedIn();
      await openProfile();

      await pressAsync(tree, 'Escolher da galeria');
      expect(m.authApi.uploadAvatar).toHaveBeenCalledWith({ uri: 'file:///cache/eu.jpg', name: 'eu.jpg', type: 'image/jpeg' });
      expect(visibleText(tree)).toContain('Foto atualizada.');

      await pressAsync(tree, 'Voltar');
      // Caminho da API completado com a origem e carregado com o token (a foto exige login)
      const image = tree.root.find((n) => n.props.source?.uri === 'http://api.test/api/v1/users/u-bia/avatar?v=abc123');
      expect(image.props.source.headers).toEqual({ Authorization: 'Bearer token-salvo' });
    });

    it('foto recusada pela API: a mensagem do campo aparece', async () => {
      const picker = jest.requireMock('react-native-image-picker') as Record<'launchImageLibrary', jest.Mock>;
      picker.launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///x.png', fileName: 'x.png', type: 'image/png' }] });
      m.authApi.uploadAvatar.mockRejectedValueOnce({ message: 'x', fields: { photo: 'A foto precisa ter pelo menos 128 × 128 pixels.' } });
      await renderLoggedIn();
      await openProfile();
      await pressAsync(tree, 'Escolher da galeria');

      expect(visibleText(tree)).toContain('A foto precisa ter pelo menos 128 × 128 pixels.');
      expect(usePassengerStore.getState().user?.avatarUrl).toBeUndefined();
    });

    it('remover a foto volta às iniciais', async () => {
      m.authApi.removeAvatar.mockResolvedValueOnce(undefined);
      await renderLoggedIn(null, { ...PASSENGER, avatarUrl: '/api/v1/users/u-bia/avatar?v=1' });
      await openProfile();
      await pressAsync(tree, 'Remover foto');

      expect(m.authApi.removeAvatar).toHaveBeenCalled();
      expect(usePassengerStore.getState().user?.avatarUrl).toBeNull();
      await pressAsync(tree, 'Voltar');
      expect(tree.root.findAll((n) => n.props.source?.uri)).toHaveLength(0);
      expect(visibleText(tree)).toContain('BL');
    });

    it('excluir a conta: confirma com EXCLUIR, encerra a sessão e volta ao login', async () => {
      m.authApi.deleteAccount.mockResolvedValueOnce(undefined);
      await renderLoggedIn();
      await openProfile();
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

      await pressAsync(tree, 'Excluir conta');
      expect(visibleText(tree)).toContain('PIN de emergência, contatos de confiança');
      await typeAsync(tree, 'Digite EXCLUIR para confirmar', 'EXCLUIR');
      await pressAsync(tree, 'Excluir minha conta');
      await settle();

      expect(m.authApi.deleteAccount).toHaveBeenCalledWith('EXCLUIR');
      // A API já apagou os aparelhos: só invalida o token no Firebase
      expect(pushMock.disablePush).toHaveBeenCalledWith({ revoke: true });
      expect(m.session.clear).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith('Conta excluída', expect.stringContaining('dados pessoais foram apagados'));
      expect(usePassengerStore.getState().user).toBeNull();
      expect(visibleText(tree)).toContain('Entrar na VOZTRI');
      alertSpy.mockRestore();
    });

    it('excluir a conta com corrida em andamento: a mensagem da API aparece e a sessão continua', async () => {
      m.authApi.deleteAccount.mockRejectedValueOnce({
        message: 'Você tem uma corrida em andamento. Conclua ou cancele a corrida antes de excluir a conta.',
      });
      await renderLoggedIn();
      await openProfile();
      await pressAsync(tree, 'Excluir conta');
      await typeAsync(tree, 'Digite EXCLUIR para confirmar', 'excluir');
      await pressAsync(tree, 'Excluir minha conta');

      expect(visibleText(tree)).toContain('Conclua ou cancele a corrida antes de excluir a conta.');
      expect(m.session.clear).not.toHaveBeenCalled();
      expect(usePassengerStore.getState().user?.name).toBe('Beatriz Lima');
    });

    it('voltar sem salvar não chama a API', async () => {
      await renderLoggedIn();
      await openProfile();
      await typeAsync(tree, 'Nome', 'Outro Nome');
      await pressAsync(tree, 'Voltar');

      expect(m.authApi.updateProfile).not.toHaveBeenCalled();
      expect(usePassengerStore.getState().user?.name).toBe('Beatriz Lima');
    });
  });

  describe('PIN de emergência definido pelo passageiro', () => {
    const NO_PIN = { ...PASSENGER, hasEmergencyPin: false };

    const renderWithoutPin = () => renderLoggedIn(null, NO_PIN);

    async function fillPin(fields: Record<string, string>) {
      for (const [label, value] of Object.entries(fields)) await typeAsync(tree, label, value);
      await pressAsync(tree, 'Salvar PIN');
    }

    it('sem PIN, o app pede para criar antes de seguir e salva na conta', async () => {
      await renderWithoutPin();
      expectNoStrayText(tree);
      let text = visibleText(tree);
      expect(text).toContain('Crie seu PIN de emergência');
      expect(text).toContain('É com ele que você desativa o alerta SOS');
      expect(text).not.toContain('Para onde vamos hoje?');

      await fillPin({ 'PIN de emergência': '2580', 'Confirme o PIN': '2580' });

      expect(m.passengerApi.setEmergencyPin).toHaveBeenCalledWith('2580', undefined);
      expectNoStrayText(tree);
      text = visibleText(tree);
      expect(text).toContain('Para onde vamos hoje?');
      expect(usePassengerStore.getState().user?.hasEmergencyPin).toBe(true);
    });

    it('a confirmação diferente não chama a API', async () => {
      await renderWithoutPin();
      await fillPin({ 'PIN de emergência': '2580', 'Confirme o PIN': '2589' });

      expect(m.passengerApi.setEmergencyPin).not.toHaveBeenCalled();
      expect(visibleText(tree)).toContain('Os dois PINs não são iguais. Digite de novo.');
    });

    it('PIN fácil recusado pela API: mostra o motivo e continua na tela', async () => {
      m.passengerApi.setEmergencyPin.mockRejectedValueOnce({
        code: 'WEAK_EMERGENCY_PIN',
        message: 'Escolha um PIN mais difícil de adivinhar: sem números repetidos (0000) nem sequências (1234, 4321).',
      });
      await renderWithoutPin();
      await fillPin({ 'PIN de emergência': '1234', 'Confirme o PIN': '1234' });

      const text = visibleText(tree);
      expect(text).toContain('Escolha um PIN mais difícil de adivinhar');
      expect(text).toContain('Crie seu PIN de emergência');
    });

    it('só aceita dígitos e no máximo 4', async () => {
      await renderWithoutPin();
      await typeAsync(tree, 'PIN de emergência', '12a3456');
      const input = tree.root.find((n) => n.props.accessibilityLabel === 'PIN de emergência' && n.props.onChangeText);
      expect(input.props.value).toBe('1234');
    });

    it('troca pelo menu da conta exige o PIN atual', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.text === 'Trocar PIN de emergência')?.onPress?.();
      });
      await renderLoggedIn();
      await pressAsync(tree, /^Conta de Beatriz Lima/);
      alertSpy.mockRestore();

      expect(visibleText(tree)).toContain('Trocar PIN de emergência');
      m.passengerApi.setEmergencyPin.mockRejectedValueOnce({ code: 'INVALID_EMERGENCY_PIN', message: 'PIN de emergência atual incorreto.' });
      await fillPin({ 'PIN atual': '1111', 'Novo PIN': '3691', 'Confirme o PIN': '3691' });
      expect(visibleText(tree)).toContain('PIN atual incorreto.');

      await fillPin({ 'PIN atual': '2580', 'Novo PIN': '3691', 'Confirme o PIN': '3691' });
      expect(m.passengerApi.setEmergencyPin).toHaveBeenLastCalledWith('3691', '2580');
      expect(visibleText(tree)).toContain('Para onde vamos hoje?');
    });

    it('cancelar a troca volta ao início sem chamar a API', async () => {
      await renderLoggedIn();
      act(() => usePassengerStore.getState().setChangingPin(true));
      await pressAsync(tree, 'Cancelar');

      expect(m.passengerApi.setEmergencyPin).not.toHaveBeenCalled();
      expect(visibleText(tree)).toContain('Para onde vamos hoje?');
    });

    it('a API exigindo o PIN na solicitação abre a criação e depois a corrida segue', async () => {
      m.rideApi.requestRide.mockRejectedValueOnce({ code: 'EMERGENCY_PIN_REQUIRED', message: 'Defina seu PIN de emergência antes de pedir a corrida.' });
      await renderLoggedIn();
      await chooseFariaLima();
      await pressAsync(tree, /^SOLICITAR VOZTRI POP/);

      expect(visibleText(tree)).toContain('Crie seu PIN de emergência');
      await fillPin({ 'PIN de emergência': '2580', 'Confirme o PIN': '2580' });

      // De volta à escolha da categoria, com o mesmo destino
      await pressAsync(tree, /^SOLICITAR VOZTRI POP/);
      expect(m.rideApi.requestRide).toHaveBeenCalledTimes(2);
    });
  });

  describe('endereços salvos (Casa e Trabalho)', () => {
    const CASA = {
      address: 'Rua dos Pinheiros, 870 - Pinheiros, São Paulo - SP',
      shortAddress: 'Rua dos Pinheiros, 870',
      latitude: -23.5653,
      longitude: -46.6825,
      city: 'São Paulo',
      state: 'SP',
    };

    it('sem endereço, o atalho adiciona: busca pelo Photon, salva na conta e volta ao início', async () => {
      await renderLoggedIn();
      expect(m.placesApi.list).toHaveBeenCalled();
      expectNoStrayText(tree);
      let text = visibleText(tree);
      expect(text).toContain('Casa');
      expect(text).toContain('Adicionar');
      expect(text).not.toContain('Pinheiros'); // os atalhos fixos saíram

      await pressAsync(tree, 'Casa, adicionar endereço');
      text = visibleText(tree);
      expect(text).toContain('Endereço de Casa');
      expect(text).toContain('Busque o novo endereço de Casa e toque nele para salvar.');
      expect(text).not.toContain('(Sua Localização)');

      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      await pressAsync(tree, /^Av\. Faria Lima, 3477,/);

      expect(m.placesApi.save).toHaveBeenCalledWith('home', FARIA_LIMA);
      expect(m.rideApi.getEstimates).not.toHaveBeenCalled(); // não virou destino de corrida
      expectNoStrayText(tree);
      text = visibleText(tree);
      expect(text).toContain('Para onde vamos hoje?');
      expect(text).toContain('Av. Faria Lima, 3477');
    });

    it('com endereço salvo, o atalho leva direto às estimativas daquele destino', async () => {
      m.placesApi.list.mockResolvedValue({ home: CASA, work: null });
      await renderLoggedIn();
      expect(visibleText(tree)).toContain('Rua dos Pinheiros, 870');

      await pressAsync(tree, 'Casa, Rua dos Pinheiros, 870');

      expect(m.rideApi.getEstimates).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -23.55052 }),
        expect.objectContaining({ shortAddress: 'Rua dos Pinheiros, 870', latitude: -23.5653, longitude: -46.6825 }),
      );
      expect(visibleText(tree)).toContain('R$ 18,69');
    });

    it('alterar mostra o endereço atual e permite remover', async () => {
      m.placesApi.list.mockResolvedValue({ home: CASA, work: null });
      await renderLoggedIn();

      await pressAsync(tree, 'Alterar Casa');
      let text = visibleText(tree);
      expect(text).toContain('Atual: Rua dos Pinheiros, 870.');

      await pressAsync(tree, 'Remover endereço de Casa');
      expect(m.placesApi.remove).toHaveBeenCalledWith('home');
      text = visibleText(tree);
      expect(text).toContain('Para onde vamos hoje?');
      expect(text).not.toContain('Rua dos Pinheiros, 870');
      expect(usePassengerStore.getState().savedPlaces).toEqual({ home: null, work: null });
    });

    it('o Trabalho é independente da Casa', async () => {
      m.placesApi.list.mockResolvedValue({ home: CASA, work: null });
      m.placesApi.save.mockResolvedValue({ home: CASA, work: FARIA_LIMA });
      await renderLoggedIn();

      await pressAsync(tree, 'Trabalho, adicionar endereço');
      expect(visibleText(tree)).toContain('Endereço do Trabalho');
      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      await pressAsync(tree, /^Av\. Faria Lima, 3477,/);

      expect(m.placesApi.save).toHaveBeenCalledWith('work', FARIA_LIMA);
      const text = visibleText(tree);
      expect(text).toContain('Rua dos Pinheiros, 870');
      expect(text).toContain('Av. Faria Lima, 3477');
    });

    it('falha ao salvar mostra o erro e continua na escolha', async () => {
      m.placesApi.save.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
      await renderLoggedIn();
      await pressAsync(tree, 'Casa, adicionar endereço');
      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      await pressAsync(tree, /^Av\. Faria Lima, 3477,/);

      const text = visibleText(tree);
      expect(text).toContain('Sem conexão com a API.');
      expect(text).toContain('Endereço de Casa');
      expect(usePassengerStore.getState().savedPlaces).toEqual({ home: null, work: null });
    });

    it('voltar da escolha encerra o modo: a busca seguinte é de destino', async () => {
      await renderLoggedIn();
      await pressAsync(tree, 'Casa, adicionar endereço');
      await pressAsync(tree, 'Voltar');
      expect(usePassengerStore.getState().placePicker).toBeNull();

      await pressAsync(tree, 'Buscar endereço de destino');
      expect(visibleText(tree)).toContain('Para onde você vai?');
    });

    it('sem conseguir carregar os endereços, os atalhos só oferecem adicionar (sem aviso)', async () => {
      m.placesApi.list.mockRejectedValue({ message: 'Sem conexão com a API.' });
      await renderLoggedIn();
      expect(visibleText(tree)).toContain('Adicionar');
      expect(usePassengerStore.getState().error).toBeNull();
    });
  });

  describe('histórico dos últimos destinos', () => {
    const AUGUSTA = {
      address: 'Rua Augusta, 1500 - Consolação, São Paulo - SP',
      shortAddress: 'Rua Augusta, 1500',
      latitude: -23.5565,
      longitude: -46.6586,
    };
    const RECENT = [
      { id: 'r1', ...FARIA_LIMA },
      { id: 'r2', ...AUGUSTA },
    ];
    const HINT = 'Digite pelo menos 3 letras do endereço ou do nome do lugar.';

    it('antes de digitar mostra os últimos destinos; tocar leva às estimativas', async () => {
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      expect(m.placesApi.recent).toHaveBeenCalledTimes(1);
      expectNoStrayText(tree);
      const text = visibleText(tree);
      expect(text).toContain('Recentes');
      expect(text).toContain('Av. Faria Lima, 3477');
      expect(text).toContain('Rua Augusta, 1500 - Consolação, São Paulo - SP');
      expect(text).not.toContain(HINT);

      await pressAsync(tree, /^Rua Augusta, 1500, .*, destino recente$/);
      // O destino vai sem o id do histórico
      expect(m.rideApi.getEstimates).toHaveBeenCalledWith(expect.objectContaining({ latitude: -23.55052 }), AUGUSTA);
      expect(visibleText(tree)).toContain('R$ 18,69');
      expect(m.geoApi.search).not.toHaveBeenCalled();
    });

    it('ao digitar, o histórico dá lugar aos resultados e volta ao apagar o texto', async () => {
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      let text = visibleText(tree);
      expect(text).toContain('Resultados');
      expect(text).not.toContain('Recentes');
      expect(text).not.toContain('Rua Augusta, 1500');

      await typeAsync(tree, 'Destino', '');
      text = visibleText(tree);
      expect(text).toContain('Recentes');
      expect(text).toContain('Rua Augusta, 1500');
    });

    it('remover tira o destino do histórico da conta', async () => {
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await pressAsync(tree, 'Remover Av. Faria Lima, 3477 do histórico');
      expect(m.placesApi.removeRecent).toHaveBeenCalledWith('r1');
      expectNoStrayText(tree);
      const text = visibleText(tree);
      expect(text).not.toContain('Av. Faria Lima, 3477');
      expect(text).toContain('Rua Augusta, 1500');

      // Sem nenhum destino, volta a dica para digitar
      await pressAsync(tree, 'Remover Rua Augusta, 1500 do histórico');
      expect(visibleText(tree)).toContain(HINT);
      expect(visibleText(tree)).not.toContain('Recentes');
    });

    it('falha ao remover mostra o erro e mantém o destino', async () => {
      m.placesApi.recent.mockResolvedValue(RECENT);
      m.placesApi.removeRecent.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await pressAsync(tree, 'Remover Av. Faria Lima, 3477 do histórico');
      expect(usePassengerStore.getState().error).toBe('Sem conexão com a API.');
      expect(visibleText(tree)).toContain('Av. Faria Lima, 3477');
    });

    it('o histórico é lido de novo a cada abertura da busca', async () => {
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      expect(visibleText(tree)).toContain(HINT);
      await pressAsync(tree, 'Voltar');

      // Uma corrida depois (a API gravou o destino)
      m.placesApi.recent.mockResolvedValue([{ id: 'r1', ...FARIA_LIMA }]);
      await pressAsync(tree, 'Buscar endereço de destino');
      expect(m.placesApi.recent).toHaveBeenCalledTimes(2);
      expect(visibleText(tree)).toContain('Av. Faria Lima, 3477');
    });

    it('na escolha da Casa, tocar num destino recente salva como Casa', async () => {
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Casa, adicionar endereço');
      expect(visibleText(tree)).toContain('Recentes');

      await pressAsync(tree, /^Av\. Faria Lima, 3477, .*, destino recente$/);
      expect(m.placesApi.save).toHaveBeenCalledWith('home', FARIA_LIMA);
      expect(m.rideApi.getEstimates).not.toHaveBeenCalled();
      expect(visibleText(tree)).toContain('Para onde vamos hoje?');
    });

    /** Responde ao diálogo de confirmação com o botão indicado. */
    const answerAlert = (button: 'Limpar' | 'Cancelar') =>
      jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.text === button)?.onPress?.();
      });

    it('"Limpar histórico" pede confirmação e apaga todos os destinos da conta', async () => {
      const alertSpy = answerAlert('Limpar');
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await pressAsync(tree, 'Limpar histórico');
      await settle();
      expect(alertSpy).toHaveBeenCalledWith('Limpar histórico', 'Apagar todos os destinos recentes desta conta?', expect.any(Array));
      expect(m.placesApi.clearRecent).toHaveBeenCalledTimes(1);
      expectNoStrayText(tree);
      const text = visibleText(tree);
      expect(text).not.toContain('Recentes');
      expect(text).not.toContain('Limpar histórico');
      expect(text).not.toContain('Rua Augusta, 1500');
      expect(text).toContain(HINT);
      alertSpy.mockRestore();
    });

    it('cancelar a confirmação mantém o histórico', async () => {
      const alertSpy = answerAlert('Cancelar');
      m.placesApi.recent.mockResolvedValue(RECENT);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await pressAsync(tree, 'Limpar histórico');
      await settle();
      expect(m.placesApi.clearRecent).not.toHaveBeenCalled();
      expect(visibleText(tree)).toContain('Rua Augusta, 1500');
      alertSpy.mockRestore();
    });

    it('falha ao limpar mostra o erro e mantém o histórico', async () => {
      const alertSpy = answerAlert('Limpar');
      m.placesApi.recent.mockResolvedValue(RECENT);
      m.placesApi.clearRecent.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await pressAsync(tree, 'Limpar histórico');
      await settle();
      expect(usePassengerStore.getState().error).toBe('Sem conexão com a API.');
      expect(visibleText(tree)).toContain('Rua Augusta, 1500');
      alertSpy.mockRestore();
    });

    it('sem histórico, não há "Limpar histórico"', async () => {
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      expect(visibleText(tree)).not.toContain('Limpar histórico');
    });

    it('sem conseguir carregar o histórico, mostra a dica sem aviso', async () => {
      m.placesApi.recent.mockRejectedValue({ message: 'Sem conexão com a API.' });
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      expect(visibleText(tree)).toContain(HINT);
      expect(usePassengerStore.getState().error).toBeNull();
    });
  });

  describe('busca de destino (API → Photon)', () => {
    it('pede ao menos 3 letras e busca perto do embarque depois de 400 ms sem digitar', async () => {
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Digite pelo menos 3 letras do endereço ou do nome do lugar.');

      await typeAsync(tree, 'Destino', 'Fa');
      await advanceAsync(1000);
      expect(m.geoApi.search).not.toHaveBeenCalled();

      // Digitação seguida: só a última versão do texto vai para a API
      await typeAsync(tree, 'Destino', 'Faria');
      await advanceAsync(200);
      await typeAsync(tree, 'Destino', 'Faria Lima');
      expect(visibleText(tree)).toContain('Buscando…');
      await advanceAsync(400);
      expect(m.geoApi.search).toHaveBeenCalledTimes(1);
      // Perto do embarque (GPS do teste: Praça da Sé)
      expect(m.geoApi.search).toHaveBeenCalledWith('Faria Lima', expect.objectContaining({ latitude: -23.55052, longitude: -46.633308 }));

      expectNoStrayText(tree);
      const text = visibleText(tree);
      expect(text).toContain('Resultados');
      expect(text).toContain('Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP');

      await pressAsync(tree, /^Av\. Faria Lima, 3477,/);
      expect(m.rideApi.getEstimates).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -23.55052 }),
        expect.objectContaining({ shortAddress: 'Av. Faria Lima, 3477', latitude: -23.585721, longitude: -46.679199 }),
      );
    });

    it('nada encontrado', async () => {
      m.geoApi.search.mockResolvedValue([]);
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      await typeAsync(tree, 'Destino', 'xyzxyz');
      await advanceAsync(400);
      expect(visibleText(tree)).toContain('Nenhum endereço encontrado para “xyzxyz”.');
    });

    it('falha na busca mostra o aviso e "Tentar de novo" repete', async () => {
      m.geoApi.search.mockRejectedValueOnce({ code: 'GEOCODING_UNAVAILABLE', message: 'indisponível' });
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Não foi possível buscar endereços agora.');

      await pressAsync(tree, 'Tentar de novo');
      await advanceAsync(400);
      expect(m.geoApi.search).toHaveBeenCalledTimes(2);
      expect(visibleText(tree)).toContain('Av. Faria Lima, 3477');
    });

    it('descarta a resposta atrasada de um texto anterior', async () => {
      const answers: Array<(v: unknown[]) => void> = [];
      m.geoApi.search.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');

      await typeAsync(tree, 'Destino', 'Morumbi');
      await advanceAsync(400);
      await typeAsync(tree, 'Destino', 'Faria Lima');
      await advanceAsync(400);
      expect(answers).toHaveLength(2);

      await act(async () => answers[1]!([FARIA_LIMA]));
      await act(async () => answers[0]!([{ ...FARIA_LIMA, shortAddress: 'Morumbi Shopping', address: 'Avenida Roque Petroni Júnior, 1089' }]));
      await settle();

      const text = visibleText(tree);
      expect(text).toContain('Av. Faria Lima, 3477');
      expect(text).not.toContain('Morumbi Shopping');
    });

    it('a lista fixa de destinos não existe mais', async () => {
      await renderLoggedIn();
      await pressAsync(tree, 'Buscar endereço de destino');
      const text = visibleText(tree);
      expect(text).not.toContain('Destinos Recomendados');
      expect(text).not.toContain('Aeroporto de Congonhas');
    });
  });

  describe('endereço do embarque pelo GPS (geocodificação reversa)', () => {
    const SE = { address: 'Praça da Sé - Sé, São Paulo - SP', shortAddress: 'Praça da Sé', city: 'São Paulo', state: 'SP' };

    it('troca a coordenada pelo endereço e o envia na solicitação, junto com a posição do GPS', async () => {
      m.geoApi.reverse.mockResolvedValue(SE);
      await renderLoggedIn();

      expect(m.geoApi.reverse).toHaveBeenCalledWith(-23.55052, -46.633308);
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Praça da Sé (±12 m)');
      expect(visibleText(tree)).not.toContain('Sua localização atual');

      await requestBlackRide();
      expect(m.rideApi.requestRide).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: expect.objectContaining({
            address: 'Praça da Sé - Sé, São Paulo - SP',
            shortAddress: 'Praça da Sé',
            latitude: -23.55052,
            longitude: -46.633308,
          }),
        }),
      );
    });

    it('sem endereço (ou provedor fora do ar), mantém a coordenada e o app segue normal', async () => {
      m.geoApi.reverse.mockRejectedValue({ code: 'ADDRESS_NOT_FOUND', message: 'Endereço não encontrado.' });
      await renderLoggedIn();
      expect(visibleText(tree)).toContain('Sua localização atual (±12 m)');
      expect(usePassengerStore.getState().error).toBeNull(); // falha silenciosa

      await requestBlackRide();
      expect(m.rideApi.requestRide).toHaveBeenCalledWith(
        expect.objectContaining({ origin: expect.objectContaining({ address: 'Localização GPS (-23.55052, -46.63331)' }) }),
      );
    });

    it('a solicitação espera o endereço que ainda está chegando', async () => {
      let answer: (v: typeof SE) => void = () => undefined;
      m.geoApi.reverse.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
      await renderLoggedIn();
      expect(visibleText(tree)).toContain('Sua localização atual (±12 m)');

      // Toca em solicitar com a geocodificação pendente; o endereço chega em seguida
      await chooseFariaLima();
      await pressAsync(tree, /^VozTri Black,/);
      const request = pressAsync(tree, /^SOLICITAR VOZTRI BLACK/);
      await act(async () => answer(SE));
      await request;
      await settle();

      expect(m.rideApi.requestRide).toHaveBeenCalledWith(
        expect.objectContaining({ origin: expect.objectContaining({ shortAddress: 'Praça da Sé' }) }),
      );
    });

    it('não espera mais que 2,5 s: sem resposta, solicita com a coordenada', async () => {
      m.geoApi.reverse.mockImplementation(() => new Promise(() => undefined)); // nunca responde
      await renderLoggedIn();
      await chooseFariaLima();
      await pressAsync(tree, /^VozTri Black,/);

      await pressAsync(tree, /^SOLICITAR VOZTRI BLACK/);
      expect(m.rideApi.requestRide).not.toHaveBeenCalled(); // ainda esperando o endereço
      await advanceAsync(2500);

      expect(m.rideApi.requestRide).toHaveBeenCalledWith(
        expect.objectContaining({ origin: expect.objectContaining({ shortAddress: 'Sua localização atual' }) }),
      );
    });

    it('ignora o endereço que chega depois de uma nova leitura do GPS', async () => {
      const answers: Array<(v: typeof SE) => void> = [];
      m.geoApi.reverse.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
      await renderLoggedIn(); // 1ª leitura: Praça da Sé

      // "Usar minha localização" de novo, já em outro lugar
      loc.getCurrentPosition.mockResolvedValueOnce(gpsAt(-23.561414, -46.655881));
      await act(async () => usePassengerStore.getState().locateOrigin());
      await settle();
      expect(answers).toHaveLength(2);

      await act(async () => answers[0]!(SE)); // resposta atrasada da 1ª leitura
      await settle();
      expect(usePassengerStore.getState().origin.shortAddress).toBe('Sua localização atual');

      await act(async () => answers[1]!({ ...SE, address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP', shortAddress: 'Av. Paulista, 1578' }));
      await settle();
      expect(usePassengerStore.getState().origin).toEqual(
        expect.objectContaining({ shortAddress: 'Av. Paulista, 1578', latitude: -23.561414, longitude: -46.655881 }),
      );
    });
  });

  describe('push do andamento da corrida', () => {
    it('ativa o push ao entrar e mostra a chegada do motorista assim que a mensagem chega', async () => {
      serverRide = ride('DRIVER_EN_ROUTE');
      await renderLoggedIn('ride-1');
      expect(pushMock.enablePush).toHaveBeenCalledTimes(1);
      expect(usePassengerStore.getState().pushStatus).toBe('enabled');
      expect(visibleText(tree)).toContain('Seu motorista está a caminho');

      // Chegada avisada por push antes do próximo ciclo do polling
      serverRide = ride('DRIVER_ARRIVED');
      const calls = m.rideApi.getRide.mock.calls.length;
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expect(m.rideApi.getRide.mock.calls.length).toBe(calls + 1);
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Seu motorista chegou ao embarque');
    });

    it('aberto pela notificação sem corrida na tela, passa a acompanhar a corrida', async () => {
      await renderLoggedIn(null);
      expect(visibleText(tree)).not.toContain('Seu motorista');

      serverRide = ride('DRIVER_EN_ROUTE');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expect(m.rideApi.getRide).toHaveBeenCalledWith('ride-1');
      expect(m.activeRideMemory.save).toHaveBeenCalledWith('ride-1');
      expect(visibleText(tree)).toContain('Seu motorista está a caminho');
    });

    it('com a corrida na tela, o push de cancelamento pelo motorista volta ao início com aviso', async () => {
      serverRide = ride('DRIVER_EN_ROUTE');
      await renderLoggedIn('ride-1');
      serverRide = ride('CANCELLED');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('A corrida foi cancelada.');
      expect(visibleText(tree)).toContain('Para onde vamos hoje?');
      expect(m.activeRideMemory.clear).toHaveBeenCalled();
    });

    it('com a viagem na tela, o push de conclusão abre a avaliação', async () => {
      serverRide = ride('IN_PROGRESS');
      await renderLoggedIn('ride-1');
      serverRide = ride('COMPLETED');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Como foi a viagem com Carlos?');
    });

    it('aberto pela notificação de conclusão, sem corrida na tela, abre a avaliação', async () => {
      await renderLoggedIn(null);
      serverRide = ride('COMPLETED');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expect(m.activeRideMemory.save).toHaveBeenCalledWith('ride-1');
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Como foi a viagem com Carlos?');
    });

    it('aberto pela notificação de cancelamento, sem corrida na tela, explica o que houve', async () => {
      await renderLoggedIn(null);
      serverRide = ride('CANCELLED');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expect(m.activeRideMemory.save).not.toHaveBeenCalled();
      expect(usePassengerStore.getState().activeRide).toBeNull();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('O motorista cancelou a corrida. Peça um novo motorista quando quiser.');
      expect(visibleText(tree)).toContain('Para onde vamos hoje?');
    });

    it('busca encerrada sem motorista pelo push: mostra o aviso e "Tentar de novo" refaz a solicitação', async () => {
      await renderLoggedIn();
      await requestBlackRide();
      expect(visibleText(tree)).toContain('Buscando o melhor motorista...');
      const firstRequest = m.rideApi.requestRide.mock.calls[0]![0];

      // A API encerrou a busca (3 min sem motorista); o push chega antes do polling
      serverRide = ride('NO_DRIVER_AVAILABLE');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expectNoStrayText(tree);
      let text = visibleText(tree);
      expect(text).toContain('Nenhum motorista disponível');
      expect(text).toContain('Não encontramos um motorista VozTri Black perto de Av. Paulista, 1578 em 3 minutos.');
      expect(text).toContain('Tentar de novo');
      expect(text).not.toContain('Prazo da busca');
      expect(m.activeRideMemory.clear).toHaveBeenCalled();
      expect(usePassengerStore.getState().activeRide).toBeNull();

      // Sem corrida ativa, o polling para
      const polls = m.rideApi.getRide.mock.calls.length;
      await advanceAsync(9000);
      expect(m.rideApi.getRide.mock.calls.length).toBe(polls);

      // Mesmo destino, categoria e pagamento (e a mesma origem da busca encerrada)
      serverRide = ride('SEARCHING', { id: 'ride-2', createdAt: new Date(Date.now()).toISOString() });
      await pressAsync(tree, 'Tentar de novo');
      expect(m.rideApi.requestRide).toHaveBeenCalledTimes(2);
      expect(m.rideApi.requestRide).toHaveBeenLastCalledWith({
        origin: expect.objectContaining({ shortAddress: 'Av. Paulista, 1578', latitude: -23.561414, longitude: -46.655881 }),
        destination: expect.objectContaining({ shortAddress: 'Av. Faria Lima, 3477' }),
        category: 'black',
        paymentMethod: 'cash',
      });
      expect(firstRequest).toEqual(expect.objectContaining({ category: 'black', paymentMethod: 'cash' }));
      expect(m.activeRideMemory.save).toHaveBeenLastCalledWith('ride-2');
      text = visibleText(tree);
      expect(text).toContain('Buscando o melhor motorista...');
      expect(text).toContain('Prazo da busca: 3:00');
      expect(usePassengerStore.getState().noDriverRide).toBeNull();
    });

    it('falha ao tentar de novo mantém o aviso e o botão; "Voltar ao início" sai do aviso', async () => {
      await renderLoggedIn();
      await requestBlackRide();
      serverRide = ride('NO_DRIVER_AVAILABLE');
      await advanceAsync(3000); // pelo polling desta vez
      expect(visibleText(tree)).toContain('Tentar de novo');

      m.rideApi.requestRide.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
      await pressAsync(tree, 'Tentar de novo');
      let text = visibleText(tree);
      expect(text).toContain('Sem conexão com a API.');
      expect(text).toContain('Tentar de novo');

      await pressAsync(tree, 'Voltar ao início');
      text = visibleText(tree);
      expect(text).toContain('Para onde vamos hoje?');
      expect(usePassengerStore.getState().noDriverRide).toBeNull();
    });

    it('aberto pela notificação de busca sem motorista, na tela inicial, mostra o aviso com "Tentar de novo"', async () => {
      await renderLoggedIn(null);
      serverRide = ride('NO_DRIVER_AVAILABLE');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      expect(m.activeRideMemory.save).not.toHaveBeenCalled();
      expect(usePassengerStore.getState().activeRide).toBeNull();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Nenhum motorista disponível');
      expect(visibleText(tree)).toContain('Tentar de novo');
    });

    it('mostra o prazo da busca contando a partir do createdAt da corrida', async () => {
      // Corrida criada há 23 s
      serverRide = ride('SEARCHING', { createdAt: new Date(Date.now() - 23_000).toISOString() });
      await renderLoggedIn();
      await requestBlackRide();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Prazo da busca: 2:37');

      await advanceAsync(1000);
      expect(visibleText(tree)).toContain('Prazo da busca: 2:36');

      await advanceAsync(96_000);
      expect(visibleText(tree)).toContain('Prazo da busca: 1:00');

      // Prazo esgotado: aguarda a API encerrar a busca
      await advanceAsync(60_000);
      expect(visibleText(tree)).toContain('Encerrando a busca…');
      expect(visibleText(tree)).not.toContain('Prazo da busca');
    });

    it('usa o prazo enviado pela API, e não uma duração fixa no app', async () => {
      // O backend passou a buscar por só 1 min: criada há 23 s, restam 0:37
      const createdAt = new Date(Date.now() - 23_000).toISOString();
      serverRide = ride('SEARCHING', { createdAt, searchExpiresAt: new Date(Date.now() + 37_000).toISOString() });
      await renderLoggedIn();
      await requestBlackRide();
      expect(visibleText(tree)).toContain('Prazo da busca: 0:37');

      // E o aviso de busca encerrada usa a mesma duração
      serverRide = ride('NO_DRIVER_AVAILABLE', { createdAt, searchExpiresAt: new Date(Date.parse(createdAt) + 60_000).toISOString() });
      await advanceAsync(3000);
      expect(visibleText(tree)).toContain('perto de Av. Paulista, 1578 em 1 minuto.');
    });

    it('sem o prazo na resposta (API antiga), não mostra o contador nem a duração', async () => {
      serverRide = ride('SEARCHING', { searchExpiresAt: null });
      await renderLoggedIn();
      await requestBlackRide();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('Buscando o melhor motorista...');
      expect(visibleText(tree)).not.toContain('Prazo da busca');
      expect(visibleText(tree)).not.toContain('Encerrando a busca');

      serverRide = ride('NO_DRIVER_AVAILABLE', { searchExpiresAt: null });
      await advanceAsync(3000);
      expect(visibleText(tree)).toContain('perto de Av. Paulista, 1578.');
    });

    it('corrige o relógio do aparelho atrasado pelo deslocamento medido no header Date', async () => {
      // Aparelho 2 min atrás do servidor: a corrida foi criada há 23 s no relógio do servidor,
      // o que no relógio do aparelho parece "daqui a 1:37" (sem correção, o contador travaria em 3:00)
      const serverNow = Date.now() + 120_000;
      serverRide = ride('SEARCHING', { createdAt: new Date(serverNow - 23_000).toISOString() });
      serverClock.record(120_000);

      await renderLoggedIn();
      await requestBlackRide();
      expect(visibleText(tree)).toContain('Prazo da busca: 2:37');
      await advanceAsync(1000);
      expect(visibleText(tree)).toContain('Prazo da busca: 2:36');
    });

    it('corrige o relógio do aparelho adiantado', async () => {
      // Aparelho 2 min à frente: sem correção, o contador já mostraria "Encerrando a busca…"
      const serverNow = Date.now() - 120_000;
      serverRide = ride('SEARCHING', { createdAt: new Date(serverNow - 23_000).toISOString() });
      serverClock.record(-120_000);

      await renderLoggedIn();
      await requestBlackRide();
      expect(visibleText(tree)).toContain('Prazo da busca: 2:37');
      expect(visibleText(tree)).not.toContain('Encerrando a busca');
    });

    it('ignora aviso de uma corrida diferente da que está na tela', async () => {
      await renderLoggedIn(null);
      serverRide = ride('DRIVER_EN_ROUTE');
      await act(async () => deliverPush!('ride-1'));
      await settle();
      const calls = m.rideApi.getRide.mock.calls.length;
      await act(async () => deliverPush!('ride-velha'));
      await settle();
      expect(m.rideApi.getRide.mock.calls.length).toBe(calls);
      expect(usePassengerStore.getState().activeRide?.id).toBe('ride-1');
    });

    it('sem Firebase configurado o app segue só com o polling', async () => {
      pushMock.enablePush.mockResolvedValue('unavailable');
      await renderLoggedIn();
      expect(usePassengerStore.getState().pushStatus).toBe('unavailable');
      expect(visibleText(tree)).toContain('Sua localização atual');
    });

    it('remove o token antes de limpar a sessão no logout', async () => {
      const order: string[] = [];
      pushMock.disablePush.mockImplementation(async () => void order.push('push'));
      m.session.clear.mockImplementation(async () => void order.push('session'));
      // Menu da conta ("Sair da conta") e confirmação ("Sair")
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
        buttons?.find((b) => b.text === 'Sair da conta' || b.text === 'Sair')?.onPress?.();
      });
      await renderLoggedIn();
      await pressAsync(tree, /^Conta de Beatriz Lima/);
      await settle();
      expect(pushMock.disablePush).toHaveBeenCalledWith();
      expect(order).toEqual(['push', 'session']);
      alertSpy.mockRestore();
    });

    it('sessão expirada invalida o token do aparelho', async () => {
      await renderLoggedIn();
      const handler = (api as unknown as { onUnauthorized: jest.Mock }).onUnauthorized.mock.calls.at(-1)![0] as () => void;
      await act(async () => handler());
      expect(pushMock.disablePush).toHaveBeenLastCalledWith({ revoke: true });
      expect(usePassengerStore.getState().pushStatus).toBe('off');
    });
  });
});
