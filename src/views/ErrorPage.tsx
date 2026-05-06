import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useI18n } from 'i18n/provider';

export const ErrorPage = () => {
  const error = useRouteError();
  const { t } = useI18n();

  let title = t('errors.generic.title');
  let description = t('errors.generic.description');
  let status: number | null = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = t('errors.notFound.title');
      description = t('errors.notFound.description');
    } else {
      title = `${error.status} ${error.statusText}`;
      let message = description;
      if (
        typeof error.data === 'object' &&
        error.data !== null &&
        'message' in error.data
      ) {
        message = (error.data as { message?: string }).message ?? description;
      }
      description = message;
    }
  } else if (error instanceof Error) {
    description = error.message || description;
  }

  return (
    <div role="alert" style={{ padding: 24 }}>
      <h1>{title}</h1>
      <p>{description}</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/">{t('errors.actions.goHome')}</Link>
      </div>
      {process.env.NODE_ENV !== 'production' && error instanceof Error && (
        <pre
          style={{ marginTop: 16, color: '#b00020', whiteSpace: 'pre-wrap' }}
        >
          {error.stack}
        </pre>
      )}
    </div>
  );
};
