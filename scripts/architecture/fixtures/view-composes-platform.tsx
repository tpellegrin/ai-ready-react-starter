// @fixture-path src/views/__arch__/ComposedPage.tsx
// @expect none
// Route composition may use layouts (shell), shared UI, auth and i18n.
import { useAuth } from 'auth/useAuth';
import { Button } from 'components/Button';
import { MainLayout } from 'containers/Layouts/MainLayout';
import { useI18n } from 'i18n/provider';

export const ComposedPage = () => {
  const { signOut } = useAuth();
  const { t } = useI18n();
  return (
    <MainLayout>
      <Button
        label={t('user.dashboard.signOut')}
        onClick={() => {
          signOut().catch(() => undefined);
        }}
      />
    </MainLayout>
  );
};
