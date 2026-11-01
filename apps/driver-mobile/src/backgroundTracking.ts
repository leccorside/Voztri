import { NativeModules, Platform } from 'react-native';

/** Configuração repassada ao LocationTrackingService (Android). */
export interface BackgroundTrackingConfig {
  apiUrl: string;
  token: string;
  intervalMs: number;
  distanceM: number;
  distanceFilterM: number;
}

interface NativeTracking {
  start(config: BackgroundTrackingConfig): Promise<boolean>;
  stop(): Promise<boolean>;
  status(): Promise<{ running: boolean; lastHttpStatus: number }>;
}

const native: NativeTracking | undefined = Platform.OS === 'android' ? NativeModules.VoztriLocationTracking : undefined;

/**
 * Serviço nativo em primeiro plano (Android) que envia a posição para
 * /driver/location com o app em segundo plano. No iOS o envio segue pelo
 * JavaScript, com o allowsBackgroundLocationUpdates ligado (setBackgroundUpdates).
 */
export const backgroundTracking = {
  supported: !!native,

  /** Inicia o serviço; resolve false se não for possível (o app segue enviando pelo JS). */
  async start(config: BackgroundTrackingConfig): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.start(config);
    } catch {
      return false;
    }
  },

  async stop(): Promise<void> {
    if (native) await native.stop().catch(() => undefined);
  },

  async status(): Promise<{ running: boolean; lastHttpStatus: number } | null> {
    return native ? native.status().catch(() => null) : null;
  },
};
