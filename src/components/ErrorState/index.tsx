import { Button } from 'components/Button';
import { InlineAlert } from 'components/InlineAlert';
import { useI18n } from 'i18n/provider';

type Props = {
  title: string;
  /** Localized explanation (e.g. t(getErrorMessageKey(error))). */
  description?: string | undefined;
  /** Retry handler; renders a "Try again" action. */
  onRetry?: (() => void) | undefined;
  /** Disable the retry action while a retry is in flight. */
  isRetrying?: boolean | undefined;
};

/** A failed load that the user can recover from in place. */
export const ErrorState = ({
  title,
  description,
  onRetry,
  isRetrying = false,
}: Props) => {
  const { t } = useI18n();
  return (
    <InlineAlert
      tone="error"
      title={title}
      actions={
        onRetry ? (
          <Button
            isCompact
            size="small"
            variant="secondary"
            label={t('common.actions.tryAgain')}
            isPending={isRetrying}
            onClick={onRetry}
          />
        ) : undefined
      }
    >
      {description}
    </InlineAlert>
  );
};
