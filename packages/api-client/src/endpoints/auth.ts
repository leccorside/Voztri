import { VoztriApiClient } from '../client.js';
import { User } from '@voztri/shared-types';

export interface OtpResponse {
  message: string;
  expiresInSeconds: number;
  /** Código de teste; a API só envia com APP_DEBUG ligado. */
  debugOtp: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** Formato cru da API de autenticação (snake_case). */
interface RawUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  cpf?: string | null;
  avatar_url?: string | null;
  role: User['role'];
  status: User['status'];
  created_at?: string;
  updated_at?: string;
  /** Só passageiros. */
  has_emergency_pin?: boolean;
}

interface RawAuthResponse {
  token: string;
  user: RawUser;
}

interface RawOtpResponse {
  message: string;
  expires_in_seconds: number;
  debug_otp?: string | null;
}

function normalizeUser(raw: RawUser): User {
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    email: raw.email ?? null,
    cpf: raw.cpf ?? null,
    avatarUrl: raw.avatar_url ?? null,
    role: raw.role,
    status: raw.status,
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
    ...(raw.has_emergency_pin !== undefined ? { hasEmergencyPin: raw.has_emergency_pin } : {}),
  };
}

function normalizeOtp(raw: RawOtpResponse): OtpResponse {
  return { message: raw.message, expiresInSeconds: raw.expires_in_seconds, debugOtp: raw.debug_otp ?? null };
}

export class AuthApi {
  constructor(private client: VoztriApiClient) {}

  /** Passageiro e motorista; a API não aceita autocadastro como admin. */
  async requestOtp(phone: string, role: 'passenger' | 'driver' = 'passenger'): Promise<OtpResponse> {
    const res = await this.client.post<RawOtpResponse>('/auth/request-otp', { phone, role });
    return normalizeOtp(res.data);
  }

  async verifyOtp(phone: string, code: string): Promise<AuthResponse> {
    const res = await this.client.post<RawAuthResponse>('/auth/verify-otp', { phone, code });
    return { token: res.data.token, user: normalizeUser(res.data.user) };
  }

  /**
   * Login do painel administrativo: nunca cria usuário e só gera código para
   * administradores ativos (a resposta é a mesma para qualquer telefone).
   */
  async requestAdminOtp(phone: string): Promise<OtpResponse> {
    const res = await this.client.post<RawOtpResponse>('/auth/admin/request-otp', { phone });
    return normalizeOtp(res.data);
  }

  /** Só emite token para administradores; os demais recebem 422 INVALID_OTP. */
  async verifyAdminOtp(phone: string, code: string): Promise<AuthResponse> {
    const res = await this.client.post<RawAuthResponse>('/auth/admin/verify-otp', { phone, code });
    return { token: res.data.token, user: normalizeUser(res.data.user) };
  }

  async getMe(): Promise<User> {
    const res = await this.client.get<RawUser>('/auth/me');
    return normalizeUser(res.data);
  }
}
