import { useNavigate } from 'react-router-dom';
import { _WelcomeContent } from './styles';

import { Flex } from 'components/Flex';
import { FromBelowReveal } from 'components/Animations/FromBelowReveal';
import { Button } from 'components/Button';
import { LanguageSelector } from 'components/LanguageSelector';
import { paths } from 'globals/paths';
import { useI18n } from 'i18n/provider';

export function Welcome() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <Flex
      direction="column"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      width="100%"
    >
      <FromBelowReveal delayMs={400}>
        <_WelcomeContent>
          <Flex gap="md" alignItems="center" direction="row">
            <LanguageSelector />
            <Button
              variant="tertiary"
              size="small"
              label={t('app.welcome.cta')}
              onClick={() => navigate(paths.signIn)}
            />
          </Flex>
        </_WelcomeContent>
      </FromBelowReveal>
    </Flex>
  );
}
