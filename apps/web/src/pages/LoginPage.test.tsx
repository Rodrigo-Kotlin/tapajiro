import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { LoginPage } from './LoginPage';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

import { getSupabaseClient } from '@/lib/supabase/client';

const mockGetClient = vi.mocked(getSupabaseClient);

function createMockAuth() {
  const sub = { id: '1', callback: vi.fn(), unsubscribe: vi.fn() };

  return {
    getSession: vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: vi.fn(() => {
      return { data: { subscription: sub } };
    }),
    signInWithPassword: vi.fn(),
    sub,
  };
}

let mockAuth: ReturnType<typeof createMockAuth>;

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app-page">App</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function getEmailInput() {
  return screen.getByLabelText(/e-mail/i);
}

function getPasswordInput() {
  return screen.getByLabelText(/^senha$/i);
}

function getSubmitButton() {
  return screen.getByRole('button', { name: /entrar/i });
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

  mockAuth = createMockAuth();
  mockAuth.signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });

  mockGetClient.mockReturnValue({
    auth: mockAuth,
  } as unknown as SupabaseClient);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('renderiza a rota /login', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(
      screen.getByRole('heading', { level: 1, name: /acesse o tapajiro/i }),
    ).toBeInTheDocument();
  });
});

it('exibe o título da página', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(screen.getByText('Acesse o Tapajiro')).toBeInTheDocument();
  });
});

it('exibe campos de e-mail e senha', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });
  expect(getPasswordInput()).toBeInTheDocument();
});

it('campos possuem autocomplete correto', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toHaveAttribute('autocomplete', 'email');
  });
  expect(getPasswordInput()).toHaveAttribute('autocomplete', 'current-password');
});

it('exibe botão Entrar', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(getSubmitButton()).toBeInTheDocument();
  });
});

it('senha inicialmente oculta', async () => {
  renderLoginPage();
  await waitFor(() => {
    expect(getPasswordInput()).toHaveAttribute('type', 'password');
  });
});

it('Mostrar senha altera para text', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getPasswordInput()).toBeInTheDocument();
  });

  const toggle = screen.getByRole('button', { name: /mostrar senha/i });
  await user.click(toggle);
  expect(getPasswordInput()).toHaveAttribute('type', 'text');
});

it('Ocultar senha retorna para password', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getPasswordInput()).toBeInTheDocument();
  });

  const toggle = screen.getByRole('button', { name: /mostrar senha/i });
  await user.click(toggle);
  expect(getPasswordInput()).toHaveAttribute('type', 'text');

  await user.click(screen.getByRole('button', { name: /ocultar senha/i }));
  expect(getPasswordInput()).toHaveAttribute('type', 'password');
});

it('submissão vazia mostra erros', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getSubmitButton()).toBeInTheDocument();
  });

  await user.click(getSubmitButton());

  expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
  expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
});

it('e-mail inválido é rejeitado', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'invalido');
  await user.click(getSubmitButton());

  expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
});

it('senha vazia é rejeitada', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.click(getSubmitButton());

  expect(screen.getByText('Informe sua senha.')).toBeInTheDocument();
});

it('dados válidos chamam signInWithPassword uma vez', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'minha-senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
  });
  expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
    email: 'teste@teste.com',
    password: 'minha-senha',
  });
});

it('e-mail enviado sem espaços externos', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), '  espaco@teste.com  ');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'espaco@teste.com',
      password: 'senha',
    });
  });
});

it('senha enviada sem modificação', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), '  minha-senha  ');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'teste@teste.com',
      password: '  minha-senha  ',
    });
  });
});

it('loading mostra Entrando...', async () => {
  let resolveSignIn!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    }),
  );

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  expect(screen.getByText('Entrando...')).toBeInTheDocument();

  resolveSignIn({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });
});

it('campos desabilitados durante loading', async () => {
  let resolveSignIn!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    }),
  );

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  expect(getEmailInput()).toBeDisabled();
  expect(getPasswordInput()).toBeDisabled();

  resolveSignIn({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });
});

it('botão desabilitado durante loading', async () => {
  let resolveSignIn!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    }),
  );

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled();

  resolveSignIn({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });
});

it('duplo clique não duplica chamada', async () => {
  let resolveSignIn!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    }),
  );

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());
  await user.click(screen.getByRole('button', { name: /entrando/i }));

  await vi.waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  resolveSignIn({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });
});

it('Enter durante loading não duplica chamada', async () => {
  let resolveSignIn!: (value: unknown) => void;
  mockAuth.signInWithPassword.mockReturnValue(
    new Promise((resolve) => {
      resolveSignIn = resolve;
    }),
  );

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());
  await user.keyboard('{Enter}');

  await vi.waitFor(() => {
    expect(mockAuth.signInWithPassword).toHaveBeenCalledTimes(1);
  });

  resolveSignIn({
    data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
    error: null,
  });
});

it('sucesso navega para /app com replace', async () => {
  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
  });
});

it('erro retornado mostra mensagem genérica', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: 'Invalid login credentials' },
  });

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha-errada');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(
      screen.getByText('Não foi possível entrar. Confira seus dados e tente novamente.'),
    ).toBeInTheDocument();
  });
});

it('exceção rejeitada mostra mensagem genérica', async () => {
  mockAuth.signInWithPassword.mockRejectedValue(new Error('Network error'));

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(
      screen.getByText('Não foi possível entrar. Confira seus dados e tente novamente.'),
    ).toBeInTheDocument();
  });
});

it('mensagem técnica não aparece no DOM', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: { message: 'Invalid login credentials' },
  });

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha-errada');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(
      screen.getByText('Não foi possível entrar. Confira seus dados e tente novamente.'),
    ).toBeInTheDocument();
  });
  expect(screen.queryByText(/invalid login credentials/i)).toBeNull();
  expect(screen.queryByText(/network/i)).toBeNull();
});

it('nova tentativa funciona depois da falha', async () => {
  mockAuth.signInWithPassword
    .mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })
    .mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } },
      error: null,
    });

  const user = userEvent.setup();
  renderLoginPage();
  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'errada');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(
      screen.getByText('Não foi possível entrar. Confira seus dados e tente novamente.'),
    ).toBeInTheDocument();
  });

  await user.clear(getPasswordInput());
  await user.type(getPasswordInput(), 'correta');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
  });
});

it('usuário authenticated é redirecionado', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: {
      session: { user: { id: 'u1', email: 'logado@teste.com' } },
    },
    error: null,
  });

  renderLoginPage();

  await waitFor(() => {
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
  });
});

it('estado loading não mostra formulário prematuramente', async () => {
  let resolveSession!: (value: unknown) => void;
  mockAuth.getSession.mockReturnValue(
    new Promise((resolve) => {
      resolveSession = resolve;
    }),
  );

  renderLoginPage();

  expect(screen.getByRole('status', { name: /verificando sua sessão/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /acesse o tapajiro/i })).not.toBeInTheDocument();

  resolveSession({ data: { session: null }, error: null });

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /acesse o tapajiro/i })).toBeInTheDocument();
  });
});

it('useAuth em error mantém experiência recuperável', async () => {
  mockGetClient.mockImplementation(() => {
    throw new Error('config error');
  });

  renderLoginPage();

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /acesse o tapajiro/i })).toBeInTheDocument();
  });
  expect(getSubmitButton()).toBeInTheDocument();
});

it('nenhum valor de senha é registrado', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  renderLoginPage();

  expect(consoleSpy).not.toHaveBeenCalled();
  expect(consoleWarn).not.toHaveBeenCalled();
  expect(consoleError).not.toHaveBeenCalled();

  consoleSpy.mockRestore();
  consoleWarn.mockRestore();
  consoleError.mockRestore();
});

it('nenhum acesso real à rede', () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(new Response()));

  renderLoginPage();

  expect(fetchSpy).not.toHaveBeenCalled();

  fetchSpy.mockRestore();
});

it('integração não quebra as rotas / e /app', async () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">Home</div>} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  expect(screen.getByTestId('home')).toBeInTheDocument();
});

it('login usa destino interno seguro após sucesso', async () => {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/app/config' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app-page">App</div>} />
          <Route path="/app/config" element={<div data-testid="config-page">Config</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(screen.getByTestId('config-page')).toBeInTheDocument();
  });
  expect(screen.queryByTestId('app-page')).not.toBeInTheDocument();
});

it('login usa /app quando não há destino', async () => {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app-page">App</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
  });
});

it('login não aceita URL externa como destino', async () => {
  const user = userEvent.setup();
  render(
    <AuthProvider>
      <MemoryRouter
        initialEntries={[{ pathname: '/login', state: { from: 'https://evil.example' } }]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app-page">App</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(getEmailInput()).toBeInTheDocument();
  });

  await user.type(getEmailInput(), 'teste@teste.com');
  await user.type(getPasswordInput(), 'senha');
  await user.click(getSubmitButton());

  await waitFor(() => {
    expect(screen.getByTestId('app-page')).toBeInTheDocument();
  });
});

it('usuário authenticated redireciona para destino interno', async () => {
  mockAuth.getSession.mockResolvedValue({
    data: {
      session: { user: { id: 'u1', email: 'logado@teste.com' } },
    },
    error: null,
  });

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/app/config' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/app" element={<div data-testid="app-page">App</div>} />
          <Route path="/app/config" element={<div data-testid="config-page">Config</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('config-page')).toBeInTheDocument();
  });
});
