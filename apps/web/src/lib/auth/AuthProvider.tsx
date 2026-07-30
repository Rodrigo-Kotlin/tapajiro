import { createContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  error: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<boolean>;
  isSigningOut: boolean;
  signOutError: string | null;
  clearSignOutError: () => void;
}

const initialState: AuthContextValue = {
  status: 'loading',
  session: null,
  user: null,
  error: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => false,
  isSigningOut: false,
  signOutError: null,
  clearSignOutError: () => {},
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthContextBase = Omit<
  AuthContextValue,
  'signOut' | 'isSigningOut' | 'signOutError' | 'clearSignOutError'
>;

function applySession(session: Session | null): AuthContextBase {
  return {
    status: session ? 'authenticated' : 'unauthenticated',
    session,
    user: session?.user ?? null,
    error: null,
    isLoading: false,
    isAuthenticated: !!session,
  };
}

function errorState(error: string): AuthContextBase {
  return {
    status: 'error',
    session: null,
    user: null,
    error,
    isLoading: false,
    isAuthenticated: false,
  };
}

const SIGNOUT_ERROR_MESSAGE = 'Não foi possível sair. Tente novamente.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>(initialState);
  const eventCount = useRef(0);
  const cancelledRef = useRef(false);
  const signOutInProgress = useRef(false);

  const clearSignOutError = useCallback(() => {
    setState((prev) => (prev.signOutError ? { ...prev, signOutError: null } : prev));
  }, []);

  const signOut = useCallback(async (): Promise<boolean> => {
    if (signOutInProgress.current) return false;
    signOutInProgress.current = true;

    setState((prev) => ({
      ...prev,
      isSigningOut: true,
      signOutError: null,
    }));

    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signOut({ scope: 'local' });

      if (cancelledRef.current) return false;

      if (error) {
        setState((prev) => ({
          ...prev,
          isSigningOut: false,
          signOutError: SIGNOUT_ERROR_MESSAGE,
        }));
        return false;
      }

      setState((prevAuthState) => {
        const base = applySession(null);
        return {
          ...base,
          signOut: prevAuthState.signOut,
          isSigningOut: false,
          signOutError: null,
          clearSignOutError: prevAuthState.clearSignOutError,
        };
      });
      return true;
    } catch {
      if (cancelledRef.current) return false;

      setState((prev) => ({
        ...prev,
        isSigningOut: false,
        signOutError: SIGNOUT_ERROR_MESSAGE,
      }));
      return false;
    } finally {
      signOutInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    cancelledRef.current = false;
    let client: ReturnType<typeof getSupabaseClient>;

    try {
      client = getSupabaseClient();
    } catch {
      if (!cancelled) {
        setState((prev) => ({
          ...errorState('Não foi possível verificar sua sessão. Tente novamente.'),
          signOut: prev.signOut,
          isSigningOut: false,
          signOutError: null,
          clearSignOutError: prev.clearSignOutError,
        }));
      }
      return;
    }

    const getSessionEvent = eventCount.current;
    client.auth.getSession().then(
      ({ data: { session } }) => {
        if (cancelled) return;
        if (eventCount.current !== getSessionEvent) return;
        setState((prev) => ({
          ...applySession(session),
          signOut: prev.signOut,
          isSigningOut: false,
          signOutError: null,
          clearSignOutError: prev.clearSignOutError,
        }));
      },
      () => {
        if (cancelled) return;
        if (eventCount.current !== getSessionEvent) return;
        setState((prev) => ({
          ...errorState('Não foi possível verificar sua sessão. Tente novamente.'),
          signOut: prev.signOut,
          isSigningOut: false,
          signOutError: null,
          clearSignOutError: prev.clearSignOutError,
        }));
      },
    );

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      eventCount.current += 1;

      setState((prev) => {
        const base = (() => {
          switch (event) {
            case 'INITIAL_SESSION':
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              return applySession(session);
            case 'SIGNED_OUT':
              return applySession(null);
            default:
              return session ? applySession(session) : prev;
          }
        })();
        return {
          ...base,
          signOut: prev.signOut,
          isSigningOut: prev.isSigningOut,
          signOutError: prev.signOutError,
          clearSignOutError: prev.clearSignOutError,
        };
      });
    });

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      subscription.unsubscribe();
      eventCount.current = 0;
    };
  }, []);

  const value: AuthContextValue = {
    ...state,
    signOut,
    clearSignOutError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
