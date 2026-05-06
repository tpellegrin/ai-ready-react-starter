// DEMO: Replace or remove this onboarding screen when adopting the boilerplate. See docs/adoption.md.
import { FlowLayout } from 'containers/Layouts/FlowLayout';
import { useFlowNav } from 'hooks/useFlowNav';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';
import { Button } from 'components/Button';
import { Text } from 'components/Text';
import { Flex } from 'components/Flex';
import { LayoutFooter } from 'containers/Layouts/common/LayoutFooter';
import { useI18n } from 'i18n/provider';

export function Welcome() {
  const { t } = useI18n();
  const { goNext } = useFlowNav();
  const { percentage } = useFlowProgressFromPaths();

  return (
    <FlowLayout
      header={{
        title: t('onboarding.welcome.heading'),
        progress: percentage,
      }}
      footer={
        <LayoutFooter>
          <Button
            label={t('common.actions.continue')}
            onClick={() => goNext()}
            aria-label={t('common.actions.continue')}
          />
        </LayoutFooter>
      }
    >
      <Flex direction="column" gap="md">
        <Text as="h1" variant="headingLg">
          {t('onboarding.welcome.title')}
        </Text>
        <Text variant="bodyMd">{t('onboarding.welcome.body')}</Text>
      </Flex>
    </FlowLayout>
  );
}
