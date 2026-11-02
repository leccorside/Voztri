import { VoztriApiClient } from '../client.js';

export type DevicePlatform = 'android' | 'ios';

/** Aparelhos que recebem notificações push (token do FCM; no iOS o FCM repassa ao APNs). */
export class DeviceApi {
  constructor(private client: VoztriApiClient) {}

  /** Registra (ou atualiza) o token deste aparelho para o usuário logado. */
  async register(token: string, platform: DevicePlatform, deviceId?: string): Promise<{ id: string; platform: DevicePlatform }> {
    const res = await this.client.post<{ id: string; platform: DevicePlatform }>('/devices', {
      token,
      platform,
      ...(deviceId ? { deviceId } : {}),
    });
    return res.data;
  }

  /** Remove o token (logout): o aparelho deixa de receber push desta conta. */
  async unregister(token: string): Promise<void> {
    await this.client.delete('/devices', { data: { token } });
  }
}
