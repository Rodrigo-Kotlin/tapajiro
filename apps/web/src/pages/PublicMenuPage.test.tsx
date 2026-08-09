import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicMenuPage } from './PublicMenuPage';
import { loadOrderingMenu } from '@/lib/catalog/catalogAdapter';

vi.mock('@/lib/catalog/catalogAdapter', async () => {
  const actual = await vi.importActual<typeof import('@/lib/catalog/catalogAdapter')>(
    '@/lib/catalog/catalogAdapter',
  );
  return { ...actual, loadOrderingMenu: vi.fn() };
});
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: vi.fn(() => ({})) }));

const mockLoad = vi.mocked(loadOrderingMenu);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/menu/catalogo-a']}>
      <Routes>
        <Route path="/menu/:slug" element={<PublicMenuPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('PublicMenuPage', () => {
  it('shows only the published RPC result without mutation controls', async () => {
    mockLoad.mockResolvedValue([
      {
        product_id: '00000000-0000-0000-0000-000000000001',
        category_id: '00000000-0000-0000-0000-000000000002',
        category_name: 'Lanches',
        category_position: 0,
        product_name: 'X Tapajós',
        product_description: 'Produto publicado',
        price_cents: 2590,
        available: true,
        product_position: 0,
      },
    ]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument();
    expect(screen.getByText('X Tapajós')).toBeInTheDocument();
    expect(screen.getByText('2.590 centavos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeInTheDocument();
  });

  it('shows a sanitized unavailable state for an empty public result', async () => {
    mockLoad.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Cardápio indisponível' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Este endereço não existe, a unidade está indisponível ou o cardápio ainda não foi publicado.',
      ),
    ).toBeInTheDocument();
  });
});
