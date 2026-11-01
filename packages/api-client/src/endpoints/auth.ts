import { VoztriApiClient } from '../client.js';
import { User } from '@voztri/shared-types';

export interface OtpResponse {
  message: string;
  expiresInSeconds: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export class AuthApi {
  constructor(private client: VoztriApiClient) {}

  async requestOtp(phone: string, role: 'passenger' | 'driver' | 'admin' = 'passenger'): Promise<OtpResponse> {
    const res = await this.client.post<OtpResponse>('/auth/request-otp', { phone, role });
    return res.data;
  }

  async verifyOtp(phone: string, code: string): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/verify-otp', { phone, code });
    return res.data;
  }

  /**
   * Login do painel administrativo: nunca cria usuário e só gera código para
   * administradores ativos (a resposta é a mesma para qualquer telefone).
   */
  async requestAdminOtp(phone: string): Promise<OtpResponse> {
    const res = await this.client.post<OtpResponse>('/auth/admin/request-otp', { phone });
    return res.data;
  }

  /** Só emite token para administradores; os demais recebem 422 INVALID_OTP. */
  async verifyAdminOtp(phone: string, code: string): Promise<AuthResponse> {
    const res = await this.client.post<AuthResponse>('/auth/admin/verify-otp', { phone, code });
    return res.data;
  }

  async getMe(): Promise<User> {
    const res = await this.client.get<User>('/auth/me');
    return res.data;
  }
}

