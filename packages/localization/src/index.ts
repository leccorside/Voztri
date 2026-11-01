import { ptBR } from './pt-BR.js';
import { enUS } from './en-US.js';
import { esES } from './es-ES.js';

/**
 * Mesma estrutura de chaves do pt-BR (idioma de referência), mas com valores
 * `string`: os arquivos usam `as const`, então sem isso o tipo de cada texto
 * seria o literal em português e en-US/es-ES nunca seriam atribuíveis.
 */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Translation = Widen<typeof ptBR>;

export type SupportedLocale = 'pt-BR' | 'en-US' | 'es-ES';

// A anotação também faz o compilador acusar chaves faltando em en-US/es-ES.
export const translations: Readonly<Record<SupportedLocale, Translation>> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
};

let currentLocale: SupportedLocale = 'pt-BR';

export function setLocale(locale: SupportedLocale): void {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(): Translation {
  return translations[currentLocale] || ptBR;
}

export { ptBR, enUS, esES };

