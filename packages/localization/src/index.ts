import { ptBR } from './pt-BR.js';
import { enUS } from './en-US.js';
import { esES } from './es-ES.js';

export const translations = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
} as const;

export type SupportedLocale = keyof typeof translations;

let currentLocale: SupportedLocale = 'pt-BR';

export function setLocale(locale: SupportedLocale): void {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function t(): typeof ptBR {
  return translations[currentLocale] || ptBR;
}

export { ptBR, enUS, esES };

