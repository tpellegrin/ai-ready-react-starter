import { useContext } from 'react';

import { AuthContext } from './AuthProvider';
import type { AuthContextValue } from './types';

/** The only way UI code reads or changes the session. */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
