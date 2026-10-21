import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { Button } from 'components/Button';
import { LinkBase } from 'components/LinkBase';
import { Text } from 'components/Text';
import { IS_DEV } from 'config';
import { useI18n } from 'i18n/provider';

import { isChunkLoadError } from './logic';
import { _ErrorPageDetails, _ErrorPageRoot } from './styles';

/**
 * Route error boundary. Users see localized copy only; error details are
 * rendered in development builds to speed up debugging.
 */
export const ErrorPage = () => {
  const error = useRouteError();
  const { t } = useI18n();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const isOutdated = isChunkLoadError(error);
  const copy = isNotFound ? 'notFound' : isOutdated ? 'outdated' : 'generic';

  return (
    <_ErrorPageRoot role="alert">
      <Text as="h1" variant="headingLg">
        {t(`errors.${copy}.title`)}
      </Text>
      <Text>{t(`errors.${copy}.description`)}</Text>
      {isOutdated ? (
        <Button
          isCompact
          label={t('errors.actions.reload')}
          onClick={() => window.location.reload()}
        />
      ) : null}
      <Text>
        <LinkBase to="/">{t('errors.actions.goHome')}</LinkBase>
      </Text>
      {IS_DEV && error instanceof Error ? (
        <_ErrorPageDetails>{error.stack ?? error.message}</_ErrorPageDetails>
      ) : null}
    </_ErrorPageRoot>
  );
};
