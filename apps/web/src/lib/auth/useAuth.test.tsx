import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';
import { getSupabaseClient } from '@/lib/supabase/client';

const mockGetClient = vi.mocked(getSupabaseClient);

function TestConsumer() {
  const s = useAuth();
  return <span data-testid="status">{s.status}</span>;
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

  const sub = { id: '1', callback: vi.fn(), unsubscribe: vi.fn() };
  mockGetClient.mockReturnValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: sub } })),
    },
  } as unknown as SupabaseClient);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('useAuth', () => {
  it('lança erro amigável fora do provider', () => {
    function BadComponent() {
      useAuth();
      return null;
    }

    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<BadComponent />)).toThrow('useAuth deve ser usado dentro de AuthProvider');

    console.error = consoleError;
  });

  it('funciona dentro do AuthProvider', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
  });
});
