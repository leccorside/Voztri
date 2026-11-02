import type { AddressLocation } from '@voztri/shared-types';
import { VoztriApiClient } from '../client.js';

/** Endereços salvos do passageiro. */
export type SavedPlaceKind = 'home' | 'work';

export type SavedPlaces = Record<SavedPlaceKind, AddressLocation | null>;

/** Casa e Trabalho do passageiro, guardados na conta. */
export class PlacesApi {
  constructor(private client: VoztriApiClient) {}

  async list(): Promise<SavedPlaces> {
    const res = await this.client.get<SavedPlaces>('/places');
    return res.data;
  }

  /** Cria ou troca o endereço do tipo; devolve todos os endereços salvos. */
  async save(kind: SavedPlaceKind, place: AddressLocation): Promise<SavedPlaces> {
    const res = await this.client.put<SavedPlaces>(`/places/${kind}`, {
      address: place.address,
      shortAddress: place.shortAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      ...(place.city ? { city: place.city } : {}),
      ...(place.state ? { state: place.state } : {}),
    });
    return res.data;
  }

  async remove(kind: SavedPlaceKind): Promise<void> {
    await this.client.delete(`/places/${kind}`);
  }
}
