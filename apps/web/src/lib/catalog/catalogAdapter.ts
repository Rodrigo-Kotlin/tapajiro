import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const uuidSchema = z.string().uuid();
const centsSchema = z.coerce.number().int().nonnegative().refine(Number.isSafeInteger);

const menuSchema = z.object({
  id: uuidSchema,
  organization_id: uuidSchema,
  unit_id: uuidSchema,
  name: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  current_version_id: uuidSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().positive(),
});

const menuVersionSchema = z.object({
  id: uuidSchema,
  organization_id: uuidSchema,
  unit_id: uuidSchema,
  menu_id: uuidSchema,
  version_number: z.number().int().positive(),
  status: z.enum(['draft', 'published', 'archived']),
  checksum: z.string().nullable(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  published_by: uuidSchema.nullable(),
});

const categorySchema = z.object({
  id: uuidSchema,
  organization_id: uuidSchema,
  unit_id: uuidSchema,
  menu_id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  position: z.number().int().nonnegative(),
  active: z.boolean(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().positive(),
});

const productSchema = z.object({
  id: uuidSchema,
  organization_id: uuidSchema,
  unit_id: uuidSchema,
  category_id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  price_cents: centsSchema,
  active: z.boolean(),
  available: z.boolean(),
  position: z.number().int().nonnegative(),
  sku: z.string().nullable(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  version: z.number().int().positive(),
});

const publicMenuItemSchema = z.object({
  category_name: z.string(),
  category_position: z.number().int().nonnegative(),
  product_name: z.string(),
  product_description: z.string().nullable(),
  price_cents: centsSchema,
  available: z.boolean(),
  product_position: z.number().int().nonnegative(),
});

const orderingMenuItemSchema = publicMenuItemSchema.extend({
  product_id: uuidSchema,
  category_id: uuidSchema,
});

export type CatalogMenu = z.infer<typeof menuSchema>;
export type CatalogMenuVersion = z.infer<typeof menuVersionSchema>;
export type CatalogCategory = z.infer<typeof categorySchema>;
export type CatalogProduct = z.infer<typeof productSchema>;
export type PublicMenuItem = z.infer<typeof publicMenuItemSchema>;
export type OrderingMenuItem = z.infer<typeof orderingMenuItemSchema>;

export interface CatalogData {
  menu: CatalogMenu | null;
  versions: CatalogMenuVersion[];
  categories: CatalogCategory[];
  products: CatalogProduct[];
}

export type CatalogErrorKind = 'permission' | 'conflict' | 'offline' | 'unknown';

export class CatalogError extends Error {
  constructor(
    public readonly kind: CatalogErrorKind,
    message = 'Não foi possível carregar o catálogo. Tente novamente.',
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

function classifyError(error: unknown): CatalogError {
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? error.code : undefined;
    if (code === '42501' || code === 'PGRST301' || code === '403') {
      return new CatalogError('permission', 'Você não tem permissão para gerenciar este catálogo.');
    }
    if (code === '40001') {
      return new CatalogError(
        'conflict',
        'O catálogo foi alterado por outra pessoa. Recarregue antes de tentar novamente.',
      );
    }
  }
  return new CatalogError('unknown');
}

function parseResult<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new CatalogError('unknown');
  return parsed.data;
}

async function unwrapRpc<T>(
  schema: z.ZodType<T>,
  result: { data: unknown; error: unknown },
): Promise<T> {
  if (result.error) throw classifyError(result.error);
  return parseResult(schema, result.data);
}

export async function loadCatalog(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
): Promise<CatalogData> {
  const menuResult = await client
    .from('menus')
    .select(
      'id, organization_id, unit_id, name, status, current_version_id, created_at, updated_at, version',
    )
    .eq('organization_id', organizationId)
    .eq('unit_id', unitId)
    .maybeSingle();

  if (menuResult.error) throw classifyError(menuResult.error);
  if (!menuResult.data) return { menu: null, versions: [], categories: [], products: [] };

  const menu = parseResult(menuSchema, menuResult.data);
  const [versionsResult, categoriesResult, productsResult] = await Promise.all([
    client
      .from('menu_versions')
      .select(
        'id, organization_id, unit_id, menu_id, version_number, status, checksum, created_at, published_at, published_by',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .eq('menu_id', menu.id)
      .order('version_number', { ascending: false }),
    client
      .from('categories')
      .select(
        'id, organization_id, unit_id, menu_id, name, description, position, active, deleted_at, created_at, updated_at, version',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .eq('menu_id', menu.id)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('id', { ascending: true }),
    client
      .from('products')
      .select(
        'id, organization_id, unit_id, category_id, name, description, price_cents, active, available, position, sku, deleted_at, created_at, updated_at, version',
      )
      .eq('organization_id', organizationId)
      .eq('unit_id', unitId)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('id', { ascending: true }),
  ]);

  if (versionsResult.error || categoriesResult.error || productsResult.error) {
    throw classifyError(versionsResult.error ?? categoriesResult.error ?? productsResult.error);
  }

  return {
    menu,
    versions: parseResult(z.array(menuVersionSchema), versionsResult.data ?? []),
    categories: parseResult(z.array(categorySchema), categoriesResult.data ?? []),
    products: parseResult(z.array(productSchema), productsResult.data ?? []),
  };
}

export async function createMenuDraft(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
): Promise<CatalogMenuVersion> {
  return unwrapRpc(
    menuVersionSchema,
    await client.rpc('create_menu_draft', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
    }),
  );
}

export async function createCategory(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  input: { name: string; description: string | null; position: number },
): Promise<CatalogCategory> {
  return unwrapRpc(
    categorySchema,
    await client.rpc('create_catalog_category', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_name: input.name,
      p_description: input.description,
      p_position: input.position,
    }),
  );
}

export async function updateCategory(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  categoryId: string,
  input: {
    name: string;
    description: string | null;
    position: number;
    active: boolean;
    version: number;
  },
): Promise<CatalogCategory> {
  return unwrapRpc(
    categorySchema,
    await client.rpc('update_catalog_category', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_category_id: categoryId,
      p_name: input.name,
      p_description: input.description,
      p_position: input.position,
      p_active: input.active,
      p_expected_version: input.version,
    }),
  );
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description: string | null;
  priceCents: number;
  active: boolean;
  available: boolean;
  position: number;
  sku: string | null;
  version: number | undefined;
}

export async function saveProduct(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  productId: string | null,
  input: ProductInput,
): Promise<CatalogProduct> {
  if (productId) {
    return unwrapRpc(
      productSchema,
      await client.rpc('update_catalog_product', {
        p_organization_id: organizationId,
        p_unit_id: unitId,
        p_product_id: productId,
        p_category_id: input.categoryId,
        p_name: input.name,
        p_description: input.description,
        p_price_cents: input.priceCents,
        p_active: input.active,
        p_available: input.available,
        p_position: input.position,
        p_sku: input.sku,
        p_expected_version: input.version ?? null,
      }),
    );
  }

  return unwrapRpc(
    productSchema,
    await client.rpc('create_catalog_product', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_category_id: input.categoryId,
      p_name: input.name,
      p_description: input.description,
      p_price_cents: input.priceCents,
      p_available: input.available,
      p_position: input.position,
      p_sku: input.sku,
    }),
  );
}

export async function setProductAvailability(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  product: Pick<CatalogProduct, 'id' | 'version'>,
  available: boolean,
): Promise<CatalogProduct> {
  return unwrapRpc(
    productSchema,
    await client.rpc('set_product_availability', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_product_id: product.id,
      p_available: available,
      p_expected_version: product.version,
    }),
  );
}

export async function publishMenuVersion(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  versionId: string,
): Promise<CatalogMenuVersion> {
  return unwrapRpc(
    menuVersionSchema,
    await client.rpc('publish_menu_version', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_menu_version_id: versionId,
    }),
  );
}

export async function archiveMenuVersion(
  client: SupabaseClient,
  organizationId: string,
  unitId: string,
  versionId: string,
): Promise<CatalogMenuVersion> {
  return unwrapRpc(
    menuVersionSchema,
    await client.rpc('archive_menu_version', {
      p_organization_id: organizationId,
      p_unit_id: unitId,
      p_menu_version_id: versionId,
    }),
  );
}

export async function loadPublicMenu(
  client: SupabaseClient,
  slug: string,
): Promise<PublicMenuItem[]> {
  if (!slug.trim()) return [];
  return unwrapRpc(
    z.array(publicMenuItemSchema),
    await client.rpc('get_public_menu_by_slug', { p_slug: slug }),
  );
}

export async function loadOrderingMenu(
  client: SupabaseClient,
  slug: string,
): Promise<OrderingMenuItem[]> {
  if (!slug.trim()) return [];
  return unwrapRpc(
    z.array(orderingMenuItemSchema),
    await client.rpc('get_public_ordering_menu_by_slug', { p_slug: slug }),
  );
}
