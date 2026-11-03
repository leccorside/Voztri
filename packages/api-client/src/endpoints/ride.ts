import { VoztriApiClient } from '../client.js';
import { Ride, FareEstimate, AddressLocation, ChatMessage, PaymentMethodType } from '@voztri/shared-types';

type Coordinates = Pick<AddressLocation, 'latitude' | 'longitude'>;

export class RideApi {
  constructor(private client: VoztriApiClient) {}

  async getEstimates(origin: Coordinates, destination: Coordinates): Promise<FareEstimate[]> {
    const res = await this.client.post<FareEstimate[]>('/rides/estimate', { origin, destination });
    return res.data;
  }

  /** Cria a corrida; o preço cobrado é o mesmo da estimativa da categoria. */
  async requestRide(params: {
    origin: AddressLocation;
    destination: AddressLocation;
    category: 'pop' | 'black' | 'mulher' | 'moto';
    paymentMethod: PaymentMethodType;
  }): Promise<Ride> {
    const res = await this.client.post<Ride>('/rides/request', params);
    return res.data;
  }

  /** Polling do passageiro: também faz a corrida avançar no despacho. */
  async getRide(rideId: string): Promise<Ride> {
    const res = await this.client.get<Ride>(`/rides/${rideId}`);
    return res.data;
  }

  async cancelRide(rideId: string, reason: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/cancel`, { reason });
    return res.data;
  }

  /**
   * Motorista avisa que chegou ao embarque (o passageiro recebe um push). Só vale
   * a até 300 m do embarque (422 `TOO_FAR_FROM_PICKUP`); sem a posição, a API usa a
   * última recebida se for recente (senão 422 `LOCATION_REQUIRED`). Idempotente.
   */
  async markArrived(rideId: string, position?: { latitude: number; longitude: number }): Promise<Ride> {
    const res = await this.client.post<Ride>(
      `/rides/${rideId}/arrived`,
      position ? { latitude: position.latitude, longitude: position.longitude } : {},
    );
    return res.data;
  }

  /** Motorista valida o PIN informado pelo passageiro e inicia a viagem. */
  async validatePin(rideId: string, pin: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/validate-pin`, { pin });
    return res.data;
  }

  async completeRide(rideId: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/complete`);
    return res.data;
  }

  /** Aciona o SOS; `trustedContactsNotified` diz quantos contatos de confiança recebem o SMS. */
  async triggerSos(
    rideId: string,
    latitude: number,
    longitude: number,
  ): Promise<{ success: boolean; incidentId: string; trustedContactsNotified: number }> {
    const res = await this.client.post<{ success: boolean; incidentId: string; trustedContactsNotified: number }>(
      `/rides/${rideId}/sos`,
      { latitude, longitude },
    );
    return res.data;
  }

  async cancelSos(rideId: string, emergencyPin: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(`/rides/${rideId}/sos/cancel`, { emergencyPin });
    return res.data;
  }

  async getChatMessages(rideId: string): Promise<ChatMessage[]> {
    const res = await this.client.get<ChatMessage[]>(`/rides/${rideId}/chat`);
    return res.data;
  }

  async sendChatMessage(rideId: string, message: string): Promise<ChatMessage> {
    const res = await this.client.post<ChatMessage>(`/rides/${rideId}/chat`, { message });
    return res.data;
  }
}
