import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  createCategory,
  loadOrderingMenu,
  loadPublicMenu,
  publishMenuVersion,
  saveProduct,
  setProductAvailability,
} from './catalogAdapter';

const organizationId = '00000000-0000-0000-0000-000000000101';
const unitId = '00000000-0000-0000-0000-000000000301';
const categoryId = '00000000-0000-0000-0000-000000000401';
const productId = '00000000-0000-0000-0000-000000000501';
const versionId = '00000000-0000-0000-0000-000000000601';

function category() {
  return {
    id: categoryId,
    organization_id: organizationId,
    unit_id: unitId,
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
}

function product() {
  return {
    id: productId,
    organization_id: organizationId,
    unit_id: unitId,
    category_id: categoryId,
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
}

function version() {
  return {
    id: versionId,
    organization_id: organizationId,
    unit_id: unitId,
    menu_id: '00000000-0000-0000-0000-000000000201',
    version_number: 1,
    status: 'published',
    checksum: 'abc123',
    created_at: '2026-08-08T00:00:00Z',
    published_at: '2026-08-08T00:00:00Z',
    published_by: '00000000-0000-0000-0000-000000000701',
  };
}

function clientWithRpc(result: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data: result, error }) } as unknown as SupabaseClient;
}

describe('catalogAdapter', () => {
  it('creates a category through the exact catalog RPC and context IDs', async () => {
    const client = clientWithRpc(category());

    await createCategory(client, organizationId, unitId, {
      name: 'Lanches',
      description: null,
      position: 0,
    });

    expect(client.rpc).toHaveBeenCalledWith('create_catalog_category', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_name: 'Lanches',
      p_description: null,
      p_position: 0,
    });
  });

  it('sends product edits and availability through RPCs without table writes', async () => {
    const client = clientWithRpc(product());

    await saveProduct(client, organizationId, unitId, productId, {
      categoryId,
      name: 'X Tapajós',
      description: 'Produto sintético',
      priceCents: 2590,
      active: true,
      available: true,
      position: 0,
      sku: null,
      version: 1,
    });
    await setProductAvailability(
      client,
      organizationId,
      unitId,
      { id: productId, version: 1 },
      false,
    );

    expect(client.rpc).toHaveBeenNthCalledWith(
      1,
      'update_catalog_product',
      expect.objectContaining({
        p_organization_id: organizationId,
        p_unit_id: unitId,
        p_product_id: productId,
        p_price_cents: 2590,
        p_expected_version: 1,
      }),
    );
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'set_product_availability', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_product_id: productId,
      p_available: false,
      p_expected_version: 1,
    });
  });

  it('publishes with the draft version ID and maps permission errors safely', async () => {
    const client = clientWithRpc(version());
    await publishMenuVersion(client, organizationId, unitId, versionId);
    expect(client.rpc).toHaveBeenCalledWith('publish_menu_version', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_menu_version_id: versionId,
    });

    const deniedClient = clientWithRpc(null, { code: '42501' });
    await expect(
      createCategory(deniedClient, organizationId, unitId, {
        name: 'Privada',
        description: null,
        position: 0,
      }),
    ).rejects.toMatchObject({ kind: 'permission' });
  });

  it('reads the public menu only through the slug RPC and parses cents', async () => {
    const client = clientWithRpc([
      {
        category_name: 'Lanches',
        category_position: 0,
        product_name: 'X Tapajós',
        product_description: null,
        price_cents: '2590',
        available: true,
        product_position: 0,
      },
    ]);

    await expect(loadPublicMenu(client, 'catalog-a')).resolves.toEqual([
      expect.objectContaining({ price_cents: 2590 }),
    ]);
    expect(client.rpc).toHaveBeenCalledWith('get_public_menu_by_slug', { p_slug: 'catalog-a' });
  });

  it('reads the ordering menu through its additive public RPC with product identity', async () => {
    const client = clientWithRpc([
      {
        product_id: productId,
        category_id: categoryId,
        category_name: 'Lanches',
        category_position: 0,
        product_name: 'X Tapajós',
        product_description: null,
        price_cents: 2590,
        available: true,
        product_position: 0,
      },
    ]);

    await expect(loadOrderingMenu(client, 'catalog-a')).resolves.toEqual([
      expect.objectContaining({ product_id: productId, category_id: categoryId }),
    ]);
    expect(client.rpc).toHaveBeenCalledWith('get_public_ordering_menu_by_slug', {
      p_slug: 'catalog-a',
    });
  });
});
