// DEMO: Replace or remove this onboarding screen when adopting the boilerplate. See docs/adoption.md.
import { FlowLayout } from 'containers/Layouts/FlowLayout';
import { useFlowNav } from 'hooks/useFlowNav';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';
import { Button } from 'components/Button';
import { InlineAlert } from 'components/InlineAlert';
import { Text } from 'components/Text';
import { Flex } from 'components/Flex';
import { LayoutFooter } from 'containers/Layouts/common/LayoutFooter';
import { useI18n } from 'i18n/provider';

import { useCompleteOnboarding } from './logic';

export function Complete() {
  const { t } = useI18n();
  const { goBack } = useFlowNav();
  const { percentage } = useFlowProgressFromPaths();
  const { finish, isFinishing, errorKey } = useCompleteOnboarding();

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
            isPending={isFinishing}
            pendingLabel={t('onboarding.complete.pending')}
            onClick={finish}
          />
        </LayoutFooter>
      }
    >
      <Flex direction="column" gap="md">
        <Text as="h1" variant="headingLg">
          {t('onboarding.complete.title')}
        </Text>
        <Text variant="bodyMd">{t('onboarding.complete.body')}</Text>
        {errorKey ? (
          <InlineAlert tone="error">{t(errorKey)}</InlineAlert>
        ) : null}
      </Flex>
    </FlowLayout>
  );
}
