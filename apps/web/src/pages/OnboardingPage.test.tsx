import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { OnboardingPage } from './OnboardingPage';

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

const mockGetSupabaseClient = vi.mocked(getSupabaseClient);
const defaultRpc = vi.fn();
const validResult = [
  {
    organization_id: '00000000-0000-0000-0000-000000000101',
    unit_id: '00000000-0000-0000-0000-000000000102',
    unit_slug: 'centro-tapajos',
    organization_status: 'trial',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/onboarding']}>
      <Routes>
        <Route path="/app/onboarding" element={<OnboardingPage />} />
        <Route path="/app" element={<div>Painel protegido</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nome da organização'), 'Restaurante Tapajós');
  await user.type(screen.getByLabelText('Nome da primeira unidade'), 'Centro');
  await user.type(screen.getByLabelText('Slug da unidade'), 'centro-tapajos');
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultRpc.mockResolvedValue({ data: validResult, error: null });
    mockGetSupabaseClient.mockReturnValue({
      rpc: defaultRpc,
    } as unknown as SupabaseClient);
  });

  it('valida campos obrigatórios e o formato do slug sem chamar a RPC', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    expect(await screen.findByText('Informe o nome da organização.')).toBeInTheDocument();
    expect(screen.getByText('Informe o nome da unidade.')).toBeInTheDocument();
    expect(screen.getByText('Use pelo menos 3 caracteres no slug.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nome da organização'), 'Org');
    await user.type(screen.getByLabelText('Nome da primeira unidade'), 'Centro');
    await user.type(screen.getByLabelText('Slug da unidade'), 'Centro Tapajos');
    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    expect(await screen.findByText('Use letras minúsculas, números e hífens.')).toBeInTheDocument();
    expect(defaultRpc).not.toHaveBeenCalled();
  });

  it('mostra loading e desabilita o formulário enquanto a RPC aguarda', async () => {
    const user = userEvent.setup();
    let resolveRpc: (value: { data: typeof validResult; error: null }) => void = () => {};
    const rpc = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRpc = resolve;
      }),
    );
    mockGetSupabaseClient.mockReturnValue({ rpc } as unknown as SupabaseClient);
    renderPage();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    expect(screen.getByRole('button', { name: 'Criando espaço...' })).toBeDisabled();
    expect(screen.getByLabelText('Nome da organização')).toBeDisabled();
    resolveRpc({ data: validResult, error: null });
    expect(await screen.findByText('Seu espaço está pronto')).toBeInTheDocument();
  });

  it('chama somente a RPC sem enviar IDs e exibe o resultado confirmado', async () => {
    const user = userEvent.setup();
    const rpc = vi.fn().mockResolvedValue({ data: validResult, error: null });
    mockGetSupabaseClient.mockReturnValue({ rpc } as unknown as SupabaseClient);
    renderPage();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    await screen.findByText('Seu espaço está pronto');
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('create_first_organization', {
      p_legal_name: 'Restaurante Tapajós',
      p_trade_name: 'Restaurante Tapajós',
      p_unit_name: 'Centro',
      p_unit_public_name: 'Centro',
      p_unit_slug: 'centro-tapajos',
      p_timezone: 'America/Santarem',
    });
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('organization_id');
    expect(rpc.mock.calls[0]?.[1]).not.toHaveProperty('unit_id');
    expect(
      screen.getByText(/ID confirmado:.*00000000-0000-0000-0000-000000000101/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Slug:.*centro-tapajos/)).toBeInTheDocument();
  });

  it('navega para /app depois de confirmar o resultado', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar organização' }));
    await user.click(await screen.findByRole('button', { name: 'Ir para o painel' }));

    expect(screen.getByText('Painel protegido')).toBeInTheDocument();
  });

  it.each([
    ['auth_required', 'Sua sessão não está disponível. Entre novamente.'],
    ['profile_required', 'Seu perfil ainda não está pronto. Atualize a página e tente novamente.'],
    [
      'bootstrap_already_completed',
      'Este usuário já possui uma organização. Acesse o painel para continuar.',
    ],
    ['invalid_name', 'Confira os nomes informados.'],
    ['invalid_unit_slug', 'Use letras minúsculas, números e hífens no slug.'],
    ['unit_slug_conflict', 'Esse slug já está em uso. Escolha outro.'],
    ['owner_role_missing', 'Não foi possível preparar seu acesso. Tente novamente mais tarde.'],
  ])('exibe mensagem genérica para o erro %s', async (code, message) => {
    const user = userEvent.setup();
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: code } });
    mockGetSupabaseClient.mockReturnValue({ rpc } as unknown as SupabaseClient);
    renderPage();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Criar organização' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('impede dupla submissão enquanto a primeira chamada está pendente', async () => {
    const user = userEvent.setup();
    let resolveRpc: (value: { data: typeof validResult; error: null }) => void = () => {};
    const rpc = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveRpc = resolve;
      }),
    );
    mockGetSupabaseClient.mockReturnValue({ rpc } as unknown as SupabaseClient);
    renderPage();
    await fillValidForm(user);

    const submit = screen.getByRole('button', { name: 'Criar organização' });
    await user.click(submit);
    await user.click(screen.getByRole('button', { name: 'Criando espaço...' }));

    expect(rpc).toHaveBeenCalledOnce();
    resolveRpc({ data: validResult, error: null });
    await waitFor(() => expect(screen.getByText('Seu espaço está pronto')).toBeInTheDocument());
  });
});
