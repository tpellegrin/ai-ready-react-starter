import { getSeparators } from 'utils/numberFormat';

/**
 * Counts numeric digits before a caret index in a string (ignores separators/currency symbols).
 */
export const countDigitsBefore = (text: string, caret: number) => {
  let count = 0;
  const end = Math.min(caret, text.length);
  for (let i = 0; i < end; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') count++;
  }
  return count;
};

/**
 * Finds caret index in a string such that there are `targetDigits` digits to its left.
 */
export const indexFromDigitCount = (text: string, targetDigits: number) => {
  if (targetDigits <= 0) return 0;
  let digits = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      digits++;
      if (digits >= targetDigits) return i + 1; // caret after that digit
    }
  }
  return text.length;
};

/**
 * Finds the index of the locale decimal separator in a formatted string.
 * Returns -1 if no decimal separator is present.
 */
export const getDecimalIndex = (text: string, locale: string) => {
  const { decimal } = getSeparators(locale);
  return text.indexOf(decimal);
};

/**
 * Counts digits before caret but limited to the integer part (left of decimal).
 */
export const countIntegerDigitsBefore = (
  text: string,
  caret: number,
  locale: string,
) => {
  const dec = getDecimalIndex(text, locale);
  const end = Math.min(caret, dec === -1 ? text.length : dec);
  let count = 0;

  for (let i = 0; i < end; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') count++;
  }

  return count;
};

/**
 * Given a target integer-digit count, return the caret index that preserves it, staying in the integer region.
 */
export const indexFromIntegerDigitCount = (
  text: string,
  targetDigits: number,
  locale: string,
) => {
  if (targetDigits <= 0) return 0;
  const dec = getDecimalIndex(text, locale);
  const limit = dec === -1 ? text.length : dec; // do not cross into fraction
  let digits = 0;
  for (let i = 0; i < limit; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      digits++;
      if (digits >= targetDigits) return i + 1;
    }
  }
  // fewer integer digits than target; clamp to decimal boundary (or end if no decimal)
  return limit;
};

/**
 * Counts fraction digits (to the right of decimal) before the caret.
 */
export const countFractionDigitsBefore = (
  text: string,
  caret: number,
  locale: string,
) => {
  const dec = getDecimalIndex(text, locale);
  if (dec === -1) return 0;
  const end = Math.min(Math.max(caret, dec + 1), text.length);
  let count = 0;
  for (let i = dec + 1; i < end; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') count++;
  }
  return count;
};

/**
 * Maps a target fraction-digit count back to a caret index in the formatted string.
 */
export const indexFromFractionDigitCount = (
  text: string,
  targetDigits: number,
  locale: string,
) => {
  const dec = getDecimalIndex(text, locale);
  if (dec === -1) return text.length; // no decimal; place at the end
  if (targetDigits <= 0) return dec + 1; // start of the fraction
  let digits = 0;
  for (let i = dec + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      digits++;
      if (digits >= targetDigits) return i + 1;
    }
  }
  // fewer fraction digits; place at the end of string
  return text.length;
};

/**
 * Index of the first numeric digit in the string, or text.length, if none.
 */
export const firstDigitIndex = (text: string) => {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') return i;
  }
  return text.length;
};

/**
 * Clamp a caret position so it never goes before the first numeric digit (currency/prefix safe).
 */
export const clampCaretToNumericStart = (text: string, pos: number) => {
  const first = firstDigitIndex(text);
  return Math.max(first, Math.min(pos, text.length));
};

/**
 * Returns the effective maximum fraction digits given a format and override.
 */
export const getEffectiveMaxFractionDigits = (
  format: 'currency' | 'number' | undefined,
  maximumFractionDigits: number | undefined,
): number => {
  if (typeof maximumFractionDigits === 'number') return maximumFractionDigits;
  return format === 'currency' ? 2 : 0;
};
