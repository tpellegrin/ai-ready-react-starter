import { Button } from 'components/Button';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { LayoutFooter } from 'containers/Layouts/common/LayoutFooter';
import { FlowLayout } from 'containers/Layouts/FlowLayout';
__extraImports__
import { useFlowNav } from 'hooks/useFlowNav';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';
import { useI18n } from 'i18n/provider';

/**
 * Step __position__ of __total__ of the "__flowId__" flow
 * (paths.flow['__flowId__'].__stepKey__). Order comes from paths.flow;
 * useFlowNav moves between steps (docs/flows.md).
 */
export function __Component__() {
  const { t } = useI18n();
  __navHook__
  const { percentage, position, total } = useFlowProgressFromPaths();

  return (
    <FlowLayout
      header={{
        title: t('flow.common.step', { current: position, total }),
        progress: percentage,
        __prevButton__
      }}
      footer={
        <LayoutFooter>
          <Button label={t('__primaryLabel__')} onClick={__primaryAction__} />
        </LayoutFooter>
      }
    >
      <Flex direction="column" gap="md">
        <Text as="h1" variant="headingLg">
          {t('__copyKey__.title')}
        </Text>
        <Text variant="bodyMd">{t('__copyKey__.body')}</Text>
      </Flex>
    </FlowLayout>
  );
}
