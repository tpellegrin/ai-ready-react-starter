import { formatWithIntl } from 'utils/numberFormat';
import { getLocale } from 'i18n';
import type { Props } from './types';

const getEffectiveMaxFractionDigits = (
  format: Props['format'],
  maximumFractionDigits: number | undefined,
): number => {
  if (typeof maximumFractionDigits === 'number') return maximumFractionDigits;
  return format === 'currency' ? 2 : 0;
};

export function formatAnimatedAmount(
  rawValue: number,
  {
    format = 'currency',
    currency,
    maximumFractionDigits,
    useGrouping = true,
    locale: localeProp,
    formatter,
  }: Pick<
    Props,
    | 'format'
    | 'currency'
    | 'maximumFractionDigits'
    | 'useGrouping'
    | 'locale'
    | 'formatter'
  >,
): string {
  const locale = localeProp ?? getLocale();
  const effectiveMaxFrac = getEffectiveMaxFractionDigits(
    format,
    maximumFractionDigits,
  );

  const safeValue = Number.isFinite(rawValue) ? rawValue : 0;

  return (
    formatter?.(safeValue, locale) ??
    formatWithIntl(safeValue, {
      locale,
      format,
      currency,
      maximumFractionDigits: effectiveMaxFrac,
      useGrouping,
    })
  );
}
