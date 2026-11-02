import { VoztriApiClient } from '../client.js';
import { User } from '@voztri/shared-types';

export interface OtpResponse {
  message: string;
  expiresInSeconds: number;
  /** Código de teste; a API só envia com APP_DEBUG ligado. */
  debugOtp: string | null;
}

/** Foto escolhida no aparelho (arquivo local do seletor de imagens). */
export interface PhotoFile {
  uri: string;
  name: string;
  /** Tipo MIME, ex.: image/jpeg. */
  type: string;
}

/** Campos que o usuário edita na tela "Meu perfil". */
export interface ProfileChanges {
  name?: string;
  email?: string | null;
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

  /**
   * Atualiza o perfil (só os campos enviados). O e-mail pode ser apagado com null.
   * Erros 422 trazem a mensagem em português por campo (`errors.name`, `errors.email`).
   */
  async updateProfile(changes: ProfileChanges): Promise<User> {
    const res = await this.client.put<{ message: string; user: RawUser }>('/auth/profile', changes);
    return normalizeUser(res.data.user);
  }

  /**
   * Envia ou troca a foto do perfil (multipart, campo `photo`; JPEG ou PNG até 2 MB).
   * Devolve o novo `avatarUrl`, um caminho da API (/api/v1/users/{id}/avatar?v=...).
   * Erros 422 trazem a mensagem em português em `errors.photo`.
   */
  async uploadAvatar(photo: PhotoFile): Promise<string | null> {
    const form = new FormData();
    // Formato de arquivo do React Native no FormData: { uri, name, type }
    form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
    const res = await this.client.post<{ avatarUrl: string | null }>('/auth/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Foto em rede móvel pode demorar mais que o padrão de 15 s
      timeout: 60_000,
    });
    return res.data.avatarUrl;
  }

  /** Tira a foto do perfil. */
  async removeAvatar(): Promise<void> {
    await this.client.delete('/auth/avatar');
  }

  /**
   * Exclui a conta (dados pessoais apagados; corridas e ledger ficam anônimos). Exige
   * a palavra de confirmação (`EXCLUIR`); 409 `RIDE_IN_PROGRESS` com corrida em aberto.
   * Depois disso o token deixa de valer.
   */
  async deleteAccount(confirmation: string): Promise<void> {
    await this.client.delete('/auth/account', { data: { confirmation } });
  }
}
