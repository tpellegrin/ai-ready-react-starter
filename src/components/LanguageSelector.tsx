import React from 'react';
import { Button } from 'components/Button';
import { Flex } from 'components/Flex';
import { useI18n } from 'i18n/provider';

export const LanguageSelector: React.FC = () => {
  const { lang, setLang, t } = useI18n();

  return (
    <Flex
      direction="column"
      gap="xs"
      alignItems="center"
      aria-label={t('flow.common.language.selectorAria')}
    >
      <Button
        size="small"
        variant={lang === 'en-US' ? 'accent' : 'tertiary'}
        label={t('flow.common.language.en')}
        onClick={() => setLang('en-US')}
      />
      <Button
        size="small"
        variant={lang === 'pt-BR' ? 'accent' : 'tertiary'}
        label={t('flow.common.language.pt')}
        onClick={() => setLang('pt-BR')}
      />
      <Button
        size="small"
        variant={lang === 'es-ES' ? 'accent' : 'tertiary'}
        label={t('flow.common.language.es')}
        onClick={() => setLang('es-ES')}
      />
    </Flex>
  );
};
