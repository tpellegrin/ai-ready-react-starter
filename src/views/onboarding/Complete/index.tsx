// DEMO: Replace or remove this onboarding screen when adopting the boilerplate. See docs/adoption.md.
import { useNavigation } from 'hooks/useNavigation';
import { useAuth } from 'auth/useAuth';
import { RouterType } from 'globals/types';
import { FlowLayout } from 'containers/Layouts/FlowLayout';
import { useFlowNav } from 'hooks/useFlowNav';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';
import { Button } from 'components/Button';
import { Text } from 'components/Text';
import { Flex } from 'components/Flex';
import { LayoutFooter } from 'containers/Layouts/common/LayoutFooter';
import { useI18n } from 'i18n/provider';

export function Complete() {
  const { t } = useI18n();
  const { goBack } = useFlowNav();
  const { percentage } = useFlowProgressFromPaths();
  const { switchRouter } = useNavigation();
  const { completeOnboarding } = useAuth();

  const handleFinish = async () => {
    await completeOnboarding();
    switchRouter(RouterType.user);
  };

  return (
    <FlowLayout
      header={{
        title: t('onboarding.complete.heading'),
        progress: percentage,
        prevButton: { onClick: () => goBack() },
      }}
      footer={
        <LayoutFooter>
          <Button
            label={t('onboarding.complete.cta')}
            onClick={handleFinish}
            aria-label={t('onboarding.complete.cta')}
          />
        </LayoutFooter>
      }
    >
      <Flex direction="column" gap="md">
        <Text as="h1" variant="headingLg">
          {t('onboarding.complete.title')}
        </Text>
        <Text variant="bodyMd">{t('onboarding.complete.body')}</Text>
      </Flex>
    </FlowLayout>
  );
}
