import type { AddressLocation, Coordinates } from '@voztri/shared-types';
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

/** Lugar encontrado pela busca: título (nome ou rua), endereço e coordenada. */
interface SearchResult {
  address: string;
  shortAddress: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
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

  /**
   * Busca de destino pelo texto (mínimo de 3 letras), perto de `near` (a API arredonda
   * a ~1 km e limita a busca à região). Lista vazia quando nada foi encontrado; rejeita
   * com 503 GEOCODING_UNAVAILABLE com o provedor fora do ar.
   */
  async search(query: string, near: Coordinates): Promise<AddressLocation[]> {
    const res = await this.client.get<{ results: SearchResult[] }>('/geo/search', {
      params: { q: query, latitude: near.latitude, longitude: near.longitude },
    });
    return res.data.results.map((r) => ({
      address: r.address,
      shortAddress: r.shortAddress,
      latitude: r.latitude,
      longitude: r.longitude,
      ...(r.city ? { city: r.city } : {}),
      ...(r.state ? { state: r.state } : {}),
    }));
  }
}
