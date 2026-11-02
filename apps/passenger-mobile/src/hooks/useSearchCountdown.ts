import { useEffect, useState } from 'react';
import { SEARCH_TIMEOUT_MS } from '../config.js';

/**
 * Segundos restantes do prazo da busca (createdAt + SEARCH_TIMEOUT_MS), atualizados
 * a cada segundo. null sem createdAt válido. Usa o relógio do aparelho: com o
 * relógio adiantado ou atrasado, o contador fica deslocado (quem encerra a busca é
 * a API, então isso só afeta a exibição); o valor fica sempre entre 0 e o prazo.
 */
export function useSearchCountdown(createdAt: string | null | undefined): number | null {
  const deadline = createdAt ? Date.parse(createdAt) + SEARCH_TIMEOUT_MS : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(deadline)) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (Number.isNaN(deadline)) return null;
  const remainingMs = Math.min(SEARCH_TIMEOUT_MS, Math.max(0, deadline - now));
  return Math.ceil(remainingMs / 1000);
}

/** 157 -> "2:37". */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
