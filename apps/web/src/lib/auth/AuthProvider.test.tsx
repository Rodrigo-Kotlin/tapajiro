import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '@/lib/supabase/client';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

const mockGetClient = vi.mocked(getSupabaseClient);

function mkSub() {
  return { id: '1', callback: vi.fn(), unsubscribe: vi.fn() };
}

type MockAuth = ReturnType<typeof createMockAuth>;

function createMockAuth() {
  const sub = mkSub();
  let callback: ((event: string, session: unknown) => void) | null = null;

  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
      callback = cb;
      return { data: { subscription: sub } };
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    setSession: vi.fn(async (session: unknown) => {
      callback?.('SIGNED_IN', session);
      return { data: { user: (session as { user?: unknown } | null)?.user ?? null }, error: null };
    }),
    fireEvent(event: string, session: unknown) {
      callback?.(event, session);
    },
    sub,
  };
}

let mockAuth: MockAuth;

function TestConsumer() {
  const s = useAuth();
  return (
    <div>
      <span data-testid="status">{s.status}</span>
      <span data-testid="loading">{String(s.isLoading)}</span>
      <span data-testid="auth">{String(s.isAuthenticated)}</span>
      <span data-testid="user">{s.user?.email ?? 'none'}</span>
      <span data-testid="error">{s.error ?? 'none'}</span>
      <span data-testid="session">{s.session ? 'yes' : 'no'}</span>
      <span data-testid="signing">{String(s.isSigningOut)}</span>
      <span data-testid="signOutError">{s.signOutError ?? 'none'}</span>
      <button
        data-testid="signOutBtn"
        onClick={() => {
          s.signOut();
        }}
      />
      <button
        data-testid="clearErrorBtn"
        onClick={() => {
          s.clearSignOutError();
        }}
      />
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

  mockAuth = createMockAuth();
  mockGetClient.mockReturnValue({ auth: mockAuth } as unknown as SupabaseClient);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('importa sem efeito colateral', () => {
  expect(getSupabaseClient).not.toHaveBeenCalled();
});

it('inicia em loading', () => {
  renderWithProvider();
  expect(screen.getByTestId('status')).toHaveTextContent('loading');
  expect(screen.getByTestId('loading')).toHaveTextContent('true');
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
});

it('sessão inicial autenticada', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
  expect(screen.getByTestId('auth')).toHaveTextContent('true');
  expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
  expect(screen.getByTestId('session')).toHaveTextContent('yes');
});

it('sessão inicial ausente', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
  expect(screen.getByTestId('session')).toHaveTextContent('no');
});

it('erro sanitizado em getSession', async () => {
  mockAuth.getSession.mockRejectedValue(new Error('token expired'));

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('error');
  });
  expect(screen.getByTestId('error')).not.toHaveTextContent('token');
  expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
  expect(screen.getByTestId('auth')).toHaveTextContent('false');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
  expect(screen.getByTestId('session')).toHaveTextContent('no');
});

it('erro por configuração ausente', async () => {
  mockGetClient.mockImplementation(() => {
    throw new Error('VITE_SUPABASE_URL is not configured');
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('error');
  });
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
  expect(screen.getByTestId('error')).not.toHaveTextContent('none');
  const errorText = screen.getByTestId('error').textContent ?? '';
  expect(errorText).not.toMatch(/supabase|url|key|token|stack/i);
});

it('INITIAL_SESSION', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  act(() => {
    mockAuth.fireEvent('INITIAL_SESSION', {
      user: { id: 'u2', email: 'init@test.com' },
    });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('init@test.com');
});

it('SIGNED_IN', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  act(() => {
    mockAuth.fireEvent('SIGNED_IN', {
      user: { id: 'u3', email: 'signedin@test.com' },
    });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('signedin@test.com');
});

it('SIGNED_OUT', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  act(() => {
    mockAuth.fireEvent('SIGNED_OUT', null);
  });

  expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
  expect(screen.getByTestId('session')).toHaveTextContent('no');
});

it('TOKEN_REFRESHED', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  act(() => {
    mockAuth.fireEvent('TOKEN_REFRESHED', {
      user: { id: 'u4', email: 'refreshed@test.com' },
    });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('refreshed@test.com');
});

it('sincroniza user com session.user', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: {
      session: { user: { id: 'u1', email: 'sync@test.com' } },
      error: null,
    },
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
  expect(screen.getByTestId('user')).toHaveTextContent('sync@test.com');
  expect(screen.getByTestId('session')).toHaveTextContent('yes');
});

it('unsubscribe no unmount', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  const { unmount } = renderWithProvider();
  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  unmount();
  expect(mockAuth.sub.unsubscribe).toHaveBeenCalledOnce();
});

it('resultado tardio ignorado após unmount', async () => {
  let resolveGetSession!: (value: unknown) => void;
  mockAuth.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveGetSession = resolve;
    }),
  );

  const { unmount } = renderWithProvider();
  unmount();

  resolveGetSession({ data: { session: { user: { id: 'late' } } }, error: null });

  await vi.waitFor(() => {
    expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
  });
});

it('evento recente não sobrescrito por getSession antigo', async () => {
  let resolveGetSession!: (value: unknown) => void;
  mockAuth.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveGetSession = resolve;
    }),
  );

  renderWithProvider();

  expect(screen.getByTestId('status')).toHaveTextContent('loading');

  act(() => {
    mockAuth.fireEvent('SIGNED_IN', {
      user: { id: 'u5', email: 'event@test.com' },
    });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

  resolveGetSession({
    data: { session: null },
    error: null,
  });

  await vi.waitFor(() => {
    expect(mockAuth.getSession).toHaveBeenCalledTimes(1);
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('event@test.com');
});

it('evento padrão usa sessão', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  act(() => {
    mockAuth.fireEvent('USER_UPDATED', {
      user: { id: 'u6', email: 'default@test.com' },
    });
  });

  expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('default@test.com');
});

it('evento padrão sem sessão não altera estado', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  act(() => {
    mockAuth.fireEvent('USER_UPDATED', null);
  });

  expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  expect(screen.getByTestId('user')).toHaveTextContent('none');
});

it('funciona sob StrictMode', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  render(
    <StrictMode>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </StrictMode>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
  expect(screen.getByTestId('loading')).toHaveTextContent('false');
});

it('useAuth dentro do provider', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  renderWithProvider();
  expect(screen.getByTestId('loading')).toHaveTextContent('true');
});

it('erro amigável de useAuth fora do provider', () => {
  function BadComponent() {
    useAuth();
    return null;
  }

  const consoleError = console.error;
  console.error = vi.fn();

  expect(() => render(<BadComponent />)).toThrow('useAuth deve ser usado dentro de AuthProvider');

  console.error = consoleError;
});

describe('signOut', () => {
  it('API signOut existe no contexto', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('signOutBtn')).toBeInTheDocument();
  });

  it('estado inicial isSigningOut false', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('signing')).toHaveTextContent('false');
    });
  });

  it('estado inicial signOutError null', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).toHaveTextContent('none');
    });
  });

  it('chama auth.signOut com scope local', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      await screen.getByTestId('signOutBtn').click();
    });

    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('sucesso retorna true', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
      await vi.waitFor(() => {
        expect(mockAuth.signOut).toHaveBeenCalled();
      });
    });
  });

  it('sucesso limpa session', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('yes');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('no');
    });
  });

  it('sucesso limpa user', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    });
  });

  it('sucesso define unauthenticated', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
  });

  it('sucesso termina loading (isSigningOut false)', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signing')).toHaveTextContent('false');
    });
  });

  it('erro retornado pelo Supabase retorna false', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
  });

  it('Promise rejeitada retorna false', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockRejectedValue(new Error('rejected'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
  });

  it('erro mostra mensagem genérica', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).toHaveTextContent(
        'Não foi possível sair. Tente novamente.',
      );
    });
  });

  it('mensagem técnica não aparece', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('token expired') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('signOutError')).not.toHaveTextContent('token');
    expect(screen.getByTestId('signOutError')).not.toHaveTextContent('expired');
  });

  it('falha preserva session', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('yes');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('session')).toHaveTextContent('yes');
  });

  it('falha preserva user', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
  });

  it('falha preserva authenticated', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('falha com SIGNED_OUT restaura a sessão', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockImplementation(async () => {
      mockAuth.fireEvent('SIGNED_OUT', null);
      return { error: new Error('network') };
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(mockAuth.setSession).toHaveBeenCalled();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('session')).toHaveTextContent('yes');
    expect(screen.getByTestId('user')).toHaveTextContent('user@test.com');
    expect(screen.getByTestId('signOutError')).toHaveTextContent(
      'Não foi possível sair. Tente novamente.',
    );
  });

  it('falha rejeitada com SIGNED_OUT restaura a sessão', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockImplementation(async () => {
      mockAuth.fireEvent('SIGNED_OUT', null);
      throw new Error('network');
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(mockAuth.setSession).toHaveBeenCalled();
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('session')).toHaveTextContent('yes');
  });

  it('nova tentativa funciona após falha com restauração', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut
      .mockImplementationOnce(async () => {
        mockAuth.fireEvent('SIGNED_OUT', null);
        return { error: new Error('network') };
      })
      .mockResolvedValueOnce({ error: null });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('no');
    });
    expect(mockAuth.setSession).toHaveBeenCalledTimes(1);
  });

  it('duplo clique ou chamada concorrente executa uma vez', async () => {
    let resolveSignOut!: (value: unknown) => void;
    mockAuth.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
      screen.getByTestId('signOutBtn').click();
      screen.getByTestId('signOutBtn').click();
    });

    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);

    resolveSignOut!({ error: null });

    await vi.waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('no');
    });
  });

  it('nova tentativa funciona após falha', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut
      .mockResolvedValueOnce({ error: new Error('network') })
      .mockResolvedValueOnce({ error: null });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('no');
    });
  });

  it('clearSignOutError funciona', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: new Error('network') });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('signOutError')).not.toHaveTextContent('none');
    });

    await act(async () => {
      screen.getByTestId('clearErrorBtn').click();
    });

    expect(screen.getByTestId('signOutError')).toHaveTextContent('none');
  });

  it('resultado tardio é ignorado após unmount', async () => {
    let resolveSignOut!: (value: unknown) => void;
    mockAuth.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    const { unmount } = renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);

    unmount();

    resolveSignOut!({ error: null });
  });

  it('SIGNED_OUT concorrente mantém coerência', async () => {
    let resolveSignOut!: (value: unknown) => void;
    mockAuth.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    screen.getByTestId('signOutBtn').click();

    act(() => {
      mockAuth.fireEvent('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');

    resolveSignOut!({ error: null });

    await vi.waitFor(() => {
      expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('session')).toHaveTextContent('no');
  });

  it('evento SIGNED_OUT duplicado não quebra', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    act(() => {
      mockAuth.fireEvent('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');

    act(() => {
      mockAuth.fireEvent('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('funciona em StrictMode', async () => {
    let resolveSignOut!: (value: unknown) => void;
    mockAuth.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    render(
      <StrictMode>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    await act(async () => {
      resolveSignOut!({ error: null });
    });

    await waitFor(() => {
      expect(screen.getByTestId('session')).toHaveTextContent('no');
    });
  });

  it('não usa scope global', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    const callArg = mockAuth.signOut.mock.calls[0]?.[0];
    if (callArg && typeof callArg === 'object' && 'scope' in callArg) {
      expect(callArg.scope).toBe('local');
    }
  });

  it('isSigningOut true durante operação', async () => {
    let resolveSignOut!: (value: unknown) => void;
    mockAuth.signOut.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );

    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'user@test.com' } } },
      error: null,
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('signOutBtn').click();
    });

    expect(screen.getByTestId('signing')).toHaveTextContent('true');

    await act(async () => {
      resolveSignOut!({ error: null });
    });

    await waitFor(() => {
      expect(screen.getByTestId('signing')).toHaveTextContent('false');
    });
  });
});
