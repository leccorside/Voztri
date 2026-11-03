import type { DriverStatus } from './driver.js';

export type UserRole = 'passenger' | 'driver' | 'admin';

export type UserStatus = 'pending' | 'active' | 'suspended' | 'blocked';

export interface User {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  cpf: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  /** Só passageiros: se já definiu o PIN de emergência (o PIN em si nunca vem da API). */
  hasEmergencyPin?: boolean;
  /** Só motoristas: situação do cadastro (registering enquanto preenche pelo app). */
  driverStatus?: DriverStatus;
}

export interface UserProfile {
  id: string;
  userId: string;
  birthDate?: string;
  gender?: string;
  ratingAvg: number;
  totalRatings: number;
}

