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
}

export interface UserProfile {
  id: string;
  userId: string;
  birthDate?: string;
  gender?: string;
  ratingAvg: number;
  totalRatings: number;
}
