import { Select } from 'components/Form/Select';
import type { Locale } from 'i18n';
import { useI18n } from 'i18n/provider';

import { _LanguageSelectorRoot } from './styles';

const LANGUAGES: readonly {
  locale: Locale;
  labelKey:
    | 'flow.common.language.en'
    | 'flow.common.language.pt'
    | 'flow.common.language.es';
}[] = [
  { locale: 'en-US', labelKey: 'flow.common.language.en' },
  { locale: 'pt-BR', labelKey: 'flow.common.language.pt' },
  { locale: 'es-ES', labelKey: 'flow.common.language.es' },
];

const isSupported = (value: string): value is Locale =>
  LANGUAGES.some(({ locale }) => locale === value);

/** Compact, labelled language switcher (native select: keyboard friendly). */
export const LanguageSelector = () => {
  const { lang, setLang, t } = useI18n();
  return (
    <_LanguageSelectorRoot>
      <Select
        controlSize="small"
        aria-label={t('flow.common.language.selectorAria')}
        value={lang}
        onChange={(event) => {
          if (isSupported(event.target.value)) setLang(event.target.value);
        }}
        options={LANGUAGES.map(({ locale, labelKey }) => ({
          value: locale,
          label: t(labelKey),
        }))}
      />
    </_LanguageSelectorRoot>
  );
};
