import { useEffect } from 'react';
import { LOCATION_DISTANCE_FILTER_M } from '../config.js';
import { requestLocationPermission, watchPosition } from '../location.js';
import { useDriverStore } from '../store/driverStore.js';

/**
 * Acompanha o GPS enquanto `enabled` (motorista online) e repassa cada posição
 * ao store, que envia para /driver/location. Funciona com o app aberto; o envio
 * em segundo plano exigiria um serviço nativo em primeiro plano (ainda não feito).
 */
export function useLocationTracking(enabled: boolean): void {
  useEffect(() => {
    const store = useDriverStore.getState;
    if (!enabled) {
      if (store().locationStatus !== 'off') store().setLocationStatus('off');
      return undefined;
    }

    let cancelled = false;
    let stop: (() => void) | undefined;

    void (async () => {
      // Sessão retomada já online também precisa da permissão (sem diálogo se já concedida)
      const permission = await requestLocationPermission();
      if (cancelled) return;
      if (permission !== 'granted') {
        store().onLocationPermission(permission);
        return;
      }
      stop = watchPosition(
        (position) => void store().reportPosition(position),
        (error) => store().onLocationError(error),
        { distanceFilterMeters: LOCATION_DISTANCE_FILTER_M, intervalMs: 5000 },
      );
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled]);
}
