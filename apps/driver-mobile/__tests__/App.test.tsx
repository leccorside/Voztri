import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { App } from '../src/App';
import { useDriverStore } from '../src/store/driverStore';
import { advance, expectNoStrayText, findStrayText, press, visibleText } from './rnTree';

const initialState = useDriverStore.getState();

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
});

describe('driver-mobile: telas em React Native', () => {
  let tree: ReactTestRenderer;

  beforeEach(() => {
    jest.useFakeTimers();
    useDriverStore.setState(initialState, true);
    act(() => {
      tree = renderer.create(<App />);
    });
  });

  afterEach(() => {
    act(() => tree.unmount());
    jest.useRealTimers();
  });

  it('abre o painel sem texto fora de <Text>', () => {
    expectNoStrayText(tree);
    const text = visibleText(tree);
    expect(text).toContain('Painel Operacional');
    expect(text).toContain('R$ 248,50');
    expect(text).toContain('ONLINE');
  });

  it('percorre oferta → aceite → PIN → corrida → finalização', () => {
    press(tree, 'Simular Solicitação de Corrida (Demo)');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Expira em 15s');

    // O contador regressivo continua funcionando
    advance(3000);
    expect(visibleText(tree)).toContain('Expira em 12s');

    press(tree, 'ACEITAR CORRIDA');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Chegando ao ponto de embarque');

    press(tree, 'VALIDAR PIN DE EMBARQUE (1234)');
    expectNoStrayText(tree);

    // PIN errado mostra erro
    ['9', '9', '9', '9'].forEach((d) => press(tree, d));
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('PIN inválido!');

    // Apaga e digita o PIN certo
    ['Apagar', 'Apagar', 'Apagar', 'Apagar'].forEach((k) => press(tree, k));
    ['1', '2', '3', '4'].forEach((d) => press(tree, d));
    advance(300);
    expectNoStrayText(tree);
    expect(useDriverStore.getState().currentRide?.status).toBe('IN_PROGRESS');
    expect(visibleText(tree)).toContain('Vire à direita');

    press(tree, 'FINALIZAR CORRIDA');
    expectNoStrayText(tree);
    expect(useDriverStore.getState().todayRidesCount).toBe(initialState.todayRidesCount + 1);
    expect(visibleText(tree)).toContain('R$ 270,00'); // 248,50 + 21,50
  });

  it('recusa a oferta automaticamente quando o tempo acaba', () => {
    press(tree, 'Simular Solicitação de Corrida (Demo)');
    advance(16000);
    expect(useDriverStore.getState().incomingOffer).toBeNull();
    expectNoStrayText(tree);
  });

  it('navega por extrato e repasse Pix', () => {
    press(tree, 'Ver Extrato ›');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Ganhos da Semana');

    press(tree, 'Transferir Saldo via Pix');
    expectNoStrayText(tree);
    press(tree, 'TRANSFERIR AGORA VIA PIX');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Transferência Pix Enviada!');

    press(tree, '← Voltar');
    press(tree, '← Voltar');
    expect(visibleText(tree)).toContain('Painel Operacional');
  });

  it('alterna online/offline', () => {
    press(tree, 'Disponibilidade para corridas');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('OFFLINE');
    expect(visibleText(tree)).not.toContain('Simular Solicitação');
  });
});
