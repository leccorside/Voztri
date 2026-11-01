import React from 'react';
import { Alert, Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import type { ChatMessage, FareEstimate, Ride } from '@voztri/shared-types';
import { App } from '../src/App';
import { usePassengerStore } from '../src/store/passengerStore';
import * as api from '../src/api';
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
  authApi: { requestOtp: jest.fn(), verifyOtp: jest.fn(), getMe: jest.fn() },
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
}));

type Mocks<K extends string> = Record<K, jest.Mock>;
const m = api as unknown as {
  session: Mocks<'load' | 'save' | 'clear'>;
  activeRideMemory: Mocks<'load' | 'save' | 'clear'>;
  authApi: Mocks<'requestOtp' | 'verifyOtp' | 'getMe'>;
  rideApi: Mocks<
    'getEstimates' | 'requestRide' | 'getRide' | 'cancelRide' | 'getChatMessages' | 'sendChatMessage' | 'triggerSos' | 'cancelSos'
  >;
  billingApi: Mocks<'submitRating'>;
};

const PASSENGER = { id: 'u-bia', name: 'Beatriz Lima', role: 'passenger', status: 'active', phone: '11999991111' };

const ESTIMATES: FareEstimate[] = [
  { category: 'pop', categoryName: 'VozTri Pop', priceCents: 1869, formattedPrice: 'R$ 18,69', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Pop' },
  { category: 'black', categoryName: 'VozTri Black', priceCents: 3052, formattedPrice: 'R$ 30,52', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Black' },
  { category: 'mulher', categoryName: 'VozTri Mulher', priceCents: 1988, formattedPrice: 'R$ 19,88', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Mulher' },
  { category: 'moto', categoryName: 'VozTri Moto', priceCents: 1230, formattedPrice: 'R$ 12,30', estimatedMinutes: 10, distanceKm: 4.86, surgeMultiplier: 1, description: 'Moto' },
];

const ride = (status: Ride['status'], over: Partial<Ride> = {}): Ride => ({
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

async function renderLoggedIn(storedRideId: string | null = null) {
  m.session.load.mockResolvedValue('token-salvo');
  m.authApi.getMe.mockResolvedValue(PASSENGER);
  m.activeRideMemory.load.mockResolvedValue(storedRideId);
  act(() => {
    tree = renderer.create(<App />);
  });
  await settle();
}

/** Da tela inicial até a corrida solicitada (Black, dinheiro). */
async function requestBlackRide() {
  await pressAsync(tree, 'Buscar endereço de destino');
  await pressAsync(tree, /^Av\. Faria Lima, 3477,/);
  await pressAsync(tree, /^VozTri Black,/);
  await pressAsync(tree, /^Forma de pagamento: /);
  await pressAsync(tree, 'Dinheiro em espécie');
  await pressAsync(tree, /^SOLICITAR VOZTRI BLACK/);
}

beforeEach(() => {
  useTestTimers();
  jest.clearAllMocks();
  usePassengerStore.setState(initialState, true);
  serverRide = ride('SEARCHING');
  chat = [];
  m.session.load.mockResolvedValue(null);
  m.session.save.mockResolvedValue(undefined);
  m.session.clear.mockResolvedValue(undefined);
  m.activeRideMemory.load.mockResolvedValue(null);
  m.activeRideMemory.save.mockResolvedValue(undefined);
  m.activeRideMemory.clear.mockResolvedValue(undefined);
  m.rideApi.getEstimates.mockResolvedValue(ESTIMATES);
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

    await pressAsync(tree, 'Buscar endereço de destino');
    await typeAsync(tree, 'Destino', 'faria');
    expect(visibleText(tree)).not.toContain('Aeroporto de Congonhas'); // filtro por texto
    await pressAsync(tree, /^Av\. Faria Lima, 3477,/);

    // Estimativas vêm da API, com a origem e o destino escolhidos
    expect(m.rideApi.getEstimates).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: -23.561414, longitude: -46.655881 }),
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
      expect.objectContaining({ category: 'black', paymentMethod: 'cash' }),
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
    m.rideApi.triggerSos.mockResolvedValue({ success: true, incidentId: 'inc-1' });
    await pressAsync(tree, 'Acionar central de emergência SOS 24 horas');
    await pressAsync(tree, 'ACIONAR SOS IMEDIATAMENTE');
    expect(m.rideApi.triggerSos).toHaveBeenCalledWith('ride-1', -23.561414, -46.655881);
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

  it('mostra erro e permite tentar de novo quando a estimativa falha', async () => {
    await renderLoggedIn();
    m.rideApi.getEstimates.mockRejectedValueOnce({ message: 'Sem conexão com a API.' });
    await pressAsync(tree, 'Buscar endereço de destino');
    await pressAsync(tree, /^Av\. Faria Lima, 3477,/);
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Não foi possível calcular os preços.');
    expect(visibleText(tree)).toContain('Sem conexão com a API.');

    await pressAsync(tree, 'Tentar de novo');
    expect(visibleText(tree)).toContain('R$ 18,69');
  });

  it('sai da conta pelo avatar', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === 'Sair')?.onPress?.();
    });
    await renderLoggedIn();
    await pressAsync(tree, /^Conta de Beatriz Lima/);
    await settle();
    expect(m.session.clear).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Entrar na VOZTRI');
    alertSpy.mockRestore();
  });
});
