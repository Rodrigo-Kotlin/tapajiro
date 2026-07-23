import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import type { AuthState } from './AuthProvider';

export function useSession(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useSession must be used within an AuthProvider');
  }
  return ctx;
}
