import { useCallback, useEffect, useRef, useState } from 'react';
import type { AddressLocation, Coordinates } from '@voztri/shared-types';
import { geoApi } from '../api.js';

/** A API só busca a partir de 3 letras. */
export const MIN_SEARCH_LENGTH = 3;
/** Espera a digitação parar antes de buscar (menos chamadas ao Photon). */
export const SEARCH_DEBOUNCE_MS = 400;

export type DestinationSearchStatus = 'idle' | 'loading' | 'done' | 'error';

export interface DestinationSearch {
  /** idle: menos de 3 letras; loading: buscando; done: resultados (podem ser 0); error: falhou. */
  status: DestinationSearchStatus;
  results: AddressLocation[];
  /** Repete a última busca (depois de um erro). */
  retry: () => void;
}

/**
 * Busca de destino pelo texto (API → Photon), perto de `near` (o embarque).
 * Respostas atrasadas de um texto antigo são descartadas.
 */
export function useDestinationSearch(query: string, near: Coordinates): DestinationSearch {
  const term = query.trim().replace(/\s+/g, ' ');
  const [status, setStatus] = useState<DestinationSearchStatus>('idle');
  const [results, setResults] = useState<AddressLocation[]>([]);
  const [attempt, setAttempt] = useState(0);
  // Número da busca em andamento: uma resposta de busca anterior é ignorada
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    if (term.length < MIN_SEARCH_LENGTH) {
      setStatus('idle');
      setResults([]);
      return undefined;
    }
    setStatus('loading');
    const timer = setTimeout(() => {
      geoApi
        .search(term, near)
        .then((found) => {
          if (id !== seq.current) return;
          setResults(found);
          setStatus('done');
        })
        .catch(() => {
          if (id !== seq.current) return;
          setResults([]);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // near entra pela coordenada (o objeto da origem muda quando o endereço chega)
  }, [term, near.latitude, near.longitude, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { status, results, retry };
}
