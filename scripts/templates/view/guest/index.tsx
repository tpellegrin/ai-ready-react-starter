import { Text } from 'components/Text';
import { useI18n } from 'i18n/provider';
__featureImport__
import { ___Name__Root } from './styles';

/**
 * Public page (paths.__key__). Pages own their single `main` landmark and
 * `h1`; data and forms belong in a feature (`pnpm gen feature`).
 */
export function __Name__() {
  const { t } = useI18n();
  return (
    <___Name__Root>
      <Text as="h1" variant="headingLg">
        {t('guest.__key__.title')}
      </Text>
      <Text color="secondary">{t('guest.__key__.intro')}</Text>
      __featureElement__
    </___Name__Root>
  );
}
