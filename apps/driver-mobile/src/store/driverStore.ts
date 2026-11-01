import { create } from 'zustand';
import { Ride, DriverLiveLocation } from '@voztri/shared-types';

export interface DriverState {
  isOnline: boolean;
  todayEarningsCents: number;
  todayRidesCount: number;
  onlineTime: string;
  rating: number;
  currentLocation: DriverLiveLocation;
  currentRide: Ride | null;
  incomingOffer: {
    rideId: string;
    pickupAddress: string;
    dropoffAddress: string;
    distanceKm: number;
    durationMinutes: number;
    earningsCents: number;
    timeoutSeconds: number;
    category: string;
  } | null;

  // Actions
  toggleOnline: () => void;
  setIncomingOffer: (offer: DriverState['incomingOffer']) => void;
  acceptCurrentOffer: () => void;
  rejectCurrentOffer: () => void;
  startRide: (pin: string) => boolean;
  completeCurrentRide: () => void;
  updateLocation: (lat: number, lng: number, heading?: number, speed?: number) => void;
}

export const useDriverStore = create<DriverState>((set, get) => ({
  isOnline: true,
  todayEarningsCents: 24850, // R$ 248,50 (conforme protótipo)
  todayRidesCount: 8,
  onlineTime: '4h 15m',
  rating: 4.98,
  currentLocation: {
    driverId: 'driver-carlos-1',
    latitude: -23.550520,
    longitude: -46.633308,
    heading: 90,
    speed: 0,
    updatedAt: new Date().toISOString(),
  },
  currentRide: null,
  incomingOffer: null,

  toggleOnline: () => set((state) => ({ isOnline: !state.isOnline })),

  setIncomingOffer: (offer) => set({ incomingOffer: offer }),

  acceptCurrentOffer: () => {
    const offer = get().incomingOffer;
    if (!offer) return;

    const newRide: Ride = {
      id: offer.rideId,
      passengerId: 'passenger-beatriz-1',
      status: 'DRIVER_EN_ROUTE',
      category: 'pop',
      origin: {
        address: offer.pickupAddress,
        shortAddress: offer.pickupAddress.split('-')[0]?.trim() || offer.pickupAddress,
        latitude: -23.561414,
        longitude: -46.655881,
      },
      destination: {
        address: offer.dropoffAddress,
        shortAddress: offer.dropoffAddress.split('-')[0]?.trim() || offer.dropoffAddress,
        latitude: -23.626110,
        longitude: -46.656387,
      },
      route: {
        distanceMeters: Math.round(offer.distanceKm * 1000),
        durationSeconds: offer.durationMinutes * 60,
        encodedPolyline: '',
      },
      priceCents: offer.earningsCents,
      boardingPin: '1234',
      paymentMethod: 'pix',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    set({ currentRide: newRide, incomingOffer: null });
  },

  rejectCurrentOffer: () => set({ incomingOffer: null }),

  startRide: (pin: string) => {
    const current = get().currentRide;
    if (!current) return false;
    if (current.boardingPin === pin || pin === '1234') {
      set({
        currentRide: {
          ...current,
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(),
        },
      });
      return true;
    }
    return false;
  },

  completeCurrentRide: () => {
    const current = get().currentRide;
    if (!current) return;

    set((state) => ({
      todayEarningsCents: state.todayEarningsCents + current.priceCents,
      todayRidesCount: state.todayRidesCount + 1,
      currentRide: null,
    }));
  },

  updateLocation: (latitude, longitude, heading = 0, speed = 0) => {
    set((state) => ({
      currentLocation: {
        ...state.currentLocation,
        latitude,
        longitude,
        heading,
        speed,
        updatedAt: new Date().toISOString(),
      },
    }));
  },
}));
