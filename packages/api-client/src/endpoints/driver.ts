import { VoztriApiClient } from '../client.js';
import {
  CnhCategory,
  DriverCurrentState,
  DriverEarningsSummary,
  DriverRegistration,
  Ride,
  SelfServiceVehicleCategory,
} from '@voztri/shared-types';

export class DriverApi {
  constructor(private client: VoztriApiClient) {}

  async setOnlineStatus(isOnline: boolean): Promise<{ isOnline: boolean; message: string }> {
    const res = await this.client.post<{ isOnline: boolean; message: string }>('/driver/status', { isOnline });
    return res.data;
  }

  /** Polling do motorista: corrida em andamento ou oferta pendente. */
  async getCurrent(): Promise<DriverCurrentState> {
    const res = await this.client.get<DriverCurrentState>('/driver/rides/current');
    return res.data;
  }

  /**
   * Envia a posição do GPS. `accuracy` é o raio de incerteza em metros: a
   * chegada automática ao embarque só é marcada se distância + accuracy couber
   * em 100 m (sem accuracy, não é marcada). `arrivedAtPickup` indica que esta
   * posição marcou a chegada.
   */
  async updateLocation(params: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }): Promise<{ success: boolean; arrivedAtPickup: boolean; rideId: string | null }> {
    const res = await this.client.post<{ success: boolean; arrivedAtPickup?: boolean; rideId?: string | null }>(
      '/driver/location',
      params,
    );
    return { success: res.data.success, arrivedAtPickup: res.data.arrivedAtPickup ?? false, rideId: res.data.rideId ?? null };
  }

  async getEarnings(): Promise<DriverEarningsSummary> {
    const res = await this.client.get<DriverEarningsSummary>('/driver/earnings');
    return res.data;
  }

  async acceptOffer(rideId: string): Promise<Ride> {
    const res = await this.client.post<Ride>(`/rides/${rideId}/accept`);
    return res.data;
  }

  async rejectOffer(rideId: string): Promise<{ success: boolean }> {
    const res = await this.client.post<{ success: boolean }>(`/rides/${rideId}/reject`);
    return res.data;
  }

  /** Situação do cadastro pelo app (etapas preenchidas e a próxima pendente). */
  async getRegistration(): Promise<DriverRegistration> {
    const res = await this.client.get<DriverRegistration>('/driver/registration');
    return res.data;
  }

  /**
   * Etapa "Dados pessoais". Datas em AAAA-MM-DD; CPF com ou sem máscara. Erros 422 em
   * português por campo; 409 REGISTRATION_LOCKED depois de enviado para análise.
   */
  async savePersonalData(data: { name: string; cpf: string; birthDate: string; email: string | null }): Promise<DriverRegistration> {
    const res = await this.client.put<DriverRegistration>('/driver/registration/personal', data);
    return res.data;
  }

  /** Etapa "CNH": número (11 dígitos), categoria, validade (AAAA-MM-DD) e EAR. */
  async saveCnh(data: { number: string; category: CnhCategory; expiresAt: string; hasEar: boolean }): Promise<DriverRegistration> {
    const res = await this.client.put<DriverRegistration>('/driver/registration/cnh', data);
    return res.data;
  }

  /**
   * Etapa "Veículo". A categoria da CNH precisa permitir o tipo (moto: A; carro: B ou
   * acima): senão, 422 em `errors.category`. Sem a CNH, 422 CNH_REQUIRED.
   */
  async saveVehicle(data: {
    brand: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    renavam: string;
    category: SelfServiceVehicleCategory;
  }): Promise<DriverRegistration> {
    const res = await this.client.put<DriverRegistration>('/driver/registration/vehicle', data);
    return res.data;
  }
}
