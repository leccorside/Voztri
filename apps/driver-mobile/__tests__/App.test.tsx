import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { DriverCurrentState, DriverEarningsSummary, DriverRideOffer, Ride } from '@voztri/shared-types';
import { App } from '../src/App';
import { useDriverStore } from '../src/store/driverStore';
import * as api from '../src/api';
import * as location from '../src/location';
import { backgroundTracking } from '../src/backgroundTracking';
import * as push from '../src/push';
import { Alert } from 'react-native';
import type { DevicePosition } from '../src/location';
import {
  advanceAsync,
  expectNoStrayText,
  findStrayText,
  isDisabled,
  pressAsync,
  settle,
  typeAsync,
  useTestTimers,
  visibleText,
} from './rnTree';

// A camada de API é substituída por mocks: os testes verificam que as telas
// chamam a API certa com os dados certos e reagem a cada resposta.
jest.mock('../src/api', () => ({
  session: { load: jest.fn(), save: jest.fn(), clear: jest.fn() },
  onUnauthorized: jest.fn(),
  authApi: { requestOtp: jest.fn(), verifyOtp: jest.fn(), getMe: jest.fn() },
  driverApi: {
    getCurrent: jest.fn(),
    getEarnings: jest.fn(),
    setOnlineStatus: jest.fn(),
    acceptOffer: jest.fn(),
    rejectOffer: jest.fn(),
    updateLocation: jest.fn(),
  },
  rideApi: { validatePin: jest.fn(), completeRide: jest.fn(), markArrived: jest.fn() },
  billingApi: { requestPayout: jest.fn() },
  apiErrorCode: (err: { code?: string }) => err?.code ?? null,
  errorMessage: (err: { message?: string }) => err?.message ?? 'Erro',
  currentToken: () => 'token-salvo',
}));

// Serviço nativo de rastreamento (Android); supported=false simula o iOS
jest.mock('../src/backgroundTracking', () => ({
  backgroundTracking: { supported: false, start: jest.fn(), stop: jest.fn(), status: jest.fn() },
}));

// Push simulado: o teste guarda o callback de oferta para "entregar" uma mensagem
jest.mock('../src/push', () => ({
  enablePush: jest.fn(),
  disablePush: jest.fn(),
  registerBackgroundHandler: jest.fn(),
}));

// GPS e permissões simulados: o teste controla a permissão e emite posições
jest.mock('../src/location', () => {
  class LocationError extends Error {
    readonly code: string;
    constructor(message: string, errorCode: string) {
      super(message);
      this.code = errorCode;
    }
  }
  const actual = jest.requireActual('../src/geo');
  return {
    LocationError,
    distanceMeters: actual.distanceMeters,
    requestLocationPermission: jest.fn(),
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    hasBackgroundLocationPermission: jest.fn(),
    requestBackgroundLocationPermission: jest.fn(),
    requestNotificationPermission: jest.fn(),
    setBackgroundUpdates: jest.fn(),
  };
});

const m = api as unknown as {
  session: Record<'load' | 'save' | 'clear', jest.Mock>;
  authApi: Record<'requestOtp' | 'verifyOtp' | 'getMe', jest.Mock>;
  driverApi: Record<
    'getCurrent' | 'getEarnings' | 'setOnlineStatus' | 'acceptOffer' | 'rejectOffer' | 'updateLocation',
    jest.Mock
  >;
  rideApi: Record<'validatePin' | 'completeRide' | 'markArrived', jest.Mock>;
  billingApi: Record<'requestPayout', jest.Mock>;
};
const loc = location as unknown as Record<
  | 'requestLocationPermission'
  | 'getCurrentPosition'
  | 'watchPosition'
  | 'hasBackgroundLocationPermission'
  | 'requestBackgroundLocationPermission'
  | 'requestNotificationPermission'
  | 'setBackgroundUpdates',
  jest.Mock
>;
const bg = backgroundTracking as unknown as { supported: boolean } & Record<'start' | 'stop' | 'status', jest.Mock>;
const pushMock = push as unknown as Record<'enablePush' | 'disablePush', jest.Mock>;
/** Callback que o store passou ao enablePush (simula a chegada de um push de oferta). */
let deliverPush: (() => void) | null = null;
let alertSpy: jest.SpyInstance;

const position = (latitude: number, longitude: number, over: Partial<DevicePosition> = {}): DevicePosition => ({
  latitude,
  longitude,
  accuracy: 8,
  heading: 90,
  speed: null,
  timestamp: 0,
  ...over,
});

/** Callbacks do watchPosition em andamento (o "GPS" do teste). */
let gps: { emit: (p: DevicePosition) => void; stop: jest.Mock } | null;

const DRIVER = { id: 'u-carlos', name: 'Carlos Eduardo Silva', role: 'driver', status: 'active', phone: '11999992222' };

const earnings = (over: Partial<DriverEarningsSummary> = {}): DriverEarningsSummary => ({
  isOnline: true,
  todayCents: 2485,
  weekCents: 9000,
  daily: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((label, i) => ({
    date: ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'][i]!,
    label,
    cents: i === 6 ? 2485 : 1000 * i,
    isToday: i === 6,
  })),
  availableBalanceCents: 4250,
  pendingBalanceCents: 0,
  ridesCount: 2,
  onlineHours: null,
  rating: 4.98,
  pixKey: 'carlos@voztri.com.br',
  pixKeyType: 'email',
  ...over,
});

const OFFER: DriverRideOffer = {
  rideId: 'ride-1',
  expiresAt: '2026-11-01T12:00:15Z',
  secondsLeft: 15,
  timeoutSeconds: 15,
  pickupAddress: 'Av. Paulista, 1578 - Bela Vista',
  dropoffAddress: 'Av. Faria Lima, 3477 - Itaim Bibi',
  distanceKm: 4.9,
  durationMinutes: 10,
  earningsCents: 1589,
  category: 'pop',
  categoryName: 'VozTri Pop',
  paymentMethod: 'pix',
  passengerName: 'Beatriz Lima',
};

const ride = (status: Ride['status']): Ride => ({
  id: 'ride-1',
  passengerId: 'p-1',
  passenger: { id: 'p-1', user: { id: 'u-bia', name: 'Beatriz Lima', avatarUrl: null, rating: 4.95 } },
  driverId: 'd-1',
  driver: null,
  status,
  category: 'pop',
  categoryName: 'VozTri Pop',
  origin: { address: 'Av. Paulista, 1578 - Bela Vista', shortAddress: 'Av. Paulista, 1578', latitude: -23.56, longitude: -46.65 },
  destination: { address: 'Av. Faria Lima, 3477 - Itaim Bibi', shortAddress: 'Av. Faria Lima, 3477', latitude: -23.58, longitude: -46.67 },
  route: { distanceMeters: 4860, durationSeconds: 600, encodedPolyline: '' },
  priceCents: 1869,
  formattedPrice: 'R$ 18,69',
  boardingPin: null,
  driverEarningsCents: 1589,
  paymentMethod: 'pix',
  paymentStatus: 'pending',
  createdAt: '2026-11-01T12:00:00Z',
});

let server: DriverCurrentState;
let tree: ReactTestRenderer;
const initialState = useDriverStore.getState();

async function renderApp() {
  act(() => {
    tree = renderer.create(<App />);
  });
  await settle();
}

async function renderLoggedIn() {
  m.session.load.mockResolvedValue('token-salvo');
  m.authApi.getMe.mockResolvedValue(DRIVER);
  await renderApp();
}

beforeEach(() => {
  useTestTimers();
  jest.clearAllMocks();
  useDriverStore.setState(initialState, true);
  server = { isOnline: true, offer: null, ride: null };
  m.session.load.mockResolvedValue(null);
  m.session.save.mockResolvedValue(undefined);
  m.session.clear.mockResolvedValue(undefined);
  m.driverApi.getCurrent.mockImplementation(async () => ({ ...server }));
  m.driverApi.getEarnings.mockImplementation(async () => earnings({ isOnline: server.isOnline }));
  m.driverApi.setOnlineStatus.mockImplementation(async (isOnline: boolean) => {
    server.isOnline = isOnline;
    return { isOnline, message: '' };
  });
  m.driverApi.rejectOffer.mockResolvedValue({ success: true });
  m.driverApi.updateLocation.mockResolvedValue({ success: true, arrivedAtPickup: false, rideId: null });

  deliverPush = null;
  pushMock.enablePush.mockImplementation(async (onOffer: () => void) => {
    deliverPush = onOffer;
    return 'enabled';
  });
  pushMock.disablePush.mockResolvedValue(undefined);

  gps = null;
  bg.supported = false;
  bg.start.mockResolvedValue(true);
  bg.stop.mockResolvedValue(undefined);
  loc.hasBackgroundLocationPermission.mockResolvedValue(true); // sem aviso, a não ser nos testes do aviso
  loc.requestBackgroundLocationPermission.mockResolvedValue('granted');
  loc.requestNotificationPermission.mockResolvedValue(true);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  loc.requestLocationPermission.mockResolvedValue('granted');
  loc.getCurrentPosition.mockResolvedValue(position(-23.5615, -46.6559));
  loc.watchPosition.mockImplementation((onPosition: (p: DevicePosition) => void) => {
    const stop = jest.fn(() => {
      gps = null;
    });
    gps = { emit: onPosition, stop };
    return stop;
  });
});

afterEach(() => {
  act(() => tree?.unmount());
  alertSpy.mockRestore();
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

describe('driver-mobile integrado à API', () => {
  it('faz login por OTP e abre o painel com os ganhos da API', async () => {
    m.authApi.requestOtp.mockResolvedValue({ message: 'ok', expiresInSeconds: 600, debugOtp: '123456' });
    m.authApi.verifyOtp.mockResolvedValue({ token: 'novo-token', user: DRIVER });

    await renderApp();
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Entrar como motorista');

    await typeAsync(tree, 'Telefone', '(11) 99999-2222');
    await pressAsync(tree, 'Receber código');
    expect(m.authApi.requestOtp).toHaveBeenCalledWith('(11) 99999-2222', 'driver');
    expect(visibleText(tree)).toContain('o código é 123456');

    await typeAsync(tree, 'Código de verificação', '123456');
    await pressAsync(tree, 'Entrar');
    expect(m.authApi.verifyOtp).toHaveBeenCalledWith('(11) 99999-2222', '123456');
    expect(m.session.save).toHaveBeenCalledWith('novo-token');

    expectNoStrayText(tree);
    const text = visibleText(tree);
    expect(text).toContain('Painel Operacional');
    expect(text).toContain('R$ 24,85');
    expect(text).toContain('Procurando corridas próximas…');
  });

  it('recusa login de telefone que não é de motorista', async () => {
    m.authApi.requestOtp.mockResolvedValue({ message: 'ok', expiresInSeconds: 600, debugOtp: '123456' });
    m.authApi.verifyOtp.mockResolvedValue({ token: 't', user: { ...DRIVER, role: 'passenger' } });
    await renderApp();
    await typeAsync(tree, 'Telefone', '11999991111');
    await pressAsync(tree, 'Receber código');
    await typeAsync(tree, 'Código de verificação', '123456');
    await pressAsync(tree, 'Entrar');
    expect(m.session.save).not.toHaveBeenCalled();
    expect(visibleText(tree)).toContain('não pertence a um motorista');
  });

  it('recebe a oferta pelo polling, aceita, valida o PIN na API e finaliza', async () => {
    await renderLoggedIn();
    expect(visibleText(tree)).toContain('Painel Operacional');

    // Próxima rodada do polling traz a oferta
    server.offer = OFFER;
    await advanceAsync(3000);
    expectNoStrayText(tree);
    let text = visibleText(tree);
    expect(text).toContain('R$ 15,89');
    expect(text).toContain('Beatriz Lima • Pix');
    expect(text).toContain('Expira em 15s');

    m.driverApi.acceptOffer.mockImplementation(async () => {
      server = { isOnline: true, offer: null, ride: ride('DRIVER_EN_ROUTE') };
      return server.ride;
    });
    await pressAsync(tree, 'ACEITAR CORRIDA');
    expect(m.driverApi.acceptOffer).toHaveBeenCalledWith('ride-1');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Buscar passageiro em');

    // Chegada ao embarque: a API avisa o passageiro por push
    m.rideApi.markArrived.mockImplementation(async () => {
      server.ride = ride('DRIVER_ARRIVED');
      return server.ride;
    });
    await pressAsync(tree, 'CHEGUEI AO EMBARQUE');
    // A API confere a distância ao embarque com a posição lida na hora
    expect(m.rideApi.markArrived).toHaveBeenCalledWith('ride-1', { latitude: -23.5615, longitude: -46.6559 });
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('No embarque • passageiro avisado');
    expect(text).not.toContain('CHEGUEI AO EMBARQUE');

    await pressAsync(tree, 'VALIDAR PIN DE EMBARQUE');
    m.rideApi.validatePin.mockRejectedValueOnce({ code: 'INVALID_PIN', message: 'PIN de embarque incorreto.' });
    for (const d of ['9', '9', '9', '9']) await pressAsync(tree, d);
    expect(m.rideApi.validatePin).toHaveBeenLastCalledWith('ride-1', '9999');
    expect(visibleText(tree)).toContain('PIN incorreto');
    expect(useDriverStore.getState().error).toBeNull(); // PIN errado não vira banner de erro

    m.rideApi.validatePin.mockImplementationOnce(async () => {
      server.ride = ride('IN_PROGRESS');
      return server.ride;
    });
    for (const d of ['4', '8', '2', '1']) await pressAsync(tree, d);
    expect(m.rideApi.validatePin).toHaveBeenLastCalledWith('ride-1', '4821');
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('Levar passageiro até');
    expect(text).toContain('FINALIZAR CORRIDA');

    m.rideApi.completeRide.mockImplementation(async () => {
      server.ride = null;
      return ride('COMPLETED');
    });
    const earningsCalls = m.driverApi.getEarnings.mock.calls.length;
    await pressAsync(tree, 'FINALIZAR CORRIDA');
    expect(m.rideApi.completeRide).toHaveBeenCalledWith('ride-1');
    expect(m.driverApi.getEarnings.mock.calls.length).toBeGreaterThan(earningsCalls);
    expect(visibleText(tree)).toContain('Painel Operacional');
  });

  it('mostra a recusa do aviso feito longe do embarque e permite validar o PIN direto', async () => {
    server = { isOnline: true, offer: null, ride: ride('DRIVER_EN_ROUTE') };
    await renderLoggedIn();
    expect(visibleText(tree)).toContain('CHEGUEI AO EMBARQUE');

    const tooFar = 'Você está a 550 m do embarque. Avise a chegada quando estiver a até 300 m.';
    m.rideApi.markArrived.mockRejectedValueOnce({ code: 'TOO_FAR_FROM_PICKUP', message: tooFar });
    await pressAsync(tree, 'CHEGUEI AO EMBARQUE');
    expect(visibleText(tree)).toContain(tooFar);
    expect(useDriverStore.getState().currentRide?.status).toBe('DRIVER_EN_ROUTE');

    // GPS sem resposta e sem leitura recente: deixa a API usar a última posição recebida
    const LocationError = (location as unknown as { LocationError: new (m: string, c: string) => Error }).LocationError;
    loc.getCurrentPosition.mockRejectedValueOnce(new LocationError('Sem sinal.', 'timeout'));
    m.rideApi.markArrived.mockRejectedValueOnce({ code: 'LOCATION_REQUIRED', message: 'Não foi possível confirmar sua localização.' });
    await pressAsync(tree, 'CHEGUEI AO EMBARQUE');
    expect(m.rideApi.markArrived).toHaveBeenLastCalledWith('ride-1', undefined);

    // O PIN segue disponível como ação secundária
    await pressAsync(tree, 'VALIDAR PIN DE EMBARQUE');
    m.rideApi.validatePin.mockResolvedValueOnce(ride('IN_PROGRESS'));
    for (const d of ['4', '8', '2', '1']) await pressAsync(tree, d);
    expect(m.rideApi.validatePin).toHaveBeenCalledWith('ride-1', '4821');
  });

  it('recusa a oferta pela API', async () => {
    await renderLoggedIn();
    server.offer = OFFER;
    await advanceAsync(3000);

    m.driverApi.rejectOffer.mockImplementation(async () => {
      server.offer = null;
      return { success: true };
    });
    await pressAsync(tree, 'Recusar');
    expect(m.driverApi.rejectOffer).toHaveBeenCalledWith('ride-1');
    expect(visibleText(tree)).not.toContain('Seu Ganho Líquido');
  });

  it('mostra o erro quando a oferta expirou antes do aceite', async () => {
    await renderLoggedIn();
    server.offer = OFFER;
    await advanceAsync(3000);

    m.driverApi.acceptOffer.mockImplementation(async () => {
      server.offer = null;
      throw { code: 'OFFER_EXPIRED', message: 'A oferta expirou.' };
    });
    await pressAsync(tree, 'ACEITAR CORRIDA');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('A oferta expirou.');
    expect(visibleText(tree)).not.toContain('Seu Ganho Líquido');

    await pressAsync(tree, 'Dispensar aviso');
    expect(visibleText(tree)).not.toContain('A oferta expirou.');
  });

  it('fica offline pela API e para o polling', async () => {
    await renderLoggedIn();
    await pressAsync(tree, 'Disponibilidade para corridas');
    expect(m.driverApi.setOnlineStatus).toHaveBeenCalledWith(false);
    expect(visibleText(tree)).toContain('OFFLINE');
    expect(visibleText(tree)).toContain('Fique online para receber corridas');

    const calls = m.driverApi.getCurrent.mock.calls.length;
    await advanceAsync(9000);
    expect(m.driverApi.getCurrent.mock.calls.length).toBe(calls);
  });

  it('mostra e limpa o aviso de falta de conexão', async () => {
    await renderLoggedIn();
    m.driverApi.getCurrent.mockRejectedValueOnce({ message: 'Sem conexão com a API (http://10.0.2.2:8080/api/v1).' });
    await advanceAsync(3000);
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Sem conexão com a API');

    await advanceAsync(3000);
    expect(visibleText(tree)).not.toContain('Sem conexão com a API');
  });

  it('mostra o gráfico da semana e faz o repasse Pix do saldo', async () => {
    await renderLoggedIn();
    await pressAsync(tree, 'Ver Extrato ›');
    expectNoStrayText(tree);
    let text = visibleText(tree);
    expect(text).toContain('R$ 90,00');
    expect(text).toContain('26/10 - 01/11');

    await pressAsync(tree, 'Transferir Saldo via Pix');
    expect(visibleText(tree)).toContain('R$ 42,50');

    m.billingApi.requestPayout.mockResolvedValue({ success: true, payoutId: 'p-1' });
    m.driverApi.getEarnings.mockResolvedValue(earnings({ availableBalanceCents: 0 }));
    await pressAsync(tree, 'TRANSFERIR AGORA VIA PIX');
    expect(m.billingApi.requestPayout).toHaveBeenCalledWith({
      amountCents: 4250,
      pixKey: 'carlos@voztri.com.br',
      pixKeyType: 'email',
    });
    expectNoStrayText(tree);
    text = visibleText(tree);
    expect(text).toContain('Transferência Pix Enviada!');
    expect(text).toContain('O valor de R$ 42,50 foi transferido');
  });

  it('bloqueia o repasse abaixo do mínimo', async () => {
    await renderLoggedIn();
    m.driverApi.getEarnings.mockResolvedValue(earnings({ availableBalanceCents: 500 }));
    await pressAsync(tree, 'Ver Extrato ›');
    await pressAsync(tree, 'Transferir Saldo via Pix');
    expect(isDisabled(tree, 'TRANSFERIR AGORA VIA PIX')).toBe(true);
    expect(visibleText(tree)).toContain('O saque mínimo é R$ 10,00.');
  });

  it('atualiza a corrida na hora quando a posição enviada marca a chegada ao embarque', async () => {
    server = { isOnline: true, offer: null, ride: ride('DRIVER_EN_ROUTE') };
    await renderLoggedIn();
    await settle();
    expect(gps).not.toBeNull();

    // O backend marcou DRIVER_ARRIVED ao receber esta posição (a até 100 m do embarque)
    m.driverApi.updateLocation.mockImplementationOnce(async () => {
      server.ride = ride('DRIVER_ARRIVED');
      return { success: true, arrivedAtPickup: true, rideId: 'ride-1' };
    });
    const calls = m.driverApi.getCurrent.mock.calls.length;
    await act(async () => gps!.emit(position(-23.5601, -46.6559)));
    await settle();

    expect(m.driverApi.getCurrent.mock.calls.length).toBe(calls + 1); // sem esperar o polling
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('No embarque • passageiro avisado');
    expect(visibleText(tree)).not.toContain('CHEGUEI AO EMBARQUE');
  });

  it('pede a permissão e envia a posição ao ficar online', async () => {
    server.isOnline = false;
    await renderLoggedIn();
    expect(loc.watchPosition).not.toHaveBeenCalled(); // offline: GPS desligado

    loc.getCurrentPosition.mockResolvedValue(position(-23.5615, -46.6559, { heading: 45.5, speed: 3.2 }));
    await pressAsync(tree, 'Disponibilidade para corridas');

    expect(loc.requestLocationPermission).toHaveBeenCalled();
    expect(m.driverApi.setOnlineStatus).toHaveBeenCalledWith(true);
    expect(m.driverApi.updateLocation).toHaveBeenCalledWith({ latitude: -23.5615, longitude: -46.6559, heading: 45.5, speed: 3.2 });
    expect(loc.watchPosition).toHaveBeenCalled();
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('GPS ativo • precisão ±8 m');
  });

  it('não fica online sem permissão de localização', async () => {
    server.isOnline = false;
    await renderLoggedIn();
    loc.requestLocationPermission.mockResolvedValue('blocked');

    await pressAsync(tree, 'Disponibilidade para corridas');
    expect(m.driverApi.setOnlineStatus).not.toHaveBeenCalled();
    expectNoStrayText(tree);
    const text = visibleText(tree);
    expect(text).toContain('Libere nas configurações do aparelho para ficar online.');
    expect(text).toContain('OFFLINE');
  });

  it('envia a posição do GPS com intervalo mínimo e sem heading/speed desconhecidos', async () => {
    await renderLoggedIn();
    expect(gps).not.toBeNull();
    m.driverApi.updateLocation.mockClear();

    // Primeira leitura: enviada (heading e speed desconhecidos não vão para a API)
    await act(async () => gps!.emit(position(-23.5615, -46.6559, { heading: null, speed: null })));
    expect(m.driverApi.updateLocation).toHaveBeenCalledTimes(1);
    expect(m.driverApi.updateLocation).toHaveBeenLastCalledWith({ latitude: -23.5615, longitude: -46.6559 });

    // Movimento pequeno logo em seguida: segura até o intervalo de 10 s
    await act(async () => gps!.emit(position(-23.5617, -46.6560)));
    expect(m.driverApi.updateLocation).toHaveBeenCalledTimes(1);

    await advanceAsync(10_000);
    await act(async () => gps!.emit(position(-23.5619, -46.6561)));
    expect(m.driverApi.updateLocation).toHaveBeenCalledTimes(2);

    // Deslocamento grande (> 200 m): envia na hora
    await act(async () => gps!.emit(position(-23.5650, -46.6600)));
    expect(m.driverApi.updateLocation).toHaveBeenCalledTimes(3);
  });

  it('para o GPS ao ficar offline e avisa quando o sinal falha', async () => {
    await renderLoggedIn();
    const LocationError = (location as unknown as { LocationError: new (m: string, c: string) => Error }).LocationError;
    const onError = loc.watchPosition.mock.calls[0]![1] as (e: Error) => void;
    await act(async () => onError(new LocationError('Localização indisponível. Verifique se o GPS está ligado.', 'unavailable')));
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Verifique se o GPS está ligado. Sem ela você não recebe corridas próximas.');

    const stop = gps!.stop;
    await pressAsync(tree, 'Disponibilidade para corridas');
    expect(stop).toHaveBeenCalled();
    expect(visibleText(tree)).not.toContain('GPS');
  });

  describe('segundo plano', () => {
    it('Android: inicia o serviço nativo, que passa a ser o único a enviar', async () => {
      bg.supported = true;
      await renderLoggedIn();

      expect(loc.requestNotificationPermission).toHaveBeenCalled();
      expect(bg.start).toHaveBeenCalledWith({
        apiUrl: 'http://localhost:8080/api/v1',
        token: 'token-salvo',
        intervalMs: 10_000,
        distanceM: 200,
        distanceFilterM: 25,
      });
      expect(loc.setBackgroundUpdates).not.toHaveBeenCalledWith(true);

      // O GPS do JS só atualiza a tela; quem envia é o serviço
      m.driverApi.updateLocation.mockClear();
      await act(async () => gps!.emit(position(-23.5615, -46.6559)));
      expect(m.driverApi.updateLocation).not.toHaveBeenCalled();
      expectNoStrayText(tree);
      expect(visibleText(tree)).toContain('GPS ativo • precisão ±8 m • também em segundo plano');
    });

    it('Android: se o serviço não iniciar, o app envia pelo JS e avisa', async () => {
      bg.supported = true;
      bg.start.mockResolvedValue(false);
      await renderLoggedIn();
      m.driverApi.updateLocation.mockClear();

      await act(async () => gps!.emit(position(-23.5615, -46.6559)));
      expect(m.driverApi.updateLocation).toHaveBeenCalledTimes(1);
      expect(visibleText(tree)).toContain('• só com o app aberto');
    });

    it('para o serviço ao ficar offline, mas não ao desmontar a tela', async () => {
      bg.supported = true;
      await renderLoggedIn();
      expect(bg.start).toHaveBeenCalled();

      await pressAsync(tree, 'Disponibilidade para corridas');
      expect(bg.stop).toHaveBeenCalled();
      expect(loc.setBackgroundUpdates).toHaveBeenLastCalledWith(false);

      // Online de novo: a tela destruída (app tirado dos recentes) não derruba o serviço
      await pressAsync(tree, 'Disponibilidade para corridas');
      bg.stop.mockClear();
      act(() => tree.unmount());
      expect(bg.stop).not.toHaveBeenCalled();
      tree = renderer.create(<View />); // o afterEach desmonta
    });

    it('iOS: liga as atualizações em segundo plano do GPS no turno online', async () => {
      await renderLoggedIn();
      expect(bg.start).not.toHaveBeenCalled();
      expect(loc.setBackgroundUpdates).toHaveBeenCalledWith(true);
      await act(async () => gps!.emit(position(-23.5615, -46.6559)));
      expect(m.driverApi.updateLocation).toHaveBeenCalled(); // no iOS quem envia é o JS
      expect(visibleText(tree)).toContain('também em segundo plano');
    });

    it('explica e pede a localização em segundo plano à parte, uma vez por sessão', async () => {
      loc.hasBackgroundLocationPermission.mockResolvedValue(false);
      await renderLoggedIn();

      expect(alertSpy).toHaveBeenCalledTimes(1);
      const [title, message, buttons] = alertSpy.mock.calls[0]!;
      expect(title).toBe('Localização em segundo plano');
      expect(message).toContain('Ela nunca é usada quando você está offline.');
      expect(loc.requestBackgroundLocationPermission).not.toHaveBeenCalled(); // só depois do aviso

      await act(async () => {
        (buttons as { text: string; onPress: () => void }[]).find((b) => b.text === 'Continuar')!.onPress();
      });
      await settle();
      expect(loc.requestBackgroundLocationPermission).toHaveBeenCalledTimes(1);
      expect(useDriverStore.getState().backgroundPermission).toBe('granted');

      // Offline e online de novo na mesma sessão: não pergunta outra vez
      await pressAsync(tree, 'Disponibilidade para corridas');
      await pressAsync(tree, 'Disponibilidade para corridas');
      expect(alertSpy).toHaveBeenCalledTimes(1);
    });

    it('não insiste se o motorista recusar o aviso', async () => {
      loc.hasBackgroundLocationPermission.mockResolvedValue(false);
      await renderLoggedIn();
      const buttons = alertSpy.mock.calls[0]![2] as { text: string; onPress: () => void }[];
      await act(async () => buttons.find((b) => b.text === 'Agora não')!.onPress());
      expect(loc.requestBackgroundLocationPermission).not.toHaveBeenCalled();
      expect(useDriverStore.getState().backgroundPermission).toBe('denied');
      await act(async () => gps!.emit(position(-23.5615, -46.6559)));
      expect(visibleText(tree)).toContain('GPS ativo'); // segue funcionando em primeiro plano
    });
  });

  it('retoma a sessão salva e sai da conta', async () => {
    await renderLoggedIn();
    expect(m.authApi.getMe).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Painel Operacional');

    await pressAsync(tree, 'Sair da conta');
    expect(m.driverApi.setOnlineStatus).toHaveBeenCalledWith(false);
    expect(m.session.clear).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Entrar como motorista');
  });

  describe('push de novas ofertas', () => {
    it('ativa o push ao entrar e mostra a oferta assim que a mensagem chega', async () => {
      await renderLoggedIn();
      expect(pushMock.enablePush).toHaveBeenCalledTimes(1);
      expect(useDriverStore.getState().pushStatus).toBe('enabled');
      expect(visibleText(tree)).not.toContain('Av. Paulista, 1578');

      // A oferta chega pelo push antes do próximo ciclo do polling
      server.offer = OFFER;
      const calls = m.driverApi.getCurrent.mock.calls.length;
      await act(async () => deliverPush!());
      await settle();
      expect(m.driverApi.getCurrent.mock.calls.length).toBe(calls + 1);
      expect(visibleText(tree)).toContain('Av. Paulista, 1578');
    });

    it('sem Firebase configurado o app segue só com o polling', async () => {
      pushMock.enablePush.mockResolvedValue('unavailable');
      await renderLoggedIn();

      expect(useDriverStore.getState().pushStatus).toBe('unavailable');
      expect(visibleText(tree)).toContain('Painel Operacional');
    });

    it('remove o token antes de limpar a sessão no logout', async () => {
      const order: string[] = [];
      pushMock.disablePush.mockImplementation(async () => void order.push('push'));
      m.session.clear.mockImplementation(async () => void order.push('session'));
      await renderLoggedIn();

      await pressAsync(tree, 'Sair da conta');

      expect(pushMock.disablePush).toHaveBeenCalledWith();
      expect(order).toEqual(['push', 'session']);
    });

    it('sessão expirada invalida o token do aparelho', async () => {
      await renderLoggedIn();
      const handler = m.onUnauthorized.mock.calls[0]![0] as () => void;

      await act(async () => handler());

      expect(pushMock.disablePush).toHaveBeenCalledWith({ revoke: true });
      expect(useDriverStore.getState().pushStatus).toBe('off');
    });
  });
});
