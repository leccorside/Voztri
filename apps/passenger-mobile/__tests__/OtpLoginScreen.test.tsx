/**
 * Tela de login comum do @voztri/mobile-core, sem store: papel, textos
 * sobrescritos, código de depuração, erro e "Trocar telefone".
 */
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { OtpLoginScreen } from '@voztri/mobile-core';
import { expectNoStrayText, isDisabled, pressAsync, typeAsync, useTestTimers, visibleText } from './rnTree';

let tree: ReactTestRenderer;

beforeEach(() => useTestTimers());
afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

const render = (element: React.ReactElement) => {
  act(() => {
    tree = renderer.create(element);
  });
};

it('motorista: selo "Driver" e título do papel; passageiro: sem selo', () => {
  const props = { requestCode: jest.fn(), login: jest.fn(), busy: false, error: null };

  render(<OtpLoginScreen role="driver" {...props} />);
  expectNoStrayText(tree);
  expect(visibleText(tree)).toContain('Driver');
  expect(visibleText(tree)).toContain('Entrar como motorista');
  act(() => tree.unmount());

  render(<OtpLoginScreen role="passenger" {...props} />);
  expect(visibleText(tree)).toContain('Entrar na VOZTRI');
  expect(visibleText(tree)).not.toContain('Driver');
});

it('textos podem ser sobrescritos (inclusive tirar o selo)', () => {
  render(
    <OtpLoginScreen
      role="driver"
      requestCode={jest.fn()}
      login={jest.fn()}
      busy={false}
      error={null}
      texts={{ title: 'Acesso do parceiro', hint: 'Use o telefone cadastrado.', badge: null }}
    />,
  );
  const text = visibleText(tree);
  expect(text).toContain('Acesso do parceiro');
  expect(text).toContain('Use o telefone cadastrado.');
  expect(text).not.toContain('Driver');
});

it('pede o código, mostra o de depuração, entra e permite trocar o telefone', async () => {
  const requestCode = jest.fn().mockResolvedValue('123456');
  const login = jest.fn().mockResolvedValue(true);
  render(<OtpLoginScreen role="passenger" requestCode={requestCode} login={login} busy={false} error={null} />);

  expect(isDisabled(tree, 'Receber código')).toBe(true); // telefone incompleto
  await typeAsync(tree, 'Telefone', '(11) 99999-1111');
  await pressAsync(tree, 'Receber código');
  expect(requestCode).toHaveBeenCalledWith('(11) 99999-1111');
  expect(visibleText(tree)).toContain('Em desenvolvimento, o código é 123456.');

  await typeAsync(tree, 'Código de verificação', '12a3456');
  await pressAsync(tree, 'Entrar');
  expect(login).toHaveBeenCalledWith('(11) 99999-1111', '123456');

  await pressAsync(tree, 'Trocar telefone');
  expect(visibleText(tree)).toContain('Entrar na VOZTRI');
});

it('falha ao pedir o código fica no passo do telefone e mostra o erro', async () => {
  const requestCode = jest.fn().mockResolvedValue(null);
  render(
    <OtpLoginScreen role="driver" requestCode={requestCode} login={jest.fn()} busy={false} error="Telefone inválido." />,
  );
  await typeAsync(tree, 'Telefone', '11999992222');
  await pressAsync(tree, 'Receber código');
  const text = visibleText(tree);
  expect(text).toContain('Entrar como motorista');
  expect(text).toContain('Telefone inválido.');
});
