import { Driver } from './driver.js';
import { Passenger } from './passenger.js';
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

export interface Ride {
  id: string;
  passengerId: string;
  passenger?: Passenger;
  driverId?: string | null;
  driver?: Driver | null;
  status: RideStatus;
  category: 'pop' | 'black' | 'mulher' | 'moto';
  origin: AddressLocation;
  destination: AddressLocation;
  route: RouteGeometry;
  priceCents: number;
  boardingPin: string;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
}
