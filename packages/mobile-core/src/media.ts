import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';

/**
 * Endereço completo de uma foto. A API devolve a foto enviada como caminho relativo
 * (/api/v1/users/{id}/avatar?v=...), porque emulador, celular por USB e produção
 * enxergam hosts diferentes: aqui ela é completada com a origem da API que o app usa.
 * Endereços completos (fotos externas, como as do seed) voltam como vieram.
 */
export function resolveMediaUrl(url: string | null | undefined, apiUrl: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = apiUrl.match(/^(https?:\/\/[^/]+)/i)?.[1];
  return origin && url.startsWith('/') ? origin + url : null;
}

/** Foto escolhida, pronta para enviar (mesmo formato do PhotoFile do api-client). */
export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

/** Resultado do seletor: foto, cancelado pelo usuário ou erro com a mensagem. */
export type PickPhotoResult =
  | { status: 'picked'; photo: PickedPhoto }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * O app já reduz a foto: 1024 px no maior lado, JPEG 80% (algumas centenas de KB),
 * bem abaixo do limite de 2 MB da API, que ainda recorta e reduz para 512 px.
 */
const OPTIONS = {
  mediaType: 'photo',
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  includeBase64: false,
  selectionLimit: 1,
} as const;

// Mesmo valor de PermissionsAndroid.PERMISSIONS.CAMERA (tipado como opcional pelo noUncheckedIndexedAccess)
const CAMERA: Permission = 'android.permission.CAMERA';

/** Pede a permissão de câmera no Android (o manifesto a declara); no iOS o sistema pergunta sozinho. */
async function cameraAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(CAMERA);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function toResult(response: ImagePickerResponse): PickPhotoResult {
  if (response.didCancel) return { status: 'cancelled' };
  if (response.errorCode) {
    const message =
      response.errorCode === 'camera_unavailable'
        ? 'A câmera não está disponível neste aparelho.'
        : response.errorCode === 'permission'
          ? 'Sem permissão para acessar a câmera ou as fotos. Libere nas configurações do aparelho.'
          : 'Não foi possível abrir a foto. Tente de novo.';
    return { status: 'error', message };
  }
  const asset = response.assets?.[0];
  if (!asset?.uri) return { status: 'cancelled' };
  return {
    status: 'picked',
    photo: {
      uri: asset.uri,
      name: asset.fileName ?? 'foto.jpg',
      type: asset.type ?? 'image/jpeg',
    },
  };
}

/** Abre a câmera ou a galeria e devolve a foto escolhida (já reduzida). */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickPhotoResult> {
  try {
    if (source === 'camera') {
      if (!(await cameraAllowed())) {
        return { status: 'error', message: 'Sem permissão para usar a câmera. Libere nas configurações do aparelho.' };
      }
      return toResult(await launchCamera({ ...OPTIONS, saveToPhotos: false, cameraType: 'front' }));
    }
    return toResult(await launchImageLibrary(OPTIONS));
  } catch {
    return { status: 'error', message: 'Não foi possível abrir a foto. Tente de novo.' };
  }
}
