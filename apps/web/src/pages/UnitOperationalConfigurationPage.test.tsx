import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { UnitOperationalConfigurationPage } from './UnitOperationalConfigurationPage';
import {
  loadUnitOperationalConfiguration,
  OperationalConfigurationError,
  saveUnitOperationalConfiguration,
} from '@/lib/organization/operationalAdapter';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getSupabaseClient } from '@/lib/supabase/client';

vi.mock('@/lib/organization/operationalAdapter', async () => {
  const actual = await vi.importActual<typeof import('@/lib/organization/operationalAdapter')>(
    '@/lib/organization/operationalAdapter',
  );
  return {
    ...actual,
    loadUnitOperationalConfiguration: vi.fn(),
    saveUnitOperationalConfiguration: vi.fn(),
  };
});
vi.mock('@/lib/organization/OrganizationContext', () => ({ useOrganizationContext: vi.fn() }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: vi.fn() }));

const mockLoad = vi.mocked(loadUnitOperationalConfiguration);
const mockSave = vi.mocked(saveUnitOperationalConfiguration);
const mockContext = vi.mocked(useOrganizationContext);
const mockOnline = vi.mocked(useOnlineStatus);
const mockGetClient = vi.mocked(getSupabaseClient);

const organization = {
  id: '00000000-0000-0000-0000-000000000101',
  trade_name: 'Restaurante Tapajós',
  status: 'trial',
};
const unit = {
  id: '00000000-0000-0000-0000-000000000301',
  organization_id: organization.id,
  name: 'Centro',
  slug: 'centro',
  status: 'active',
};
const configuration = {
  settings: {
    unit_id: unit.id,
    organization_id: organization.id,
    delivery_enabled: true,
    pickup_enabled: true,
    counter_enabled: false,
    accept_immediate_orders: true,
    delivery_minimum_cents: 2500,
    pickup_minimum_cents: 0,
    counter_minimum_cents: 500,
    operational_message: 'Mensagem atual',
  },
  hours: [
    {
      id: '00000000-0000-0000-0000-000000000401',
      organization_id: organization.id,
      unit_id: unit.id,
      weekday: 1,
      sequence: 1,
      opens_at: '08:00:00',
      closes_at: '18:00:00',
      crosses_midnight: false,
      active: true,
    },
  ],
};

const refresh = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/organizacao/configuracao']}>
      <UnitOperationalConfigurationPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoad.mockResolvedValue(configuration);
  mockSave.mockResolvedValue(undefined);
  mockOnline.mockReturnValue({ isOnline: true, isOffline: false });
  mockGetClient.mockReturnValue({} as SupabaseClient);
  mockContext.mockReturnValue({
    organization,
    unit,
    units: [unit],
    isLoading: false,
    error: null,
    hasMembership: true,
    selectUnit: vi.fn(),
    refresh,
    refreshToken: 0,
  });
});

describe('UnitOperationalConfigurationPage', () => {
  it('carrega campos e horários da unidade ativa do contexto', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Configuração operacional' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Status da unidade')).toHaveValue('active');
    expect(screen.getByLabelText('Aceitar delivery')).toBeChecked();
    expect(screen.getByLabelText('Mínimo para delivery')).toHaveValue('25.00');
    expect(screen.getByLabelText('Mensagem exibida para a operação')).toHaveValue('Mensagem atual');
    expect(screen.getByLabelText('Abre')).toHaveValue('08:00');
    expect(mockLoad).toHaveBeenCalledWith(expect.anything(), organization.id, unit.id);
  });

  it('edita horários e salva sem escrever diretamente em tabelas', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Configuração operacional' });

    await user.click(screen.getAllByRole('button', { name: 'Adicionar faixa' })[0]!);
    await user.click(screen.getByLabelText('Aceitar retirada no balcão'));
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledOnce());
    expect(mockSave.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ organizationId: organization.id, unitId: unit.id }),
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Configuração operacional salva.');
  });

  it('rejeita mínimo negativo ou inválido antes da RPC', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Configuração operacional' });
    await user.clear(screen.getByLabelText('Mínimo para delivery'));
    await user.type(screen.getByLabelText('Mínimo para delivery'), '-1');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('mínimos devem ser valores');
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('bloqueia dupla submissão enquanto a operação está pendente', async () => {
    const user = userEvent.setup();
    let resolveSave!: () => void;
    mockSave.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Configuração operacional' });

    const saveButton = screen.getByRole('button', { name: 'Salvar configuração' });
    await user.click(saveButton);
    await user.click(saveButton);
    expect(mockSave).toHaveBeenCalledOnce();
    resolveSave();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('salva'));
  });

  it('exibe estado sem permissão', async () => {
    mockLoad.mockRejectedValue(new OperationalConfigurationError('permission'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem permissão');
  });

  it('exibe estado vazio quando a configuração não existe', async () => {
    mockLoad.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText('Configuração operacional indisponível')).toBeInTheDocument();
  });

  it('exibe erro recuperável de conexão', async () => {
    mockLoad.mockRejectedValue(new OperationalConfigurationError('unknown'));
    renderPage();
    expect(await screen.findByText('Não foi possível carregar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
