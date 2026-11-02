/**
 * Relógio do servidor visto pelo aparelho: Date.now() corrigido pelo deslocamento
 * medido no header Date das respostas da API (VoztriApiClient.onClockSample).
 *
 * Usa a mediana das últimas medidas: uma resposta lenta isolada não faz o
 * contador pular. Sem nenhuma medida, o deslocamento é zero (relógio do aparelho).
 */

const MAX_SAMPLES = 7;
const samples: number[] = [];

export const serverClock = {
  /** Registra uma medida (ms que o servidor está à frente do aparelho). */
  record(offsetMs: number): void {
    if (!Number.isFinite(offsetMs)) return;
    samples.push(offsetMs);
    if (samples.length > MAX_SAMPLES) samples.shift();
  },

  /** Deslocamento atual (mediana das medidas), em ms. */
  offsetMs(): number {
    if (samples.length === 0) return 0;
    const sorted = [...samples].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  },

  /** Agora, no relógio do servidor (ms desde a época). */
  now(): number {
    return Date.now() + serverClock.offsetMs();
  },

  /** Só para os testes. */
  reset(): void {
    samples.length = 0;
  },
};
