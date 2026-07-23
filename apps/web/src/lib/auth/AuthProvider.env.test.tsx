import { render, screen, waitFor } from '@testing-library/react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

function TestConsumer() {
  const s = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(s.isLoading)}</span>
      <span data-testid="auth">{String(s.isAuthenticated)}</span>
      <span data-testid="error">{s.error ?? 'none'}</span>
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
  expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  const errorText = screen.getByTestId('error').textContent ?? '';
  expect(errorText).not.toMatch(/supabase|url|key|token|stack/i);
});
