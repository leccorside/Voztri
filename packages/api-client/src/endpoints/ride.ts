import { VoztriApiClient } from '../client.js';
import { Ride, FareEstimate, AddressLocation } from '@voztri/shared-types';

export class RideApi {
  constructor(private client: VoztriApiClient) {}

  async getEstimates(origin: AddressLocation, destination: AddressLocation): Promise<FareEstimate[]> {
    const res = await this.client.post<FareEstimate[]>('/rides/estimate', { origin, destination });
    return res.data;
  }

  async requestRide(params: {
    origin: AddressLocation;
    destination: AddressLocation;
    category: 'pop' | 'black' | 'mulher' | 'moto';
    paymentMethod: 'pix' | 'credit_card' | 'cash' | 'wallet';
    idempotencyKey?: string;
  }): Promise<Ride> {
    const res = await this.client.post<Ride>('/rides/request', params, {
      headers: params.idempotencyKey ? { 'Idempotency-Key': params.idempotencyKey } : undefined,
    });
    return res.data;
  }

  async getRide(rideId: string): Promise<Ride> {
    const res = await this.client.get<Ride>(`/rides/${rideId}`);
    return res.data;
  }

  async cancelRide(rideId: string, reason: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/cancel`, { reason });
    return res.data;
  }

  async validatePin(rideId: string, pin: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/validate-pin`, { pin });
    return res.data;
  }

  async completeRide(rideId: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/complete`);
    return res.data;
  }

  async triggerSos(rideId: string, latitude: number, longitude: number): Promise<{ success: boolean; incidentId: string }> {
    const res = await this.client.post<{ success: boolean; incidentId: string }>(`/rides/${rideId}/sos`, { latitude, longitude });
    return res.data;
  }

  async cancelSos(rideId: string, emergencyPin: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(`/rides/${rideId}/sos/cancel`, { emergencyPin });
    return res.data;
  }
}
