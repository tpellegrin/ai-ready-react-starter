import { Button } from 'components/Button';
import { CardBase } from 'components/CardBase';
import { EmptyState } from 'components/EmptyState';
import { ErrorState } from 'components/ErrorState';
import { Field } from 'components/Form/Field';
import { Select } from 'components/Form/Select';
import { LoadingState } from 'components/LoadingState';
import { Skeleton } from 'components/Skeleton';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import {
  EXPENSE_FILTERS,
  parseExpenseFilter,
  type ExpenseFilter,
} from '../../model';

import { useExpensesPanel } from './logic';
import {
  _ExpensesPanelAmount,
  _ExpensesPanelDetails,
  _ExpensesPanelFilter,
  _ExpensesPanelList,
  _ExpensesPanelPlaceholder,
  _ExpensesPanelRoot,
  _ExpensesPanelRow,
  _ExpensesPanelStatus,
} from './styles';

type Props = {
  /** Current status filter (owned by the route: a URL parameter). */
  filter: ExpenseFilter;
  onFilterChange: (filter: ExpenseFilter) => void;
  /** Opens the add-expense dialog (offered when there are none yet). */
  onAdd: () => void;
};

/**
 * The team's expenses: status filter, then loading, error (retry), empty
 * (add the first one), filtered-empty or the rows.
 */
export const ExpensesPanel = ({ filter, onFilterChange, onAdd }: Props) => {
  const { t } = useI18n();
  const panel = useExpensesPanel(filter);

  return (
    <_ExpensesPanelRoot aria-label={t('expenses.title')}>
      {panel.view === 'success' || panel.view === 'filtered' ? (
        <_ExpensesPanelFilter>
          <Field label={t('expenses.filter.label')}>
            {(control) => (
              <Select
                {...control}
                value={filter}
                onChange={(event) =>
                  onFilterChange(parseExpenseFilter(event.target.value))
                }
                options={EXPENSE_FILTERS.map((value) => ({
                  value,
                  label: t(`expenses.filter.${value}`),
                }))}
              />
            )}
          </Field>
        </_ExpensesPanelFilter>
      ) : null}

      {panel.view === 'pending' ? (
        <_ExpensesPanelPlaceholder>
          <LoadingState label={t('expenses.list.loading')} />
          <Skeleton height="xxl" />
          <Skeleton height="xxl" />
        </_ExpensesPanelPlaceholder>
      ) : null}

      {panel.view === 'error' && panel.errorKey ? (
        <ErrorState
          title={t('expenses.list.errorTitle')}
          description={t(panel.errorKey)}
          onRetry={panel.retry}
          isRetrying={panel.isRetrying}
        />
      ) : null}

      {panel.view === 'empty' ? (
        <EmptyState
          title={t('expenses.list.emptyTitle')}
          description={t('expenses.list.emptyDescription')}
          action={
            <Button
              isCompact
              label={t('expenses.actions.add')}
              onClick={onAdd}
            />
          }
        />
      ) : null}

      {panel.view === 'filtered' ? (
        <EmptyState
          title={t('expenses.list.filteredTitle')}
          description={t('expenses.list.filteredDescription')}
        />
      ) : null}

      {panel.view === 'success' ? (
        <_ExpensesPanelList aria-label={t('expenses.list.label')}>
          {panel.rows.map((row) => (
            <li key={row.id}>
              <CardBase>
                <_ExpensesPanelRow>
                  <_ExpensesPanelDetails>
                    <Text as="h2" variant="headingXsBold">
                      {row.description}
                    </Text>
                    <Text as="p" variant="captionMd" color="secondary">
                      {t('expenses.item.meta', {
                        category: t(`expenses.category.${row.category}`),
                        date: row.dateText,
                      })}
                    </Text>
                  </_ExpensesPanelDetails>
                  <_ExpensesPanelAmount>
                    <Text as="p" variant="headingXsBold" numeric="tabular">
                      {row.amountText}
                    </Text>
                    <_ExpensesPanelStatus
                      as="p"
                      variant="captionMd"
                      $status={row.status}
                    >
                      {t(`expenses.status.${row.status}`)}
                    </_ExpensesPanelStatus>
                  </_ExpensesPanelAmount>
                </_ExpensesPanelRow>
              </CardBase>
            </li>
          ))}
        </_ExpensesPanelList>
      ) : null}
    </_ExpensesPanelRoot>
  );
};
