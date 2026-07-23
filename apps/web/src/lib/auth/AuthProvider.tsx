import { createContext, useState, useEffect, useRef, type ReactNode } from 'react';
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
}

const initialState: AuthContextValue = {
  status: 'loading',
  session: null,
  user: null,
  error: null,
  isLoading: true,
  isAuthenticated: false,
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(session: Session | null): AuthContextValue {
  return {
    status: session ? 'authenticated' : 'unauthenticated',
    session,
    user: session?.user ?? null,
    error: null,
    isLoading: false,
    isAuthenticated: !!session,
  };
}

function errorState(error: string): AuthContextValue {
  return {
    status: 'error',
    session: null,
    user: null,
    error,
    isLoading: false,
    isAuthenticated: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>(initialState);
  const eventCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let client: ReturnType<typeof getSupabaseClient>;

    try {
      client = getSupabaseClient();
    } catch {
      if (!cancelled) {
        setState(errorState('Não foi possível verificar sua sessão. Tente novamente.'));
      }
      return;
    }

    const getSessionEvent = eventCount.current;
    client.auth.getSession().then(
      ({ data: { session } }) => {
        if (cancelled) return;
        if (eventCount.current !== getSessionEvent) return;
        setState(applySession(session));
      },
      () => {
        if (cancelled) return;
        if (eventCount.current !== getSessionEvent) return;
        setState(errorState('Não foi possível verificar sua sessão. Tente novamente.'));
      },
    );

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      eventCount.current += 1;

      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          setState(applySession(session));
          break;
        case 'SIGNED_OUT':
          setState(applySession(null));
          break;
        default:
          if (session) {
            setState(applySession(session));
          }
          break;
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      eventCount.current = 0;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
