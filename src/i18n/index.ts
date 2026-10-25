import { IS_DEV } from 'config';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';
import pseudo from './locales/pseudo.json';

export type DotNestedKeys<T> = T extends
  | string
  | number
  | boolean
  | null
  | undefined
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
        ? `${K}` | `${K}.${DotNestedKeys<T[K]>}`
        : `${K}`;
    }[Extract<keyof T, string>];

export type Messages = typeof enUS;
export type I18nKey = DotNestedKeys<Messages>;

const locales = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-ES': esES,
  pseudo,
} as const;

export type Locale = keyof typeof locales;

/**
 * The product's default language — choose intentionally: the app starts in
 * it when no choice is saved and the browser's language is not supported
 * (provider.tsx), and it fills in keys missing from another locale.
 */
export const DEFAULT_LOCALE: Locale = 'en-US';

let currentLocale: Locale = DEFAULT_LOCALE;

export const getLocale = (): Locale => currentLocale;
export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

const getByPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (
      acc &&
      typeof acc === 'object' &&
      part in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

const interpolate = (
  template: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
};

export type TranslationParams = Record<string, string | number>;

/** Pure lookup for an explicit locale (falls back to DEFAULT_LOCALE). */
export const translate = (
  locale: Locale,
  key: I18nKey,
  params?: TranslationParams,
): string => {
  const candidate = getByPath(locales[locale], key);
  if (typeof candidate === 'string') return interpolate(candidate, params);
  const fallback = getByPath(locales[DEFAULT_LOCALE], key);
  if (typeof fallback === 'string') return interpolate(fallback, params);
  if (IS_DEV) {
    // Surface missing keys during development.
    console.warn(`[i18n] Missing key: ${key}`);
  }
  return key; // last-resort echo of the key
};

/**
 * Translate with the active locale, for code outside React (e.g. startup
 * errors). Components must use `useI18n().t`, which re-renders and changes
 * identity when the locale changes.
 */
export const t = (key: I18nKey, params?: TranslationParams): string =>
  translate(currentLocale, key, params);

// Formatters (locale-aware)
const currencyByLocale: Record<Locale, string> = {
  'pt-BR': 'BRL',
  'en-US': 'USD',
  'es-ES': 'EUR',
  pseudo: 'USD',
};

/** The currency a locale formats amounts in when none is given. */
export const defaultCurrency = (locale: Locale): string =>
  currencyByLocale[locale] ?? 'USD';

export const formatCurrency = (
  value: number,
  opts?: {
    locale?: Locale | undefined;
    currency?: string | undefined;
    maximumFractionDigits?: number | undefined;
  },
): string => {
  const locale = opts?.locale ?? getLocale();
  const currency = opts?.currency ?? defaultCurrency(locale);
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value);
};

export const formatNumber = (
  value: number,
  opts?: {
    locale?: Locale | undefined;
    maximumFractionDigits?: number | undefined;
    useGrouping?: boolean | undefined;
  },
): string => {
  const locale = opts?.locale ?? getLocale();
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 0;
  const useGrouping = opts?.useGrouping ?? true;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    useGrouping,
  }).format(value);
};

export const formatPercent = (
  value: number,
  options?: { maximumFractionDigits?: number },
): string =>
  new Intl.NumberFormat(getLocale(), {
    style: 'percent',
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(value);

export const formatDuration = (months: number): string => {
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  const locale = getLocale();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const clean = (s: string) => s.replace(/^\s*in\s+|\s+ago\s*$/gi, '').trim();
  if (years > 0) parts.push(clean(rtf.format(years, 'year')));
  if (remMonths > 0) parts.push(clean(rtf.format(remMonths, 'month')));
  return parts.join(' ');
};

export default {
  t,
  setLocale,
  getLocale,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDuration,
};
