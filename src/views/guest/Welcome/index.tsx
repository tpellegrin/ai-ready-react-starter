import { useNavigate } from 'react-router-dom';

import { FromBelowReveal } from 'components/Animations/FromBelowReveal';
import { Button } from 'components/Button';
import { Flex } from 'components/Flex';
import { LanguageSelector } from 'components/LanguageSelector';
import { Text } from 'components/Text';
import { appConfig } from 'config';
import { paths } from 'globals/paths';
import { useI18n } from 'i18n/provider';

import { _WelcomeContent, _WelcomeRoot } from './styles';

export function Welcome() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <_WelcomeRoot>
      <FromBelowReveal delayMs={400}>
        <_WelcomeContent>
          <Text as="h1" variant="headingLg">
            {t('app.welcome.title', { name: appConfig.appName })}
          </Text>
          <Text color="secondary">{t('app.welcome.body')}</Text>
          <Flex gap="md" alignItems="center" direction="row">
            <LanguageSelector />
            <Button
              variant="tertiary"
              size="small"
              label={t('app.welcome.cta')}
              onClick={() => {
                navigate(paths.signIn);
              }}
            />
          </Flex>
        </_WelcomeContent>
      </FromBelowReveal>
    </_WelcomeRoot>
  );
}
