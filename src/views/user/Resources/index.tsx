// REFERENCE: route composition for the Resource feature (removed on adoption).
import { Text } from 'components/Text';
import { ResourceCatalog } from 'features/resources';
import { useI18n } from 'i18n/provider';

import { UserPageLayout } from '../common/UserPageLayout';

import { useResourceFilterParam } from './logic';

/** Route level: layout + URL state + the feature's public component. */
export function Resources() {
  const { t } = useI18n();
  const { filter, setFilter } = useResourceFilterParam();

  return (
    <UserPageLayout title={t('resources.title')}>
      <Text color="secondary">{t('resources.intro')}</Text>
      <ResourceCatalog filter={filter} onFilterChange={setFilter} />
    </UserPageLayout>
  );
}
