import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getAuthErrorMessageKey } from 'auth/messages';
import { useAuth } from 'auth/useAuth';
import { paths } from 'globals/paths';
import type { I18nKey } from 'i18n';
import { runDetached } from 'utils/async';

/**
 * Finishing the flow. Authenticated users complete onboarding: AppRouter
 * then mounts the user routes (at the destination kept since sign-in, if
 * any). A failure keeps the user on this step with the reason and lets them
 * try again. A guest viewing the demo preview just returns to the start: the
 * preview never grants access to protected routes.
 */
export const useCompleteOnboarding = () => {
  const { completeOnboarding, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorKey, setErrorKey] = useState<I18nKey | null>(null);

  const finish = () => {
    if (!isAuthenticated) {
      navigate(paths.index);
      return;
    }
    if (isFinishing) return;
    setIsFinishing(true);
    setErrorKey(null);
    runDetached(
      completeOnboarding().then(
        () => setIsFinishing(false),
        (error: unknown) => {
          setIsFinishing(false);
          setErrorKey(getAuthErrorMessageKey(error));
        },
      ),
    );
  };

  return { finish, isFinishing, errorKey };
};
