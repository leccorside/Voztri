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

/**
 * registering: cadastro pelo app em andamento; pending_approval: enviado para análise;
 * deleted: conta excluída.
 */
export type DriverStatus = 'registering' | 'pending_approval' | 'approved' | 'rejected' | 'blocked' | 'deleted';

/** Etapas do cadastro do motorista pelo app (as seguintes entram nas próximas partes). */
export type DriverRegistrationStepKey = 'personal' | 'cnh' | 'vehicle';

/** Categorias que o motorista escolhe no cadastro (Mulher é definida pela equipe na análise). */
export type SelfServiceVehicleCategory = 'pop' | 'black' | 'moto';

/** Categorias da CNH aceitas pela API. */
export type CnhCategory = 'A' | 'B' | 'AB' | 'C' | 'AC' | 'D' | 'AD' | 'E' | 'AE';

export interface DriverPersonalData {
  name: string;
  /** Só dígitos. */
  cpf: string | null;
  /** AAAA-MM-DD. */
  birthDate: string | null;
  email: string | null;
}

export interface DriverCnhData {
  /** Registro da CNH, 11 dígitos. */
  number: string | null;
  category: CnhCategory | null;
  /** AAAA-MM-DD. */
  expiresAt: string | null;
  /** Observação EAR (Exerce Atividade Remunerada), exigida pela Lei 13.640. */
  hasEar: boolean;
}

export interface DriverVehicleData {
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  /** Só letras e números, em maiúsculas: ABC1D23 ou ABC1234. */
  plate: string | null;
  /** 11 dígitos. */
  renavam: string | null;
  category: VehicleCategory | null;
}

/** GET /driver/registration: status, o que cada etapa já tem e a próxima pendente. */
export interface DriverRegistration {
  status: DriverStatus;
  steps: {
    personal: { done: boolean; data: DriverPersonalData };
    cnh: { done: boolean; data: DriverCnhData };
    vehicle: { done: boolean; data: DriverVehicleData };
  };
  /** null: as etapas desta parte estão completas. */
  nextStep: DriverRegistrationStepKey | null;
}

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

