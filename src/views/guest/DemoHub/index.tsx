// DEMO: This starter overview is safe to remove when adopting the boilerplate. See docs/adoption.md.
import { Link } from 'react-router-dom';
import styled from 'styled-components';

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

const Page = styled.div`
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacers.lg} ${({ theme }) => theme.spacers.md};
  box-sizing: border-box;
`;

const Badge = styled.span`
  align-self: flex-start;
  padding: ${({ theme }) => theme.spacers.xxs}
    ${({ theme }) => theme.spacers.sm};
  border-radius: ${({ theme }) => theme.borderRadii.sm};
  background: ${({ theme }) => theme.colors.surface.muted};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: ${({ theme }) => theme.fontFamilies.primary};
  font-size: ${({ theme }) => theme.fontSizes.caption};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const EntryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacers.md};
  width: 100%;
`;

const EntryLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: ${({ theme }) => theme.borderRadii.md};

  &:focus-visible {
    outline: 0.125rem solid ${({ theme }) => theme.colors.border.focus};
    outline-offset: 0.125rem;
  }
`;

export function DemoHub() {
  const { t } = useI18n();

  return (
    <Page>
      <Flex direction="column" gap="lg">
        <Flex direction="column" gap="sm">
          <Badge data-testid="demo-hub-badge">{t('demoHub.badge')}</Badge>
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

        <EntryList>
          {DEMO_ENTRIES.map((entry) => (
            <li key={entry.id}>
              <EntryLink
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
              </EntryLink>
            </li>
          ))}
        </EntryList>

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
    </Page>
  );
}
