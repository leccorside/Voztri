import { create } from 'zustand';
import { AddressLocation, FareEstimate, Ride, ChatMessage } from '@voztri/shared-types';

export type PassengerFlowStep =
  | 'HOME'
  | 'DESTINATION'
  | 'SELECT_CATEGORY'
  | 'SEARCHING'
  | 'DRIVER_EN_ROUTE'
  | 'IN_TRIP'
  | 'COMPLETED';

export interface PassengerState {
  currentStep: PassengerFlowStep;
  origin: AddressLocation;
  destination: AddressLocation | null;
  selectedCategory: 'pop' | 'black' | 'mulher' | 'moto';
  selectedPaymentMethod: 'pix' | 'credit_card' | 'cash' | 'wallet';
  estimates: FareEstimate[];
  activeRide: Ride | null;
  chatMessages: ChatMessage[];
  isSosActive: boolean;

  // Actions
  setStep: (step: PassengerFlowStep) => void;
  setOrigin: (origin: AddressLocation) => void;
  setDestination: (destination: AddressLocation) => void;
  selectCategory: (category: 'pop' | 'black' | 'mulher' | 'moto') => void;
  selectPaymentMethod: (method: 'pix' | 'credit_card' | 'cash' | 'wallet') => void;
  confirmRideRequest: () => void;
  cancelActiveRide: (reason: string) => void;
  sendChat: (text: string) => void;
  triggerSos: () => void;
  cancelSos: (pin: string) => boolean;
  finishRideEvaluation: () => void;
}

export const usePassengerStore = create<PassengerState>((set, get) => ({
  currentStep: 'HOME',
  origin: {
    address: 'Av. Paulista, 1578 - Bela Vista, São Paulo - SP',
    shortAddress: 'Av. Paulista, 1578',
    latitude: -23.561414,
    longitude: -46.655881,
    city: 'São Paulo',
    state: 'SP',
  },
  destination: null,
  selectedCategory: 'pop',
  selectedPaymentMethod: 'pix',
  estimates: [
    {
      category: 'pop',
      categoryName: 'VozTri Pop',
      priceCents: 2450,
      formattedPrice: 'R$ 24,50',
      estimatedMinutes: 14,
      distanceKm: 6.8,
      surgeMultiplier: 1.0,
      description: 'Melhor custo-benefício para o dia a dia',
    },
    {
      category: 'black',
      categoryName: 'VozTri Black',
      priceCents: 3890,
      formattedPrice: 'R$ 38,90',
      estimatedMinutes: 12,
      distanceKm: 6.8,
      surgeMultiplier: 1.0,
      description: 'Veículos executivos com alto padrão de conforto',
    },
    {
      category: 'mulher',
      categoryName: 'VozTri Mulher',
      priceCents: 2600,
      formattedPrice: 'R$ 26,00',
      estimatedMinutes: 16,
      distanceKm: 6.8,
      surgeMultiplier: 1.0,
      description: 'Exclusivo para mulheres com motoristas mulheres',
    },
    {
      category: 'moto',
      categoryName: 'VozTri Moto',
      priceCents: 1520,
      formattedPrice: 'R$ 15,20',
      estimatedMinutes: 9,
      distanceKm: 6.8,
      surgeMultiplier: 1.0,
      description: 'A maneira mais rápida de fugir do trânsito',
    },
  ],
  activeRide: null,
  chatMessages: [
    {
      id: 'msg-1',
      rideId: 'ride-demo',
      senderId: 'driver-carlos-1',
      senderRole: 'driver',
      text: 'Olá Beatriz! Já estou a caminho do local de embarque.',
      createdAt: new Date().toISOString(),
    },
  ],
  isSosActive: false,

  setStep: (step) => set({ currentStep: step }),

  setOrigin: (origin) => set({ origin }),

  setDestination: (destination) => {
    set({ destination, currentStep: 'SELECT_CATEGORY' });
  },

  selectCategory: (category) => set({ selectedCategory: category }),

  selectPaymentMethod: (method) => set({ selectedPaymentMethod: method }),

  confirmRideRequest: () => {
    const { origin, destination, selectedCategory, selectedPaymentMethod, estimates } = get();
    if (!destination) return;

    const chosenEstimate = estimates.find((e) => e.category === selectedCategory) || estimates[0];

    const newRide: Ride = {
      id: 'ride-' + Date.now(),
      passengerId: 'passenger-beatriz-1',
      driverId: 'driver-carlos-1',
      driver: {
        id: 'driver-carlos-1',
        userId: 'user-carlos-1',
        cnhNumber: '12345678900',
        cnhCategory: 'B',
        cnhExpiresAt: '2028-12-31',
        cnhHasEar: true,
        status: 'approved',
        isOnline: true,
        user: {
          id: 'user-carlos-1',
          name: 'Carlos Eduardo Silva',
          phone: '(11) 99999-2222',
          email: 'carlos@voztri.com.br',
          cpf: '222.333.444-55',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
          role: 'driver',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeVehicle: {
          id: 'veh-1',
          driverId: 'driver-carlos-1',
          brand: 'Toyota',
          model: 'Corolla XEi',
          year: 2022,
          color: 'Prata Metálico',
          plate: 'VOZ2026',
          category: selectedCategory,
          isActive: true,
        },
        todayEarningsCents: 24850,
        todayRidesCount: 8,
      },
      status: 'SEARCHING',
      category: selectedCategory,
      origin,
      destination,
      route: {
        distanceMeters: Math.round((chosenEstimate?.distanceKm || 6.8) * 1000),
        durationSeconds: (chosenEstimate?.estimatedMinutes || 14) * 60,
        encodedPolyline: '',
      },
      priceCents: chosenEstimate?.priceCents || 2450,
      boardingPin: '1234',
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };

    set({ activeRide: newRide, currentStep: 'SEARCHING' });

    // Simulação do matching automático após 3 segundos
    setTimeout(() => {
      set((state) => {
        if (!state.activeRide) return state;
        return {
          currentStep: 'DRIVER_EN_ROUTE',
          activeRide: {
            ...state.activeRide,
            status: 'DRIVER_EN_ROUTE',
          },
        };
      });
    }, 3000);
  },

  // O motivo (previsto na interface) será enviado à API quando o cancelamento
  // deixar de ser simulado; por ora só reseta o estado local.
  cancelActiveRide: () => {
    set({
      activeRide: null,
      currentStep: 'HOME',
      destination: null,
    });
  },

  sendChat: (text) => {
    const newMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      rideId: get().activeRide?.id || 'ride-demo',
      senderId: 'passenger-beatriz-1',
      senderRole: 'passenger',
      text,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ chatMessages: [...state.chatMessages, newMessage] }));
  },

  triggerSos: () => set({ isSosActive: true }),

  cancelSos: (pin: string) => {
    if (pin === '1234') {
      set({ isSosActive: false });
      return true;
    }
    return false;
  },

  finishRideEvaluation: () => {
    set({
      currentStep: 'HOME',
      activeRide: null,
      destination: null,
      isSosActive: false,
    });
  },
}));

