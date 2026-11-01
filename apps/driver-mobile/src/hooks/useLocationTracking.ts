import { useEffect } from 'react';
import { Alert } from 'react-native';
import { currentToken } from '../api.js';
import { backgroundTracking } from '../backgroundTracking.js';
import { API_URL, LOCATION_DISTANCE_FILTER_M, LOCATION_SEND_DISTANCE_M, LOCATION_SEND_INTERVAL_MS } from '../config.js';
import {
  hasBackgroundLocationPermission,
  requestBackgroundLocationPermission,
  requestLocationPermission,
  requestNotificationPermission,
  setBackgroundUpdates,
  watchPosition,
} from '../location.js';
import { useDriverStore } from '../store/driverStore.js';

const store = useDriverStore.getState;

/**
 * Pede a localização em segundo plano à parte, depois de explicar o motivo
 * (exigência da Google Play e da App Store para essa permissão). Uma vez por sessão.
 */
async function askBackgroundPermission(): Promise<void> {
  if (store().backgroundPromptShown) return;
  if (await hasBackgroundLocationPermission()) {
    store().setBackgroundPermission('granted');
    return;
  }
  store().markBackgroundPromptShown();

  Alert.alert(
    'Localização em segundo plano',
    'Para continuar recebendo corridas próximas com o app minimizado ou com a tela desligada, o VOZTRI Driver usa sua ' +
      'localização em segundo plano enquanto você estiver online. Ela nunca é usada quando você está offline.\n\n' +
      'Na próxima tela, escolha "Permitir o tempo todo".',
    [
      { text: 'Agora não', style: 'cancel', onPress: () => store().setBackgroundPermission('denied') },
      {
        text: 'Continuar',
        onPress: () => {
          void requestBackgroundLocationPermission().then((result) =>
            store().setBackgroundPermission(result === 'granted' ? 'granted' : 'denied'),
          );
        },
      },
    ],
  );
}

/**
 * Durante o turno online:
 * - Android: inicia o LocationTrackingService, que envia a posição mesmo com o app
 *   em segundo plano (notificação fixa enquanto online);
 * - iOS: liga o allowsBackgroundLocationUpdates e o JS segue enviando;
 * - em ambos, acompanha o GPS no JS para exibir a posição e a precisão na tela.
 *
 * O serviço para quando o motorista fica offline ou sai da conta (enabled = false),
 * e não quando a tela é destruída: online, ele segue rastreando.
 */
export function useLocationTracking(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      void backgroundTracking.stop();
      setBackgroundUpdates(false);
      if (store().backgroundMode !== 'off') store().setBackgroundMode('off');
      if (store().locationStatus !== 'off') store().setLocationStatus('off');
      return undefined;
    }

    let cancelled = false;
    let stopWatch: (() => void) | undefined;

    void (async () => {
      // Sessão retomada já online também precisa da permissão (sem diálogo se já concedida)
      const permission = await requestLocationPermission();
      if (cancelled) return;
      if (permission !== 'granted') {
        store().onLocationPermission(permission);
        return;
      }

      if (backgroundTracking.supported) {
        await requestNotificationPermission().catch(() => false);
        const token = currentToken();
        const started = token
          ? await backgroundTracking.start({
              apiUrl: API_URL,
              token,
              intervalMs: LOCATION_SEND_INTERVAL_MS,
              distanceM: LOCATION_SEND_DISTANCE_M,
              distanceFilterM: LOCATION_DISTANCE_FILTER_M,
            })
          : false;
        if (cancelled) return;
        store().setBackgroundMode(started ? 'native' : 'foreground-only');
      } else {
        setBackgroundUpdates(true);
        store().setBackgroundMode('ios');
      }

      stopWatch = watchPosition(
        (position) => void store().reportPosition(position),
        (error) => store().onLocationError(error),
        { distanceFilterMeters: LOCATION_DISTANCE_FILTER_M, intervalMs: 5000 },
      );

      void askBackgroundPermission();
    })();

    return () => {
      cancelled = true;
      stopWatch?.();
    };
  }, [enabled]);
}
