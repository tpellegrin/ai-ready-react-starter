// DEMO: Replace this view when adopting the starter. See docs/adoption.md.
import { useAuth } from 'auth/useAuth';
// starter:reference-start
import { CardBase } from 'components/CardBase';
import { LinkBase } from 'components/LinkBase';
import { paths } from 'globals/paths';
// starter:reference-end
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { UserPageLayout } from '../common/UserPageLayout';

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <UserPageLayout title={t('user.dashboard.title')}>
      <Flex direction="column" gap="xs">
        <Text>
          {t('user.dashboard.welcome', {
            name: user?.name ?? user?.email ?? '',
          })}
        </Text>
        <Text color="secondary">{t('user.dashboard.description')}</Text>
      </Flex>
      {/* starter:reference-start */}
      <CardBase>
        <Flex direction="column" gap="xs">
          <Text as="h2" variant="headingSm">
            {t('user.dashboard.resourcesTitle')}
          </Text>
          <Text color="secondary">{t('user.dashboard.resourcesBody')}</Text>
          <Text>
            <LinkBase to={paths.resources}>
              {t('user.dashboard.resourcesLink')}
            </LinkBase>
          </Text>
        </Flex>
      </CardBase>
      {/* starter:reference-end */}
    </UserPageLayout>
  );
}
