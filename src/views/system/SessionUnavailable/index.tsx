import { getAuthErrorMessageKey } from 'auth/messages';
import { ErrorState } from 'components/ErrorState';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { _SessionUnavailableContent } from './styles';

type Props = {
  /** Why the restore failed (useAuth().error): network, server, timeout. */
  error: unknown;
  onRetry: () => void;
};

/**
 * Session restore failed (network/server/timeout). Recoverable: retry
 * re-runs it. The app cannot tell whether the user is signed in, so it
 * routes nowhere until the check succeeds.
 */
export const SessionUnavailable = ({ error, onRetry }: Props) => {
  const { t } = useI18n();
  return (
    <Flex alignItems="center" justifyContent="center" height="100%">
      <_SessionUnavailableContent>
        <Text as="h1" variant="headingMd">
          {t('errors.session.title')}
        </Text>
        <ErrorState
          title={t(getAuthErrorMessageKey(error))}
          description={t('errors.session.description')}
          onRetry={onRetry}
        />
      </_SessionUnavailableContent>
    </Flex>
  );
};
