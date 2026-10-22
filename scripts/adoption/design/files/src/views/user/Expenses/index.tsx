import { Button } from 'components/Button';
import { Text } from 'components/Text';
import {
  AddExpenseDialog,
  ExpenseSummary,
  ExpensesPanel,
} from 'features/expenses';
import { useI18n } from 'i18n/provider';

import { UserPageLayout } from '../common/UserPageLayout';

import { useExpensesPage } from './logic';
import { _ExpensesIntro } from './styles';

/**
 * Route-level page (paths.expenses): the intro with the add action, the
 * totals and the filtered list. The status filter lives in the URL; data,
 * forms and domain logic are the expenses feature's.
 */
export function Expenses() {
  const { t } = useI18n();
  const page = useExpensesPage();
  return (
    <UserPageLayout title={t('user.expenses.title')}>
      <_ExpensesIntro>
        <Text color="secondary">{t('user.expenses.intro')}</Text>
        <Button
          isCompact
          label={t('expenses.actions.add')}
          onClick={page.openAdd}
        />
      </_ExpensesIntro>
      <ExpenseSummary />
      <ExpensesPanel
        filter={page.filter}
        onFilterChange={page.setFilter}
        onAdd={page.openAdd}
      />
      <AddExpenseDialog open={page.isAdding} onOpenChange={page.setAdding} />
    </UserPageLayout>
  );
}
