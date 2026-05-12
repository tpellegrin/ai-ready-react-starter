// DEMO: This starter overview is safe to remove when adopting the boilerplate. See docs/adoption.md.
import {
  _DemoHubPage,
  _DemoHubBadge,
  _DemoHubEntryList,
  _DemoHubEntryLink,
} from './styles';

import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { CardBase } from 'components/CardBase';
import { LanguageSelector } from 'components/LanguageSelector';
import { paths } from 'globals/paths';
import { I18nKey } from 'i18n';
import { useI18n } from 'i18n/provider';

type DemoEntry = {
  id: string;
  to: string;
  titleKey: I18nKey;
  descriptionKey: I18nKey;
};

const DEMO_ENTRIES: DemoEntry[] = [
  {
    id: 'signIn',
    to: paths.signIn,
    titleKey: 'demoHub.entries.signIn.title',
    descriptionKey: 'demoHub.entries.signIn.description',
  },
  {
    id: 'welcome',
    to: paths.welcome,
    titleKey: 'demoHub.entries.welcome.title',
    descriptionKey: 'demoHub.entries.welcome.description',
  },
  {
    id: 'dashboard',
    to: paths.signIn,
    titleKey: 'demoHub.entries.dashboard.title',
    descriptionKey: 'demoHub.entries.dashboard.description',
  },
  {
    id: 'onboarding',
    to: paths.flow.onboarding.welcome,
    titleKey: 'demoHub.entries.onboarding.title',
    descriptionKey: 'demoHub.entries.onboarding.description',
  },
];

export function DemoHub() {
  const { t } = useI18n();

  return (
    <_DemoHubPage>
      <Flex direction="column" gap="lg">
        <Flex direction="column" gap="sm">
          <_DemoHubBadge data-testid="demo-hub-badge">
            {t('demoHub.badge')}
          </_DemoHubBadge>
          <Text as="h1" variant="headingLg">
            {t('demoHub.title')}
          </Text>
          <Text variant="bodyMd" color="secondary">
            {t('demoHub.intro')}
          </Text>
        </Flex>

        <Flex direction="row" gap="md">
          <LanguageSelector />
        </Flex>

        <_DemoHubEntryList>
          {DEMO_ENTRIES.map((entry) => (
            <li key={entry.id}>
              <_DemoHubEntryLink
                to={entry.to}
                data-testid={`demo-hub-link-${entry.id}`}
              >
                <CardBase>
                  <Flex direction="column" gap="xxs">
                    <Text as="h2" variant="headingSm">
                      {t(entry.titleKey)}
                    </Text>
                    <Text variant="bodyMd" color="secondary">
                      {t(entry.descriptionKey)}
                    </Text>
                  </Flex>
                </CardBase>
              </_DemoHubEntryLink>
            </li>
          ))}
        </_DemoHubEntryList>

        <CardBase>
          <Flex direction="column" gap="xxs">
            <Text as="h3" variant="headingSm">
              {t('demoHub.removal.title')}
            </Text>
            <Text variant="captionMd" color="secondary">
              {t('demoHub.removal.body')}
            </Text>
          </Flex>
        </CardBase>
      </Flex>
    </_DemoHubPage>
  );
}
