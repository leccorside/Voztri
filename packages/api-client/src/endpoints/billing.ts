import { VoztriApiClient } from '../client.js';
import { PixPaymentData, CreditCardData } from '@voztri/shared-types';

export class BillingApi {
  constructor(private client: VoztriApiClient) {}

  async generatePix(rideId: string): Promise<PixPaymentData> {
    const res = await this.client.post<PixPaymentData>(`/billing/rides/${rideId}/pix`);
    return res.data;
  }

  async getSavedCards(): Promise<CreditCardData[]> {
    const res = await this.client.get<CreditCardData[]>('/billing/cards');
    return res.data;
  }

  async requestPayout(params: { amountCents: number; pixKey: string; pixKeyType: string }): Promise<{ success: boolean; payoutId: string }> {
    const res = await this.client.post<{ success: boolean; payoutId: string }>('/billing/payout', params);
    return res.data;
  }
}

