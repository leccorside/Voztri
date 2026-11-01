import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api.js';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Executa uma chamada assíncrona ao montar o componente e, opcionalmente,
 * a repete a cada `pollMs` milissegundos (sem sobrepor requisições).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = [], pollMs?: number): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const run = async (initial: boolean) => {
      if (initial) setLoading(true);
      try {
        const result = await fnRef.current();
        if (!active) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (active) setError(errorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
          if (pollMs) timer = window.setTimeout(() => void run(false), pollMs);
        }
      }
    };

    void run(true);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, pollMs, ...deps]);

  return { data, error, loading, reload };
}
