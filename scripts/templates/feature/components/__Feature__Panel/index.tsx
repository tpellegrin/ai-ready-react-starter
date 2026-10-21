import { CardBase } from 'components/CardBase';
import { EmptyState } from 'components/EmptyState';
import { ErrorState } from 'components/ErrorState';
import { LoadingState } from 'components/LoadingState';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { use__Feature__Panel } from './logic';
import { ___Feature__PanelList, ___Feature__PanelRoot } from './styles';

/** __Feature__ list with loading, error (retry), empty and success states. */
export const __Feature__Panel = () => {
  const { t } = useI18n();
  const panel = use__Feature__Panel();

  return (
    <___Feature__PanelRoot aria-label={t('__feature__.title')}>
      {panel.view === 'pending' ? (
        <LoadingState label={t('__feature__.list.loading')} />
      ) : null}

      {panel.view === 'error' && panel.errorKey ? (
        <ErrorState
          title={t('__feature__.list.errorTitle')}
          description={t(panel.errorKey)}
          onRetry={panel.retry}
          isRetrying={panel.isRetrying}
        />
      ) : null}

      {panel.view === 'empty' ? (
        <EmptyState
          title={t('__feature__.list.emptyTitle')}
          description={t('__feature__.list.emptyDescription')}
        />
      ) : null}

      {panel.view === 'success' ? (
        <___Feature__PanelList aria-label={t('__feature__.list.label')}>
          {panel.items.map((item) => (
            <li key={item.id}>
              <CardBase>
                <Text as="h2" variant="headingSm">
                  {item.name}
                </Text>
              </CardBase>
            </li>
          ))}
        </___Feature__PanelList>
      ) : null}
    </___Feature__PanelRoot>
  );
};
