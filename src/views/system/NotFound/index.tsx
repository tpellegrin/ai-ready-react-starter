import { LinkBase } from 'components/LinkBase';
import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';

import { _NotFoundRoot } from './styles';

/** Rendered for paths no route group defines (see containers/routing). */
export const NotFound = () => {
  const { t } = useI18n();
  return (
    <_NotFoundRoot>
      <Text as="h1" variant="headingLg">
        {t('errors.notFound.title')}
      </Text>
      <Text>{t('errors.notFound.description')}</Text>
      <Text>
        <LinkBase to="/">{t('errors.actions.goHome')}</LinkBase>
      </Text>
    </_NotFoundRoot>
  );
};
