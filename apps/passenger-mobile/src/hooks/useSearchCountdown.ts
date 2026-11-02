import { useEffect, useState } from 'react';
import { SEARCH_TIMEOUT_MS } from '../config.js';
import { serverClock } from '../serverClock.js';

/**
 * Segundos restantes do prazo da busca (createdAt + SEARCH_TIMEOUT_MS), atualizados
 * a cada segundo. null sem createdAt válido.
 *
 * O createdAt vem do relógio do servidor, então "agora" também: serverClock.now()
 * corrige o relógio do aparelho pelo header Date das respostas da API (adiantado ou
 * atrasado, o contador continua certo). Sem nenhuma medida ainda, usa o relógio do
 * aparelho. O valor fica sempre entre 0 e o prazo.
 */
export function useSearchCountdown(createdAt: string | null | undefined): number | null {
  const deadline = createdAt ? Date.parse(createdAt) + SEARCH_TIMEOUT_MS : NaN;
  const [now, setNow] = useState(() => serverClock.now());

  useEffect(() => {
    if (Number.isNaN(deadline)) return undefined;
    setNow(serverClock.now());
    const id = setInterval(() => setNow(serverClock.now()), 1000);
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
