import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('@/lib/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/lib/auth/useAuth';
import type { AuthStatus } from '@/lib/auth/AuthProvider';

const mockUseAuth = vi.mocked(useAuth);

function renderProtectedRoute(url = '/app') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<div data-testid="protected-content">Protected</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function setAuthStatus(status: AuthStatus) {
  const mockUser =
    status === 'authenticated'
      ? {
          id: 'u1',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2026-01-01T00:00:00Z',
          email: 'user@example.invalid',
        }
      : null;
  mockUseAuth.mockReturnValue({
    status,
    session:
      status === 'authenticated'
        ? ({ user: mockUser } as unknown as import('@supabase/supabase-js').Session)
        : null,
    user: mockUser as unknown as import('@supabase/supabase-js').User | null,
    error: status === 'error' ? 'test error' : null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('loading mostra "Verificando sua sessão..."', () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.getByText('Verificando sua sessão...')).toBeInTheDocument();
});

it('loading não renderiza conteúdo protegido', () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
});

it('authenticated renderiza conteúdo protegido', () => {
  setAuthStatus('authenticated');
  renderProtectedRoute();
  expect(screen.getByTestId('protected-content')).toBeInTheDocument();
});

it('unauthenticated redireciona para /login', () => {
  setAuthStatus('unauthenticated');
  renderProtectedRoute();
  expect(screen.getByTestId('login-page')).toBeInTheDocument();
});

it('unauthenticated não renderiza conteúdo protegido', () => {
  setAuthStatus('unauthenticated');
  renderProtectedRoute();
  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
});

it('error não renderiza conteúdo protegido', () => {
  setAuthStatus('error');
  renderProtectedRoute();
  expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
});

it('error mostra mensagem genérica', () => {
  setAuthStatus('error');
  renderProtectedRoute();
  expect(screen.getByText('Não foi possível verificar sua sessão.')).toBeInTheDocument();
});

it('error oferece ação para login', () => {
  setAuthStatus('error');
  renderProtectedRoute();
  const link = screen.getByRole('link', { name: /ir para o login/i });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', '/login');
});

it('erro técnico não aparece', () => {
  setAuthStatus('error');
  renderProtectedRoute();
  expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/config error/i)).not.toBeInTheDocument();
});

it('loading usa role="status"', () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.getByRole('status')).toBeInTheDocument();
});

it('loading tem aria-live="polite"', () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
});

it('redirect preserva destino interno /app?tab=inicio', () => {
  setAuthStatus('unauthenticated');
  renderProtectedRoute('/app?tab=inicio');
  expect(screen.getByTestId('login-page')).toBeInTheDocument();
});

it('guard não chama Supabase diretamente', () => {
  const supabaseSpy = vi.spyOn(globalThis, 'fetch');
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(supabaseSpy).not.toHaveBeenCalled();
  supabaseSpy.mockRestore();
});

it('não existe flash do conteúdo protegido no loading', async () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.queryByTestId('protected-content')).toBeNull();
});

it('loading não renderiza sidebar ou dados internos', () => {
  setAuthStatus('loading');
  renderProtectedRoute();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(screen.queryByText(/funda.*[Tt]apajiro/i)).not.toBeInTheDocument();
});

it('unaunthenticated redireciona com replace', () => {
  setAuthStatus('unauthenticated');
  renderProtectedRoute();
  expect(screen.getByTestId('login-page')).toBeInTheDocument();
});
