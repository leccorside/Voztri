import { DriverLiveLocation } from './location.js';
import { Ride, RideStatus } from './ride.js';

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderRole: 'passenger' | 'driver';
  text: string;
  createdAt: string;
  readAt?: string;
}

export interface RideStatusUpdateEvent {
  rideId: string;
  status: RideStatus;
  ride: Ride;
}

export interface DriverLocationUpdateEvent {
  driverId: string;
  location: DriverLiveLocation;
}

export interface NewRideOfferEvent {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm: number;
  durationMinutes: number;
  earningsCents: number;
  timeoutSeconds: number;
}

