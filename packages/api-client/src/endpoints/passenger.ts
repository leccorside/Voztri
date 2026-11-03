import { VoztriApiClient } from '../client.js';

/** Contato de confiança: recebe um SMS quando o passageiro aciona o SOS. */
export interface TrustedContact {
  id: string;
  name: string;
  /** Celular só com dígitos (DDD + número), ex.: 11987654321. */
  phone: string;
}

/** Dados de segurança do passageiro. */
export class PassengerApi {
  constructor(private client: VoztriApiClient) {}

  /**
   * Define (primeira vez) ou troca o PIN de emergência, que desativa o SOS. Para
   * trocar, a API exige o PIN atual. Erros: 422 WEAK_EMERGENCY_PIN (0000, 1234...),
   * 422 INVALID_EMERGENCY_PIN (PIN atual errado), 429 TOO_MANY_ATTEMPTS.
   */
  async setEmergencyPin(pin: string, currentPin?: string): Promise<{ hasEmergencyPin: boolean }> {
    const res = await this.client.put<{ hasEmergencyPin: boolean }>('/passenger/emergency-pin', {
      pin,
      ...(currentPin ? { currentPin } : {}),
    });
    return res.data;
  }

  /** Contatos de confiança, na ordem em que foram cadastrados (até 5). */
  async listTrustedContacts(): Promise<TrustedContact[]> {
    const res = await this.client.get<TrustedContact[]>('/passenger/trusted-contacts');
    return res.data;
  }

  /**
   * Cadastra um contato (celular com DDD, com ou sem máscara/+55). Erros 422 em
   * português por campo (`errors.name`, `errors.phone`); 422 TOO_MANY_CONTACTS acima de 5.
   */
  async addTrustedContact(contact: Omit<TrustedContact, 'id'>): Promise<TrustedContact> {
    const res = await this.client.post<TrustedContact>('/passenger/trusted-contacts', contact);
    return res.data;
  }

  async updateTrustedContact(id: string, contact: Omit<TrustedContact, 'id'>): Promise<TrustedContact> {
    const res = await this.client.put<TrustedContact>(`/passenger/trusted-contacts/${id}`, contact);
    return res.data;
  }

  /** Remove o contato e devolve a lista atualizada. */
  async removeTrustedContact(id: string): Promise<TrustedContact[]> {
    const res = await this.client.delete<TrustedContact[]>(`/passenger/trusted-contacts/${id}`);
    return res.data;
  }
}
