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

function render(
  save: jest.Mock = jest.fn(async (): Promise<ProfileSaveResult> => ({ ok: true })),
  user = USER,
  photo: { uri: string | null; token: string | null } = { uri: null, token: 'tk' },
) {
  const onBack = jest.fn();
  const uploadPhoto = jest.fn(async () => null as string | null);
  const removePhoto = jest.fn(async () => null as string | null);
  act(() => {
    tree = renderer.create(
      <ProfileScreen
        user={user}
        save={save}
        onBack={onBack}
        busy={false}
        photo={photo}
        uploadPhoto={uploadPhoto}
        removePhoto={removePhoto}
      />,
    );
  });
  return { save, onBack, uploadPhoto, removePhoto };
}

const picker = jest.requireMock('react-native-image-picker') as Record<'launchCamera' | 'launchImageLibrary', jest.Mock>;
const PICKED = { assets: [{ uri: 'file:///cache/foto.jpg', fileName: 'foto.jpg', type: 'image/jpeg' }] };

describe('foto do perfil', () => {
  it('sem foto: iniciais e sem "Remover foto"; com foto: imagem com o token', () => {
    render();
    expect(visibleText(tree)).toContain('BL');
    expect(visibleText(tree)).not.toContain('Remover foto');
    act(() => tree.unmount());

    render(undefined, USER, { uri: 'http://api.test/api/v1/users/u/avatar?v=1', token: 'tk' });
    const image = tree.root.find((n) => n.props.source?.uri);
    expect(image.props.source).toEqual({
      uri: 'http://api.test/api/v1/users/u/avatar?v=1',
      headers: { Authorization: 'Bearer tk' },
    });
    expect(visibleText(tree)).toContain('Remover foto');
  });

  it('galeria: envia a foto escolhida e avisa', async () => {
    picker.launchImageLibrary.mockResolvedValueOnce(PICKED);
    const { uploadPhoto } = render();
    await pressAsync(tree, 'Escolher da galeria');

    expect(picker.launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', maxWidth: 1024, maxHeight: 1024 }));
    expect(uploadPhoto).toHaveBeenCalledWith({ uri: 'file:///cache/foto.jpg', name: 'foto.jpg', type: 'image/jpeg' });
    expect(visibleText(tree)).toContain('Foto atualizada.');
  });

  it('câmera frontal; cancelar não envia nada', async () => {
    const { uploadPhoto } = render();
    await pressAsync(tree, 'Tirar foto'); // padrão do mock: cancelado

    expect(picker.launchCamera).toHaveBeenCalledWith(expect.objectContaining({ cameraType: 'front', saveToPhotos: false }));
    expect(uploadPhoto).not.toHaveBeenCalled();
    expect(visibleText(tree)).not.toContain('Foto atualizada.');
  });

  it('erro da API no envio aparece na tela', async () => {
    picker.launchImageLibrary.mockResolvedValueOnce(PICKED);
    const { uploadPhoto } = render();
    uploadPhoto.mockResolvedValueOnce('A foto pode ter no máximo 2 MB.');
    await pressAsync(tree, 'Escolher da galeria');

    expect(visibleText(tree)).toContain('A foto pode ter no máximo 2 MB.');
  });

  it('remover chama removePhoto e avisa', async () => {
    const { removePhoto } = render(undefined, USER, { uri: 'http://x/a.jpg', token: null });
    await pressAsync(tree, 'Remover foto');

    expect(removePhoto).toHaveBeenCalled();
    expect(visibleText(tree)).toContain('Foto removida.');
  });
});

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
