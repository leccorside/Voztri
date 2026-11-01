import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { DriverCurrentState, DriverEarningsSummary, DriverRideOffer, Ride } from '@voztri/shared-types';
import { App } from '../src/App';
import { useDriverStore } from '../src/store/driverStore';
import * as api from '../src/api';
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
  },
  rideApi: { validatePin: jest.fn(), completeRide: jest.fn() },
  billingApi: { requestPayout: jest.fn() },
  apiErrorCode: (err: { code?: string }) => err?.code ?? null,
  errorMessage: (err: { message?: string }) => err?.message ?? 'Erro',
}));

const m = api as unknown as {
  session: Record<'load' | 'save' | 'clear', jest.Mock>;
  authApi: Record<'requestOtp' | 'verifyOtp' | 'getMe', jest.Mock>;
  driverApi: Record<'getCurrent' | 'getEarnings' | 'setOnlineStatus' | 'acceptOffer' | 'rejectOffer', jest.Mock>;
  rideApi: Record<'validatePin' | 'completeRide', jest.Mock>;
  billingApi: Record<'requestPayout', jest.Mock>;
};

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

  it('retoma a sessão salva e sai da conta', async () => {
    await renderLoggedIn();
    expect(m.authApi.getMe).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Painel Operacional');

    await pressAsync(tree, 'Sair da conta');
    expect(m.driverApi.setOnlineStatus).toHaveBeenCalledWith(false);
    expect(m.session.clear).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Entrar como motorista');
  });
});
