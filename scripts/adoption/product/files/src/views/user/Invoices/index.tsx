import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';
import { InvoiceForm, InvoicesPanel } from 'features/invoices';
import { UserPageLayout } from '../common/UserPageLayout';

/**
 * Route-level page (paths.invoices): composes the layout, URL state and
 * features' public components. Data, forms and domain logic belong in a
 * feature (`pnpm gen feature`), not here.
 */
export function Invoices() {
  const { t } = useI18n();
  return (
    <UserPageLayout title={t('user.invoices.title')}>
      <Text color="secondary">{t('user.invoices.intro')}</Text>
      <InvoiceForm />
      <InvoicesPanel />
    </UserPageLayout>
  );
}
