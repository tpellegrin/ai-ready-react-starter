import 'modern-normalize/modern-normalize.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createQueryClient } from 'api/queryClient';
import { appConfig } from 'config';
import { App } from 'containers/App';
import { createAuthAdapter } from 'containers/composition/createAuthAdapter';
import { startMocking } from 'containers/composition/startMocking';
import { t } from 'i18n';

/**
 * Bootstrap: start optional mocks, build the dependencies (auth adapter,
 * query client) and render. Configuration errors fail here with a message
 * instead of a blank page.
 */
const bootstrap = async (root: HTMLElement) => {
  await startMocking();
  const authAdapter = await createAuthAdapter(appConfig);
  createRoot(root).render(
    <StrictMode>
      <App authAdapter={authAdapter} queryClient={createQueryClient()} />
    </StrictMode>,
  );
};

const renderStartupError = (root: HTMLElement, error: unknown) => {
  console.error(error);
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = t('errors.startup');
  root.replaceChildren(message);
};

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');
bootstrap(root).catch((error: unknown) => renderStartupError(root, error));
