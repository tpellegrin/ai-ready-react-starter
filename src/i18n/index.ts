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

// Base UI language for fallbacks — choose intentionally
const baseLocale: Locale = 'en-US';

let currentLocale: Locale = 'en-US';

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

export const t = (
  key: I18nKey,
  params?: Record<string, string | number>,
): string => {
  const candidate = getByPath(locales[currentLocale], key);
  if (typeof candidate === 'string') return interpolate(candidate, params);
  const fallback = getByPath(locales[baseLocale], key);
  if (typeof fallback === 'string') return interpolate(fallback, params);
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env?.MODE !== 'production'
  ) {
    // Surface missing key during development
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing key: ${key}`);
  }
  return key; // last-resort echo of the key
};

// Formatters (locale-aware)
const currencyByLocale: Record<Locale, string> = {
  'pt-BR': 'BRL',
  'en-US': 'USD',
  'es-ES': 'EUR',
  pseudo: 'USD',
};

export const formatCurrency = (
  value: number,
  opts?: { locale?: Locale; currency?: string; maximumFractionDigits?: number },
): string => {
  const locale = opts?.locale ?? getLocale();
  const currency = opts?.currency ?? currencyByLocale[locale] ?? 'USD';
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
    locale?: Locale;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
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
