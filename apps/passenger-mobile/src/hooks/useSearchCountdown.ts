import { useEffect, useState } from 'react';
import type { Ride } from '@voztri/shared-types';
import { serverClock } from '../serverClock.js';

export interface SearchCountdown {
  /** Segundos até o prazo da busca (0 quando venceu). */
  remainingSeconds: number;
  /** Duração total da busca, em segundos (searchExpiresAt - createdAt), para a barra. */
  totalSeconds: number;
}

/** Duração da busca definida pela API (ms), ou null sem os campos. */
export function searchDurationMs(ride: Pick<Ride, 'createdAt' | 'searchExpiresAt'>): number | null {
  const start = Date.parse(ride.createdAt);
  const end = ride.searchExpiresAt ? Date.parse(ride.searchExpiresAt) : NaN;
  return Number.isNaN(start) || Number.isNaN(end) || end <= start ? null : end - start;
}

/**
 * Contador do prazo da busca, atualizado a cada segundo. O prazo vem pronto da API
 * (searchExpiresAt): o app não conhece a duração da busca, então ela pode mudar no
 * backend sem atualizar o app. null sem o prazo (fora da busca ou API antiga).
 *
 * O prazo está no relógio do servidor, então "agora" também: serverClock.now()
 * corrige o relógio do aparelho pelo header Date das respostas da API. O restante
 * fica sempre entre 0 e a duração total.
 */
export function useSearchCountdown(
  ride: Pick<Ride, 'createdAt' | 'searchExpiresAt'> | null | undefined,
): SearchCountdown | null {
  const deadline = ride?.searchExpiresAt ? Date.parse(ride.searchExpiresAt) : NaN;
  const totalMs = ride ? searchDurationMs(ride) : null;
  const [now, setNow] = useState(() => serverClock.now());

  useEffect(() => {
    if (Number.isNaN(deadline)) return undefined;
    setNow(serverClock.now());
    const id = setInterval(() => setNow(serverClock.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (Number.isNaN(deadline)) return null;
  const remainingMs = Math.max(0, deadline - now);
  const cappedMs = totalMs !== null ? Math.min(totalMs, remainingMs) : remainingMs;
  return {
    remainingSeconds: Math.ceil(cappedMs / 1000),
    totalSeconds: totalMs !== null ? Math.round(totalMs / 1000) : Math.ceil(cappedMs / 1000),
  };
}

/** 157 -> "2:37". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
