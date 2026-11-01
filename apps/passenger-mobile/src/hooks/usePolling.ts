import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Executa `fn` imediatamente e depois a cada `intervalMs`, sem sobrepor
 * chamadas (a próxima só é agendada quando a anterior termina). Pausa enquanto
 * o app está em segundo plano e para quando `enabled` fica falso.
 */
export function usePolling(fn: () => Promise<unknown> | void, intervalMs: number, enabled: boolean): void {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (!active) return;
      // Pausa só em segundo plano: no iOS o estado começa como 'unknown' até o primeiro evento
      if (AppState.currentState !== 'background') {
        try {
          await fnRef.current();
        } catch {
          // Os stores já tratam e exibem os erros
        }
      }
      if (active) timer = setTimeout(tick, intervalMs);
    };

    void tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, intervalMs]);
}
