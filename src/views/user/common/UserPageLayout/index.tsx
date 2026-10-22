import type { ReactNode } from 'react';

import { Button } from 'components/Button';
import { InlineAlert } from 'components/InlineAlert';
import { LanguageSelector } from 'components/LanguageSelector';
import { Text } from 'components/Text';
import { appConfig } from 'config';
import { LayoutHeader } from 'containers/Layouts/common/LayoutHeader';
import { MainLayout } from 'containers/Layouts/MainLayout';
import { paths } from 'globals/paths';
import { useI18n } from 'i18n/provider';

import { useSignOut } from './logic';
import {
  _UserPageLayoutActions,
  _UserPageLayoutContent,
  _UserPageLayoutNavLink,
  _UserPageLayoutNavList,
} from './styles';

type Props = {
  /** Page heading (the page's h1). */
  title: string;
  children: ReactNode;
};

/**
 * Shell for signed-in pages: header with primary navigation, language and
 * sign-out, and a scrollable content column (MainLayout owns scrolling).
 */
export const UserPageLayout = ({ title, children }: Props) => {
  const { t } = useI18n();
  const { isSigningOut, signOutErrorKey, handleSignOut } = useSignOut();

  return (
    <MainLayout
      showFooter={false}
      header={
        <LayoutHeader
          Left={<Text variant="bodyMdBold">{appConfig.appName}</Text>}
          Center={
            <nav aria-label={t('user.nav.label')}>
              <_UserPageLayoutNavList>
                <li>
                  <_UserPageLayoutNavLink to={paths.dashboard} end>
                    {t('user.nav.dashboard')}
                  </_UserPageLayoutNavLink>
                </li>
                {/* starter:reference-start */}
                <li>
                  <_UserPageLayoutNavLink to={paths.resources}>
                    {t('user.nav.resources')}
                  </_UserPageLayoutNavLink>
                </li>
                {/* starter:reference-end */}
              </_UserPageLayoutNavList>
            </nav>
          }
          Right={
            <_UserPageLayoutActions>
              <LanguageSelector />
              <Button
                isCompact
                size="small"
                variant="tertiary"
                label={t('user.nav.signOut')}
                isPending={isSigningOut}
                pendingLabel={t('auth.signOut.pending')}
                onClick={handleSignOut}
              />
            </_UserPageLayoutActions>
          }
        />
      }
    >
      <_UserPageLayoutContent>
        {signOutErrorKey ? (
          <InlineAlert tone="error">{t(signOutErrorKey)}</InlineAlert>
        ) : null}
        <Text as="h1" variant="headingLg">
          {title}
        </Text>
        {children}
      </_UserPageLayoutContent>
    </MainLayout>
  );
};
