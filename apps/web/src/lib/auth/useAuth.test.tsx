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

function createMockClient(): SupabaseClient {
  const subscription = { id: '1', callback: vi.fn(), unsubscribe: vi.fn() };

  return {
    auth: {
      getSession: vi.fn(() => new Promise(() => {})),
      onAuthStateChange: vi.fn(() => ({ data: { subscription } })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  } as unknown as SupabaseClient;
}

function TestConsumer() {
  const s = useAuth();
  return <span data-testid="status">{s.status}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClient.mockReset();
  mockGetClient.mockReturnValue(createMockClient());
});

afterEach(() => {
  vi.restoreAllMocks();
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
