import { ErrorState } from 'components/ErrorState';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { _SessionUnavailableContent } from './styles';

type Props = { onRetry: () => void };

/** Session restore failed (network/server). Recoverable: retry re-runs it. */
export const SessionUnavailable = ({ onRetry }: Props) => {
  const { t } = useI18n();
  return (
    <Flex alignItems="center" justifyContent="center" height="100%">
      <_SessionUnavailableContent>
        <Text as="h1" variant="headingMd">
          {t('errors.session.title')}
        </Text>
        <ErrorState
          title={t('errors.session.title')}
          description={t('errors.session.description')}
          onRetry={onRetry}
        />
      </_SessionUnavailableContent>
    </Flex>
  );
};
