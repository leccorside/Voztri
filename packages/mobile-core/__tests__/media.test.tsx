/**
 * Fotos: endereço completo a partir do caminho da API, seletor (câmera e galeria,
 * permissão no Android, cancelamento e erros) e o Avatar (foto ou iniciais).
 */
import React from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { Avatar, initials, pickPhoto, resolveMediaUrl } from '../src';
import { visibleText } from './rnTree';

const picker = jest.requireMock('react-native-image-picker') as Record<'launchCamera' | 'launchImageLibrary', jest.Mock>;

describe('resolveMediaUrl', () => {
  it('caminho da API ganha a origem da API; endereço completo fica como está', () => {
    expect(resolveMediaUrl('/api/v1/users/u1/avatar?v=abc', 'http://10.0.2.2:8080/api/v1')).toBe(
      'http://10.0.2.2:8080/api/v1/users/u1/avatar?v=abc',
    );
    expect(resolveMediaUrl('/api/v1/users/u1/avatar', 'https://api.voztri.com.br/api/v1')).toBe(
      'https://api.voztri.com.br/api/v1/users/u1/avatar',
    );
    expect(resolveMediaUrl('https://images.exemplo.com/a.jpg', 'http://localhost:8080/api/v1')).toBe('https://images.exemplo.com/a.jpg');
  });

  it('vazio ou caminho sem barra: null', () => {
    expect(resolveMediaUrl(null, 'http://x')).toBeNull();
    expect(resolveMediaUrl('', 'http://x')).toBeNull();
    expect(resolveMediaUrl('foto.jpg', 'http://x')).toBeNull();
  });
});

describe('pickPhoto', () => {
  const originalOS = Platform.OS;
  const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
  afterEach(() => setOS(originalOS));

  it('galeria: devolve a foto já reduzida (1024 px, JPEG)', async () => {
    picker.launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', type: 'image/jpeg' }] });
    await expect(pickPhoto('library')).resolves.toEqual({
      status: 'picked',
      photo: { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    });
    expect(picker.launchImageLibrary).toHaveBeenLastCalledWith(
      expect.objectContaining({ maxWidth: 1024, maxHeight: 1024, quality: 0.8, includeBase64: false }),
    );
  });

  it('sem nome e tipo, usa foto.jpg e image/jpeg', async () => {
    picker.launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'content://x' }] });
    await expect(pickPhoto('library')).resolves.toEqual({
      status: 'picked',
      photo: { uri: 'content://x', name: 'foto.jpg', type: 'image/jpeg' },
    });
  });

  it('cancelado e erros do seletor', async () => {
    picker.launchImageLibrary.mockResolvedValueOnce({ didCancel: true });
    await expect(pickPhoto('library')).resolves.toEqual({ status: 'cancelled' });

    picker.launchCamera.mockResolvedValueOnce({ errorCode: 'camera_unavailable' });
    await expect(pickPhoto('camera')).resolves.toEqual({ status: 'error', message: 'A câmera não está disponível neste aparelho.' });

    picker.launchImageLibrary.mockRejectedValueOnce(new Error('falhou'));
    await expect(pickPhoto('library')).resolves.toMatchObject({ status: 'error' });
  });

  it('Android: pede a permissão de câmera; negada, nem abre a câmera', async () => {
    setOS('android');
    const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);
    picker.launchCamera.mockClear();

    await expect(pickPhoto('camera')).resolves.toEqual({
      status: 'error',
      message: 'Sem permissão para usar a câmera. Libere nas configurações do aparelho.',
    });
    expect(request).toHaveBeenCalledWith('android.permission.CAMERA');
    expect(picker.launchCamera).not.toHaveBeenCalled();

    request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
    picker.launchCamera.mockResolvedValueOnce({ assets: [{ uri: 'file:///c.jpg', type: 'image/jpeg', fileName: 'c.jpg' }] });
    await expect(pickPhoto('camera')).resolves.toMatchObject({ status: 'picked' });
    request.mockRestore();
  });
});

describe('Avatar', () => {
  let tree: ReactTestRenderer | undefined;
  afterEach(() => {
    act(() => tree?.unmount());
    tree = undefined;
  });

  it('iniciais: primeiro e último nome', () => {
    expect(initials('Beatriz Lima Souza')).toBe('BS');
    expect(initials('carlos')).toBe('C');
    expect(initials('   ')).toBe('?');
  });

  it('com foto mostra a imagem com o token; se ela falha, volta às iniciais', () => {
    act(() => {
      tree = renderer.create(<Avatar name="Beatriz Lima" uri="http://api/x.jpg" token="tk" />);
    });
    const image = tree.root.find((n) => n.props.source?.uri === 'http://api/x.jpg');
    expect(image.props.source.headers).toEqual({ Authorization: 'Bearer tk' });

    act(() => image.props.onError());
    expect(visibleText(tree)).toContain('BL');
  });

  it('foto externa sem token: sem o cabeçalho', () => {
    act(() => {
      tree = renderer.create(<Avatar name="Ana" uri="https://images.exemplo.com/a.jpg" />);
    });
    expect(tree.root.find((n) => n.props.source?.uri).props.source).toEqual({ uri: 'https://images.exemplo.com/a.jpg' });
  });
});
