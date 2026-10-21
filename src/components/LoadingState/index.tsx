import { Spinner } from 'components/Spinner';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { _LoadingStateRoot } from './styles';

type Props = {
  /** Visible, announced text. Defaults to the localized "Loading…". */
  label?: string | undefined;
};

/**
 * Loading region: a polite live status so screen readers announce it once.
 * For layout-preserving placeholders, render Skeleton next to it.
 */
export const LoadingState = ({ label }: Props) => {
  const { t } = useI18n();
  return (
    <_LoadingStateRoot role="status" aria-live="polite">
      <Spinner />
      <Text as="span">{label ?? t('common.status.loading')}</Text>
    </_LoadingStateRoot>
  );
};
