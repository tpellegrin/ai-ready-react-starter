// DEMO: Replace or remove this view when adopting the boilerplate. See docs/adoption.md.
import { useQuery } from '@tanstack/react-query';
import { fetchAppStatus } from 'api/demoApi';
import { queryKeys } from 'api/queryKeys';
import { useAuth } from 'auth/useAuth';
import { Button } from 'components/Button';
import { Box } from 'components/Box';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.appStatus,
    queryFn: fetchAppStatus,
  });
  const { user, signOut } = useAuth();
  const { t } = useI18n();

  return (
    <Box px="xxl" py="xxl" borderColor="transparent">
      <Flex direction="column" alignItems="flex-start" gap="lg" width="100%">
        <Flex direction="column" alignItems="flex-start" gap="xs">
          <Text as="h1" variant="headingLg">
            {t('user.dashboard.title')}
          </Text>
          <Text variant="bodyMd">
            {t('user.dashboard.welcome', {
              name: user?.name || user?.email || 'User',
            })}
          </Text>
          <Text variant="bodyMd">{t('user.dashboard.description')}</Text>
        </Flex>

        <Button label={t('user.dashboard.signOut')} onClick={() => signOut()} />

        <Box
          px="md"
          py="md"
          borderColor="default"
          borderRadius="sm"
          backgroundColor="raised"
          style={{ width: '100%' }}
        >
          <Flex direction="column" alignItems="flex-start" gap="md">
            <Text as="h2" variant="headingMd">
              {t('user.dashboard.appStatus.title')}
            </Text>
            {isLoading && (
              <Text variant="bodyMd">
                {t('user.dashboard.appStatus.loading')}
              </Text>
            )}
            {!!error && (
              <Text variant="bodyMd">
                {t('user.dashboard.appStatus.error')}
              </Text>
            )}
            {data && (
              <Box
                backgroundColor="muted"
                borderRadius="xs"
                style={{ width: '100%' }}
                px="sm"
                py="sm"
              >
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(data, null, 2)}
                </pre>
              </Box>
            )}
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
