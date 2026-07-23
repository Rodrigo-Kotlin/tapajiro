import { render, screen, waitFor } from '@testing-library/react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useSession } from './useSession';

function TestConsumer() {
  const s = useSession();
  return (
    <div>
      <span data-testid="loading">{String(s.isLoading)}</span>
      <span data-testid="auth">{String(s.isAuthenticated)}</span>
      <span data-testid="error">{s.error?.message ?? 'none'}</span>
    </div>
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('handles missing env vars gracefully', async () => {
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
  expect(screen.getByTestId('error')).toHaveTextContent('none');
});
