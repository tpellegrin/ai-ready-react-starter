/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';

import { createFakeAuthAdapter, testUser } from 'test/auth';
import { renderWithProviders } from 'test/utils';

import { RequireAuth } from './RequireAuth';

const SignInPage = () => {
  const { search } = useLocation();
  return <p>Sign In Page {search}</p>;
};

const routes = (
  <Routes>
    <Route
      path="/protected"
      element={
        <RequireAuth>
          <p>Protected Content</p>
        </RequireAuth>
      }
    />
    <Route path="/sign-in" element={<SignInPage />} />
  </Routes>
);

describe('RequireAuth', () => {
  it('redirects guests to sign-in, keeping the destination', async () => {
    renderWithProviders(routes, {
      route: '/protected',
      authAdapter: createFakeAuthAdapter(),
    });

    expect(
      await screen.findByText('Sign In Page ?returnTo=%2Fprotected'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children for an authenticated user', async () => {
    renderWithProviders(routes, {
      route: '/protected',
      authAdapter: createFakeAuthAdapter({ user: testUser }),
    });

    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });
});
