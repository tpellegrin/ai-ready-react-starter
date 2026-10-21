// DEMO: Replace or remove this onboarding screen when adopting the boilerplate. See docs/adoption.md.
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'auth/useAuth';
import { paths } from 'globals/paths';
import { runDetached } from 'utils/async';
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
  const navigate = useNavigate();
  const { completeOnboarding, isAuthenticated } = useAuth();

  // Authenticated users complete onboarding; AppRouter then derives the user
  // router from auth state. A guest viewing the demo preview just returns to
  // the start: the preview never grants access to protected routes.
  const handleFinish = () => {
    if (!isAuthenticated) {
      navigate(paths.index);
      return;
    }
    runDetached(completeOnboarding());
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
