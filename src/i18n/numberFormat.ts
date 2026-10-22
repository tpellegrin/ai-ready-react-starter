import { formatCurrency, formatNumber, getLocale, type Locale } from 'i18n';

export type FormatMode = 'currency' | 'number';

// Cache for locale separators
const sepCache: Record<string, { group: string; decimal: string }> = {};

/**
 * Returns grouping and decimal separators for a given locale using Intl.NumberFormat.
 */
export const getSeparators = (locale: string) => {
  const hit = sepCache[locale];
  if (hit) return hit;
  const numberWithGroupAndDecimal = 12345.6;
  const parts = new Intl.NumberFormat(locale).formatToParts(
    numberWithGroupAndDecimal,
  );
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const value = { group, decimal };

  sepCache[locale] = value;
  return value;
};

/**
 * Parses a locale-formatted numeric string into a number.
 * Returns null for empty/invalid transient states (e.g., "-", "0,", ".").
 */
export const parseLocaleNumber = (text: string, locale: string) => {
  const { group, decimal } = getSeparators(locale);
  const cleaned = text
    .replace(new RegExp(`[^0-9\\${decimal}-]`, 'g'), '')
    .replace(new RegExp(`\\${group}`, 'g'), '')
    .replace(decimal, '.');

  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.')
    return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/**
 * Formats a Number according to locale and selected mode (currency or number).
 */
export const formatWithIntl = (
  value: number,
  opts: {
    locale?: Locale | undefined;
    format?: FormatMode | undefined;
    currency?: string | undefined;
    maximumFractionDigits?: number | undefined;
    useGrouping?: boolean | undefined;
  } = {},
) => {
  const { format, currency, maximumFractionDigits, useGrouping } = opts;
  const locale = opts.locale ?? getLocale();

  if (format === 'currency') {
    return formatCurrency(value, {
      locale,
      currency,
      maximumFractionDigits: maximumFractionDigits ?? 2,
    });
  }

  return formatNumber(value, {
    locale,
    maximumFractionDigits: maximumFractionDigits ?? 0,
    useGrouping: useGrouping ?? true,
  });
};

/** What the user has typed so far in a numeric field, beyond its value. */
export type TypedNumber = {
  /** Parsed value, limited to the allowed fraction digits; null if empty. */
  value: number | null;
  /** A decimal separator was typed (e.g. "1."). */
  hasDecimal: boolean;
  /** Fraction digits typed so far, trailing zeros included (e.g. "1.50"). */
  fractionDigits: number;
};

/**
 * Parses in-progress input for a decimal field. Unlike parseLocaleNumber it
 * keeps what formatting would erase while typing (a trailing separator,
 * trailing zeros) and drops — rather than rounds — digits beyond
 * `maximumFractionDigits`, so the value always matches the display.
 */
export const parseTypedNumber = (
  text: string,
  locale: string,
  maximumFractionDigits: number,
): TypedNumber => {
  const { decimal } = getSeparators(locale);
  // After the first digit: a currency symbol such as "kr." is not a decimal.
  const firstDigit = text.search(/\d/);
  const index =
    maximumFractionDigits > 0 && firstDigit !== -1
      ? text.indexOf(decimal, firstDigit)
      : -1;
  if (index === -1) {
    const integerPart =
      maximumFractionDigits > 0 ? text : (text.split(decimal)[0] ?? '');
    return {
      value: parseLocaleNumber(integerPart, locale),
      hasDecimal: false,
      fractionDigits: 0,
    };
  }
  const fraction = text
    .slice(index + 1)
    .replace(/\D/g, '')
    .slice(0, maximumFractionDigits);
  const integerPart = text.slice(0, index);
  return {
    value: parseLocaleNumber(`${integerPart}${decimal}${fraction}`, locale),
    hasDecimal: true,
    fractionDigits: fraction.length,
  };
};

/**
 * Formats in-progress input, keeping a typed separator and trailing zeros.
 * With `currency`, the amount keeps its currency symbol ("$1,980.").
 */
export const formatTypedNumber = (
  typed: TypedNumber & { value: number },
  opts: {
    locale: string;
    maximumFractionDigits: number;
    useGrouping?: boolean | undefined;
    currency?: string | undefined;
  },
): string => {
  const parts = new Intl.NumberFormat(opts.locale, {
    ...(opts.currency ? { style: 'currency', currency: opts.currency } : {}),
    minimumFractionDigits: typed.hasDecimal
      ? Math.max(typed.fractionDigits, 1)
      : 0,
    maximumFractionDigits: Math.max(opts.maximumFractionDigits, 1),
    useGrouping: opts.useGrouping ?? true,
  }).formatToParts(typed.value);
  // "1." has no fraction digits yet: keep the separator, drop the digit.
  return parts
    .filter((part) => typed.fractionDigits > 0 || part.type !== 'fraction')
    .map((part) => part.value)
    .join('');
};
