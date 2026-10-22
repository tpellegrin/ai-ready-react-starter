import { CardBase } from 'components/CardBase';
import { Skeleton } from 'components/Skeleton';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { useExpenseSummary } from './logic';
import { _ExpenseSummaryList, _ExpenseSummaryRoot } from './styles';

/**
 * Total amount and how many expenses are pending or approved: one tile
 * each, side by side where they fit and stacked on narrow screens.
 */
export const ExpenseSummary = () => {
  const { t } = useI18n();
  const summary = useExpenseSummary();
  if (summary.view === 'hidden') return null;

  return (
    <_ExpenseSummaryRoot aria-label={t('expenses.summary.label')}>
      <_ExpenseSummaryList>
        {summary.view === 'pending'
          ? ['total', 'pending', 'approved'].map((id) => (
              <li key={id}>
                <Skeleton height="xxl" />
              </li>
            ))
          : summary.tiles.map((tile) => (
              <li key={tile.id}>
                <CardBase>
                  <Text as="p" variant="captionMd" color="secondary">
                    {t(`expenses.summary.${tile.id}`)}
                  </Text>
                  <Text as="p" variant="headingMd" numeric="tabular">
                    {tile.value}
                  </Text>
                </CardBase>
              </li>
            ))}
      </_ExpenseSummaryList>
    </_ExpenseSummaryRoot>
  );
};
