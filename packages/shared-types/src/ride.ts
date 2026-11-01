import { VehicleCategory } from './driver.js';
import { AddressLocation, RouteGeometry } from './location.js';

export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_DRIVER_AVAILABLE';

export type PaymentMethodType = 'pix' | 'credit_card' | 'cash' | 'wallet';

export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';

export interface FareEstimate {
  category: 'pop' | 'black' | 'mulher' | 'moto';
  categoryName: string;
  priceCents: number;
  formattedPrice: string;
  estimatedMinutes: number;
  distanceKm: number;
  surgeMultiplier: number;
  description: string;
}

/** Dados públicos de um participante da corrida (sem CPF, telefone ou PINs). */
export interface RideUserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  rating: number | null;
}

export interface RideVehicleSummary {
  brand: string;
  model: string;
  color: string;
  plate: string;
  category: VehicleCategory;
}

export interface RidePassengerSummary {
  id: string;
  user: RideUserSummary | null;
}

export interface RideDriverSummary {
  id: string;
  user: RideUserSummary | null;
  vehicle: RideVehicleSummary | null;
}

/** Formato das respostas de /rides/* e /driver/rides/current (RidePresenter). */
export interface Ride {
  id: string;
  passengerId: string;
  passenger?: RidePassengerSummary | null;
  driverId?: string | null;
  driver?: RideDriverSummary | null;
  status: RideStatus;
  category: 'pop' | 'black' | 'mulher' | 'moto';
  categoryName?: string;
  origin: AddressLocation;
  destination: AddressLocation;
  route: RouteGeometry;
  priceCents: number;
  formattedPrice?: string;
  /** Só vem preenchido para o passageiro dono da corrida. */
  boardingPin: string | null;
  /** Ganho líquido do motorista; só vem para o motorista atribuído. */
  driverEarningsCents?: number | null;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}

