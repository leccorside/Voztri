import { z } from 'zod';

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const AddressLocationSchema = z.object({
  address: z.string().min(3),
  shortAddress: z.string().min(2),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  state: z.string().optional(),
});

export const RideEstimateRequestSchema = z.object({
  origin: AddressLocationSchema,
  destination: AddressLocationSchema,
});

export const RequestRideSchema = z.object({
  origin: AddressLocationSchema,
  destination: AddressLocationSchema,
  category: z.enum(['pop', 'black', 'mulher', 'moto']),
  paymentMethod: z.enum(['pix', 'credit_card', 'cash', 'wallet']),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional(),
});

export const ValidateBoardingPinSchema = z.object({
  rideId: z.string().uuid(),
  pin: z.string().length(4, 'O código de embarque possui 4 dígitos'),
});

export const CancelRideSchema = z.object({
  reason: z.string().min(3, 'Informe o motivo do cancelamento'),
});

export type RideEstimateRequestInput = z.infer<typeof RideEstimateRequestSchema>;
export type RequestRideInput = z.infer<typeof RequestRideSchema>;
export type ValidateBoardingPinInput = z.infer<typeof ValidateBoardingPinSchema>;
export type CancelRideInput = z.infer<typeof CancelRideSchema>;

