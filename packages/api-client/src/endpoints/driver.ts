import { VoztriApiClient } from '../client.js';
import { Driver, DriverEarningsSummary } from '@voztri/shared-types';

export class DriverApi {
  constructor(private client: VoztriApiClient) {}

  async setOnlineStatus(isOnline: boolean): Promise<{ isOnline: boolean }> {
    const res = await this.client.post<{ isOnline: boolean }>('/driver/status', { isOnline });
    return res.data;
  }

  async updateLocation(params: { latitude: number; longitude: number; heading?: number; speed?: number }): Promise<void> {
    await this.client.post('/driver/location', params);
  }

  async getEarnings(): Promise<DriverEarningsSummary> {
    const res = await this.client.get<DriverEarningsSummary>('/driver/earnings');
    return res.data;
  }

  async acceptOffer(rideId: string): Promise<{ success: boolean; rideId: string }> {
    const res = await this.client.post<{ success: boolean; rideId: string }>(`/rides/${rideId}/accept`);
    return res.data;
  }

  async rejectOffer(rideId: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(`/rides/${rideId}/reject`);
    return res.data;
  }
}
