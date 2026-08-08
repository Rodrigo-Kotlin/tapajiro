import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogPage } from './CatalogPage';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getSupabaseClient } from '@/lib/supabase/client';
import * as catalogAdapter from '@/lib/catalog/catalogAdapter';

vi.mock('@/lib/organization/OrganizationContext', () => ({ useOrganizationContext: vi.fn() }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: vi.fn() }));
vi.mock('@/lib/catalog/catalogAdapter', async () => {
  const actual = await vi.importActual<typeof import('@/lib/catalog/catalogAdapter')>(
    '@/lib/catalog/catalogAdapter',
  );
  return {
    ...actual,
    loadCatalog: vi.fn(),
    createMenuDraft: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    saveProduct: vi.fn(),
    setProductAvailability: vi.fn(),
    publishMenuVersion: vi.fn(),
    archiveMenuVersion: vi.fn(),
  };
});

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
const category = {
  id: '00000000-0000-0000-0000-000000000401',
  organization_id: organization.id,
  unit_id: unit.id,
  menu_id: '00000000-0000-0000-0000-000000000201',
  name: 'Lanches',
  description: null,
  position: 0,
  active: true,
  deleted_at: null,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
  version: 1,
};
const product = {
  id: '00000000-0000-0000-0000-000000000501',
  organization_id: organization.id,
  unit_id: unit.id,
  category_id: category.id,
  name: 'X Tapajós',
  description: 'Produto sintético',
  price_cents: 2590,
  active: true,
  available: true,
  position: 0,
  sku: null,
  deleted_at: null,
  created_at: '2026-08-08T00:00:00Z',
  updated_at: '2026-08-08T00:00:00Z',
  version: 1,
};
const draft = {
  id: '00000000-0000-0000-0000-000000000601',
  organization_id: organization.id,
  unit_id: unit.id,
  menu_id: '00000000-0000-0000-0000-000000000201',
  version_number: 1,
  status: 'draft' as const,
  checksum: null,
  created_at: '2026-08-08T00:00:00Z',
  published_at: null,
  published_by: null,
};
const catalog = {
  menu: {
    id: draft.menu_id,
    organization_id: organization.id,
    unit_id: unit.id,
    name: 'Cardápio principal',
    status: 'draft' as const,
    current_version_id: null,
    created_at: '2026-08-08T00:00:00Z',
    updated_at: '2026-08-08T00:00:00Z',
    version: 1,
  },
  versions: [draft],
  categories: [category],
  products: [product],
};

const mockContext = vi.mocked(useOrganizationContext);
const mockOnline = vi.mocked(useOnlineStatus);
const mockLoad = vi.mocked(catalogAdapter.loadCatalog);
const mockCreateCategory = vi.mocked(catalogAdapter.createCategory);
const mockAvailability = vi.mocked(catalogAdapter.setProductAvailability);
const mockPublish = vi.mocked(catalogAdapter.publishMenuVersion);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/catalogo']}>
      <CatalogPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockContext.mockReturnValue({
    organization,
    unit,
    units: [unit],
    isLoading: false,
    error: null,
    hasMembership: true,
    selectUnit: vi.fn(),
    refresh: vi.fn(),
    refreshToken: 0,
  });
  mockOnline.mockReturnValue({ isOnline: true, isOffline: false });
  vi.mocked(getSupabaseClient).mockReturnValue({} as never);
  mockLoad.mockResolvedValue(catalog);
  vi.mocked(catalogAdapter.createMenuDraft).mockResolvedValue(draft);
  mockCreateCategory.mockResolvedValue(category);
  mockAvailability.mockResolvedValue({ ...product, available: false });
  mockPublish.mockResolvedValue({ ...draft, status: 'published', checksum: 'checksum' });
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
});

describe('CatalogPage', () => {
  it('loads the active unit and creates a category through the adapter', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Cardápio da unidade' })).toBeInTheDocument();
    await user.type(screen.getAllByLabelText('Nome', { selector: 'input' })[0]!, 'Bebidas');
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }));
    await waitFor(() =>
      expect(mockCreateCategory).toHaveBeenCalledWith(
        expect.anything(),
        organization.id,
        unit.id,
        expect.objectContaining({ name: 'Bebidas' }),
      ),
    );
  });

  it('changes availability and publishes the selected draft', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { name: 'Cardápio da unidade' });
    await user.click(screen.getByRole('button', { name: 'Indisponibilizar' }));
    await waitFor(() =>
      expect(mockAvailability).toHaveBeenCalledWith(
        expect.anything(),
        organization.id,
        unit.id,
        expect.objectContaining({ id: product.id }),
        false,
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Publicar menu' }));
    await waitFor(() =>
      expect(mockPublish).toHaveBeenCalledWith(
        expect.anything(),
        organization.id,
        unit.id,
        draft.id,
      ),
    );
  });

  it('shows offline state and does not mutate', async () => {
    const user = userEvent.setup();
    mockOnline.mockReturnValue({ isOnline: false, isOffline: true });
    renderPage();
    await screen.findByRole('heading', { name: 'Cardápio da unidade' });
    await user.click(screen.getByRole('button', { name: 'Indisponibilizar' }));
    expect(
      screen.getByText('Sem conexão. Você pode consultar o catálogo, mas mutações exigem conexão.'),
    ).toBeInTheDocument();
    expect(mockAvailability).not.toHaveBeenCalled();
  });
});
