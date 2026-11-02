import { VoztriApiClient } from '../client.js';

/** Endereço de uma coordenada, no formato dos endereços do app. */
export interface ReverseGeocodeResult {
  /** "Av. Paulista, 1578 - Bela Vista, São Paulo - SP" */
  address: string;
  /** "Av. Paulista, 1578" */
  shortAddress: string;
  city: string | null;
  state: string | null;
}

export class GeoApi {
  constructor(private client: VoztriApiClient) {}

  /**
   * Geocodificação reversa (embarque pelo GPS). Rejeita com 404 ADDRESS_NOT_FOUND
   * sem endereço e 503 GEOCODING_UNAVAILABLE com o provedor fora do ar.
   */
  async reverse(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const res = await this.client.get<ReverseGeocodeResult>('/geo/reverse', { params: { latitude, longitude } });
    return res.data;
  }
}
