/**
 * ProfileScreen ("Meu perfil", comum aos apps), sem store: envia só o que mudou,
 * valida antes de enviar, mostra os erros por campo da API e o telefone formatado.
 */
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { formatPhone, ProfileScreen, type ProfileSaveResult } from '../src';
import { expectNoStrayText, isDisabled, pressAsync, typeAsync, useTestTimers, visibleText } from './rnTree';

let tree: ReactTestRenderer;

beforeEach(() => useTestTimers());
afterEach(() => {
  act(() => tree?.unmount());
  jest.useRealTimers();
});

const USER = { name: 'Beatriz Lima', email: 'bia@exemplo.com', phone: '11999991111' };

function render(save: jest.Mock = jest.fn(async (): Promise<ProfileSaveResult> => ({ ok: true })), user = USER) {
  const onBack = jest.fn();
  act(() => {
    tree = renderer.create(<ProfileScreen user={user} save={save} onBack={onBack} busy={false} />);
  });
  return { save, onBack };
}

it('formatPhone: celular, fixo, com DDI e formato desconhecido', () => {
  expect(formatPhone('11999991111')).toBe('(11) 99999-1111');
  expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  expect(formatPhone('+55 11 99999-1111')).toBe('(11) 99999-1111');
  expect(formatPhone('123')).toBe('123');
});

it('mostra os dados atuais e o telefone só para leitura; sem mudança, não salva', () => {
  render();
  expectNoStrayText(tree);
  const text = visibleText(tree);
  expect(text).toContain('Meu perfil');
  expect(text).toContain('(11) 99999-1111');
  expect(text).toContain('Ele não pode ser trocado por aqui.');
  expect(isDisabled(tree, 'Salvar perfil')).toBe(true);
});

it('envia só os campos alterados, já limpos', async () => {
  const { save } = render();
  await typeAsync(tree, 'Nome', '  Beatriz   Souza ');
  await pressAsync(tree, 'Salvar perfil');

  expect(save).toHaveBeenCalledWith({ name: 'Beatriz Souza' });
  expect(visibleText(tree)).toContain('Perfil atualizado.');
});

it('e-mail apagado vai como null; e-mail em minúsculas', async () => {
  const { save } = render();
  await typeAsync(tree, 'E-mail', '');
  await pressAsync(tree, 'Salvar perfil');
  expect(save).toHaveBeenLastCalledWith({ email: null });

  await typeAsync(tree, 'E-mail', ' Bia@Novo.COM ');
  await pressAsync(tree, 'Salvar perfil');
  expect(save).toHaveBeenLastCalledWith({ email: 'bia@novo.com' });
});

it('valida antes de enviar (nome curto ou vazio, e-mail inválido)', async () => {
  const { save } = render();
  await typeAsync(tree, 'Nome', 'B');
  await typeAsync(tree, 'E-mail', 'nao-e-email');
  await pressAsync(tree, 'Salvar perfil');

  expect(save).not.toHaveBeenCalled();
  let text = visibleText(tree);
  expect(text).toContain('O nome precisa ter pelo menos 2 letras.');
  expect(text).toContain('Informe um e-mail válido.');

  // Corrigir o campo tira o aviso dele
  await typeAsync(tree, 'Nome', '   ');
  await pressAsync(tree, 'Salvar perfil');
  text = visibleText(tree);
  expect(text).toContain('Informe seu nome.');
});

it('erro por campo da API aparece no campo; erro geral aparece embaixo', async () => {
  const save = jest
    .fn()
    .mockResolvedValueOnce({ ok: false, message: 'x', fields: { email: 'Este e-mail já está em uso por outra conta.' } })
    .mockResolvedValueOnce({ ok: false, message: 'Sem conexão com a API.', fields: {} });
  render(save);
  await typeAsync(tree, 'E-mail', 'ocupado@exemplo.com');
  await pressAsync(tree, 'Salvar perfil');

  let text = visibleText(tree);
  expect(text).toContain('Este e-mail já está em uso por outra conta.');
  expect(text).not.toContain('Perfil atualizado.');

  await typeAsync(tree, 'E-mail', 'livre@exemplo.com');
  await pressAsync(tree, 'Salvar perfil');
  text = visibleText(tree);
  expect(text).toContain('Sem conexão com a API.');
  expect(text).not.toContain('Este e-mail já está em uso');
});

it('sem e-mail na conta: campo vazio, e o voltar chama onBack', async () => {
  const { onBack } = render(undefined, { ...USER, email: null as unknown as string });
  const input = tree.root.find((n) => n.props.accessibilityLabel === 'E-mail' && n.props.onChangeText);
  expect(input.props.value).toBe('');
  await pressAsync(tree, 'Voltar');
  expect(onBack).toHaveBeenCalled();
});
