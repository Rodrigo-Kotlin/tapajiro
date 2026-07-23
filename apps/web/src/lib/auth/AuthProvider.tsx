import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

const initialState: AuthState = {
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  useEffect(() => {
    let cancelled = false;
    let client: ReturnType<typeof getSupabaseClient> | null = null;

    try {
      client = getSupabaseClient();
    } catch {
      if (!cancelled) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      return;
    }

    client.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setState({
          session,
          user: session?.user ?? null,
          isLoading: false,
          isAuthenticated: !!session,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const err = error instanceof Error ? error : new Error(String(error));
        setState({
          session: null,
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: err,
        });
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isAuthenticated: !!session,
        error: null,
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
