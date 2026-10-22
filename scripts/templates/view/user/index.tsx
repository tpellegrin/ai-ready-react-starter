import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';
__featureImport__
import { UserPageLayout } from '../common/UserPageLayout';

/**
 * Route-level page (paths.__key__): composes the layout, URL state and
 * features' public components. Data, forms and domain logic belong in a
 * feature (`pnpm gen feature`), not here.
 */
export function __Name__() {
  const { t } = useI18n();
  return (
    <UserPageLayout title={t('user.__key__.title')}>
      <Text color="secondary">{t('user.__key__.intro')}</Text>
      __featureElement__
    </UserPageLayout>
  );
}
