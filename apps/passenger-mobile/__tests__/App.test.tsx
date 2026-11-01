import React from 'react';
import { Text, View } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { App } from '../src/App';
import { usePassengerStore } from '../src/store/passengerStore';
import { advance, expectNoStrayText, findStrayText, press, typeInto, visibleText } from './rnTree';

const initialState = usePassengerStore.getState();

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

describe('passenger-mobile: telas em React Native', () => {
  let tree: ReactTestRenderer;

  beforeEach(() => {
    jest.useFakeTimers();
    usePassengerStore.setState(initialState, true);
    act(() => {
      tree = renderer.create(<App />);
    });
  });

  afterEach(() => {
    act(() => tree.unmount());
    jest.useRealTimers();
  });

  it('abre a tela inicial sem texto fora de <Text>', () => {
    expectNoStrayText(tree);
    const text = visibleText(tree);
    expect(text).toContain('Para onde vamos hoje?');
    expect(text).toContain('Você está aqui');
  });

  it('percorre destino → categoria → pagamento → busca → motorista → avaliação', () => {
    press(tree, 'Buscar endereço de destino');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Destinos Recomendados');

    typeInto(tree, 'Destino', 'Faria');
    press(tree, /^Av\. Faria Lima, 3477,/);
    expectNoStrayText(tree);
    expect(usePassengerStore.getState().currentStep).toBe('SELECT_CATEGORY');

    press(tree, /^VozTri Black,/);
    expect(usePassengerStore.getState().selectedCategory).toBe('black');

    // Seletor de pagamento (substituto do <select>)
    press(tree, /^Forma de pagamento: /);
    expectNoStrayText(tree);
    press(tree, 'Dinheiro em espécie');
    expectNoStrayText(tree);
    expect(usePassengerStore.getState().selectedPaymentMethod).toBe('cash');
    expect(visibleText(tree)).toContain('Dinheiro em espécie ▾');

    press(tree, /^SOLICITAR VOZTRI BLACK/);
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Buscando o melhor motorista...');

    // Matching simulado após 3 s
    advance(3000);
    expectNoStrayText(tree);
    expect(usePassengerStore.getState().currentStep).toBe('DRIVER_EN_ROUTE');
    expect(visibleText(tree)).toContain('Chegando em ~3 minutos');

    // Chat: mensagem digitada e resposta rápida
    press(tree, '💬 Mensagem (Chat)');
    expectNoStrayText(tree);
    typeInto(tree, 'Mensagem para o motorista', 'Estou de camisa azul');
    press(tree, 'Enviar');
    advance(1);
    press(tree, 'Estou no portão');
    expectNoStrayText(tree);
    const texts = usePassengerStore.getState().chatMessages.map((m) => m.text);
    expect(texts).toEqual(expect.arrayContaining(['Estou de camisa azul', 'Estou no portão']));
    press(tree, 'Fechar chat');

    // SOS: aciona, PIN errado mostra erro, PIN certo desativa
    press(tree, 'Acionar central de emergência SOS 24 horas');
    press(tree, 'ACIONAR SOS IMEDIATAMENTE');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('O ALERTA SOS ESTÁ ATIVO!');
    typeInto(tree, 'PIN de emergência', '0000');
    press(tree, 'Desativar Alerta com PIN');
    expect(visibleText(tree)).toContain('PIN incorreto!');
    typeInto(tree, 'PIN de emergência', '1234');
    press(tree, 'Desativar Alerta com PIN');
    expect(usePassengerStore.getState().isSosActive).toBe(false);
    expectNoStrayText(tree);

    // Conclusão e avaliação
    press(tree, 'Concluir Viagem (Demo)');
    expectNoStrayText(tree);
    expect(visibleText(tree)).toContain('Você chegou ao seu destino!');
    press(tree, '3 estrelas');
    press(tree, '+ R$ 5,00');
    expectNoStrayText(tree);
    press(tree, 'CONCLUIR AVALIAÇÃO');
    expect(usePassengerStore.getState().currentStep).toBe('HOME');
    expect(visibleText(tree)).toContain('Para onde vamos hoje?');
  });

  it('cancela a busca de motorista', () => {
    press(tree, 'Buscar endereço de destino');
    press(tree, /^Aeroporto de Congonhas,/);
    press(tree, /^SOLICITAR /);
    press(tree, 'Cancelar Busca');
    expectNoStrayText(tree);
    expect(usePassengerStore.getState().currentStep).toBe('HOME');

    // O timer de matching não deve reabrir a corrida cancelada
    advance(3000);
    expect(usePassengerStore.getState().currentStep).toBe('HOME');
  });
});
