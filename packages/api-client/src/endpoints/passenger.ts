import { VoztriApiClient } from '../client.js';

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
}
