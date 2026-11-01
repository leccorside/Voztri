import { User } from './user.js';

export interface TrustedContact {
  id: string;
  passengerId: string;
  name: string;
  phone: string;
  notifyOnTrip: boolean;
}

export interface Passenger {
  id: string;
  userId: string;
  user?: User;
  emergencyPin?: string;
  trustedContacts?: TrustedContact[];
}

