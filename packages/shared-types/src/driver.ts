import { User } from './user.js';
import type { Ride } from './ride.js';

/** Oferta de corrida pendente para o motorista (GET /driver/rides/current). */
export interface DriverRideOffer {
  rideId: string;
  expiresAt: string;
  secondsLeft: number;
  timeoutSeconds: number;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMinutes: number;
  /** Ganho líquido (após a comissão da plataforma). */
  earningsCents: number;
  category: VehicleCategory;
  categoryName: string;
  paymentMethod: string;
  passengerName: string | null;
}

export interface DriverCurrentState {
  isOnline: boolean;
  offer: DriverRideOffer | null;
  ride: Ride | null;
}

export type DriverStatus = 'pending_approval' | 'approved' | 'rejected' | 'blocked';

export type DocumentType = 'cnh' | 'crlv' | 'background_check' | 'photo';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type VehicleCategory = 'pop' | 'black' | 'mulher' | 'moto';

export interface DriverDocument {
  id: string;
  driverId: string;
  type: DocumentType;
  documentUrl: string;
  status: DocumentStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface DriverVehicle {
  id: string;
  driverId: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  plate: string;
  category: VehicleCategory;
  isActive: boolean;
}

export interface Driver {
  id: string;
  userId: string;
  user?: User;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiresAt: string;
  cnhHasEar: boolean;
  status: DriverStatus;
  isOnline: boolean;
  currentLatitude?: number;
  currentLongitude?: number;
  activeVehicle?: DriverVehicle;
  documents?: DriverDocument[];
  todayEarningsCents: number;
  todayRidesCount: number;
}

