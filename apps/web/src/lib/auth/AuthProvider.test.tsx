import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, waitFor } from '@testing-library/react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthProvider } from './AuthProvider';
import { useSession } from './useSession';

const mockGetClient = vi.mocked(getSupabaseClient);

function mkSub() {
  return { id: '1', callback: vi.fn(), unsubscribe: vi.fn() };
}

const mockAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: mkSub() },
  })),
};

function TestConsumer() {
  const s = useSession();
  return (
    <div>
      <span data-testid="loading">{String(s.isLoading)}</span>
      <span data-testid="auth">{String(s.isAuthenticated)}</span>
      <span data-testid="user">{s.user?.email ?? 'none'}</span>
      <span data-testid="error">{s.error?.message ?? 'none'}</span>
      <span data-testid="session">{s.session ? 'yes' : 'no'}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  mockAuth.getSession.mockReset();
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReset();
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: mkSub() },
  });
  mockGetClient.mockReturnValue({ auth: mockAuth } as unknown as SupabaseClient);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('starts in loading state', () => {
  renderWithProvider();
  expect(screen.getByTestId('loading')).toHaveTextContent('true');
});

it('sets authenticated when session is found', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1', email: 'user@test.com' } }, error: null },
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
  expect(screen.getByTestId('auth')).toHaveTextContent('true');
  expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
  expect(screen.getByTestId('session')).toHaveTextContent('yes');
});

it('sets unauthenticated when no session', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
  expect(screen.getByTestId('session')).toHaveTextContent('no');
});

it('handles errors gracefully', async () => {
  mockAuth.getSession.mockRejectedValue(new Error('session error'));

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  });
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
});

it('unsubscribes on unmount', async () => {
  const sub = mkSub();
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: sub },
  });

  const { unmount } = renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  unmount();
  expect(sub.unsubscribe).toHaveBeenCalledOnce();
});
