import { NativeModules, Platform } from 'react-native';

/** Configuração repassada ao rastreamento nativo (Android e iOS). */
export interface BackgroundTrackingConfig {
  apiUrl: string;
  token: string;
  intervalMs: number;
  distanceM: number;
  /** Só no Android; no iOS não há filtro (parado também precisa de leituras). */
  distanceFilterM: number;
  /** Parado, reenvia a última posição a cada intervalo destes (batimento). */
  heartbeatMs: number;
}

interface NativeTracking {
  start(config: BackgroundTrackingConfig): Promise<boolean>;
  stop(): Promise<boolean>;
  status(): Promise<{ running: boolean; lastHttpStatus: number }>;
}

// Mesmo nome e mesma API nas duas plataformas; ausente em builds sem o módulo
const native: NativeTracking | undefined =
  Platform.OS === 'android' || Platform.OS === 'ios' ? NativeModules.VoztriLocationTracking : undefined;

/**
 * Rastreamento nativo que envia a posição para /driver/location com o app em
 * segundo plano, sem depender do JavaScript:
 * - Android: LocationTrackingService (serviço em primeiro plano com notificação);
 * - iOS: VoztriLocationTracking.m (CLLocationManager próprio com
 *   pausesLocationUpdatesAutomatically = NO, activityType automotiveNavigation e
 *   sem filtro de distância, para seguir enviando com o motorista parado).
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
