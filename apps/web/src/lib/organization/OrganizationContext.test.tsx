import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationContextProvider, useOrganizationContext } from './OrganizationContext';
import { loadOrganizationContext } from './adapter';
import { useAuth } from '@/lib/auth/useAuth';
import { getSupabaseClient } from '@/lib/supabase/client';

vi.mock('./adapter', () => ({
  loadOrganizationContext: vi.fn(),
  OrganizationContextReadError: class OrganizationContextReadError extends Error {},
}));

vi.mock('@/lib/auth/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: vi.fn() }));

const mockLoad = vi.mocked(loadOrganizationContext);
const mockUseAuth = vi.mocked(useAuth);
const mockGetSupabaseClient = vi.mocked(getSupabaseClient);
const organization = {
  id: '00000000-0000-0000-0000-000000000101',
  trade_name: 'Org A',
  status: 'trial',
};
const units = [
  {
    id: '00000000-0000-0000-0000-000000000301',
    organization_id: organization.id,
    name: 'Centro',
    slug: 'centro',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000302',
    organization_id: organization.id,
    name: 'Aldeia',
    slug: 'aldeia',
    status: 'active',
  },
];

function Consumer() {
  const {
    organization: currentOrganization,
    unit,
    units: availableUnits,
    selectUnit,
  } = useOrganizationContext();
  return (
    <div>
      <p>{currentOrganization?.trade_name}</p>
      <p data-testid="current-unit">{unit?.name ?? 'sem unidade'}</p>
      {availableUnits.map((availableUnit) => (
        <button key={availableUnit.id} onClick={() => selectUnit(availableUnit.id)}>
          {availableUnit.name}
        </button>
      ))}
    </div>
  );
}

function renderProvider() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route element={<OrganizationContextProvider />}>
          <Route path="/app" element={<Consumer />} />
        </Route>
        <Route path="/app/onboarding" element={<p>Onboarding</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationContextProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGetSupabaseClient.mockReturnValue({} as ReturnType<typeof getSupabaseClient>);
    mockUseAuth.mockReturnValue({ status: 'authenticated', user: { id: 'user-1' } } as ReturnType<
      typeof useAuth
    >);
  });

  it('expõe a organização e a unidade atual', async () => {
    mockLoad.mockResolvedValue({ organization, units });
    renderProvider();
    expect(await screen.findByText('Org A')).toBeInTheDocument();
    expect(screen.getByTestId('current-unit')).toHaveTextContent('Centro');
  });

  it('permite trocar a unidade e persiste somente o ID na sessão', async () => {
    const user = userEvent.setup();
    mockLoad.mockResolvedValue({ organization, units });
    renderProvider();
    await screen.findByText('Org A');
    await user.click(screen.getByRole('button', { name: 'Aldeia' }));
    expect(screen.getByTestId('current-unit')).toHaveTextContent('Aldeia');
    expect(sessionStorage.getItem('tapajiro.active-unit-id')).toBe(units[1]!.id);
  });

  it('redireciona para onboarding quando não há contexto', async () => {
    mockLoad.mockResolvedValue({ organization: null, units: [] });
    renderProvider();
    expect(await screen.findByText('Onboarding')).toBeInTheDocument();
  });

  it('mostra erro sem expor detalhe técnico', async () => {
    mockLoad.mockRejectedValue(new Error('SQL and tenant detail'));
    renderProvider();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar seu contexto.',
    );
    expect(screen.queryByText('SQL and tenant detail')).not.toBeInTheDocument();
  });

  it('descarta seleção armazenada de unidade não autorizada', async () => {
    sessionStorage.setItem('tapajiro.active-unit-id', '00000000-0000-0000-0000-000000009999');
    mockLoad.mockResolvedValue({ organization, units: [units[0]!] });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('current-unit')).toHaveTextContent('Centro'));
    expect(sessionStorage.getItem('tapajiro.active-unit-id')).toBe(
      '00000000-0000-0000-0000-000000009999',
    );
  });
});
