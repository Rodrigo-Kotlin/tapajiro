-- F2.5B — Catalog MVP tests
-- Synthetic fixtures only; run by Supabase CLI with pgTAP.

begin;
select no_plan();

select has_table('public', 'menus', 'menus exists');
select has_table('public', 'categories', 'categories exists');
select has_table('public', 'products', 'products exists');
select has_table('public', 'menu_versions', 'menu_versions exists');
select has_table('public', 'menu_version_items', 'menu_version_items exists');
select hasnt_table('public', 'product_variants', 'product variants remain outside scope');
select hasnt_table('public', 'option_groups', 'option groups remain outside scope');
select hasnt_table('public', 'wallets', 'wallets remain outside scope');
select hasnt_table('public', 'balances', 'balances remain outside scope');
select hasnt_table('public', 'payouts', 'payouts remain outside scope');
select hasnt_table('public', 'settlements', 'settlements remain outside scope');

select has_function('public', 'create_menu_draft', 'create draft RPC exists');
select has_function('public', 'create_catalog_category', 'create category RPC exists');
select has_function('public', 'update_catalog_category', 'update category RPC exists');
select has_function('public', 'create_catalog_product', 'create product RPC exists');
select has_function('public', 'update_catalog_product', 'update product RPC exists');
select has_function('public', 'set_product_availability', 'availability RPC exists');
select has_function('public', 'publish_menu_version', 'publish RPC exists');
select has_function('public', 'archive_menu_version', 'archive RPC exists');
select has_function('public', 'get_public_menu_by_slug', 'public menu RPC exists');

select is((select relrowsecurity from pg_class where oid = 'public.menus'::regclass), true, 'menus RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.menus'::regclass), true, 'menus RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.categories'::regclass), true, 'categories RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.categories'::regclass), true, 'categories RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.products'::regclass), true, 'products RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.products'::regclass), true, 'products RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.menu_versions'::regclass), true, 'versions RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.menu_versions'::regclass), true, 'versions RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.menu_version_items'::regclass), true, 'snapshot items RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.menu_version_items'::regclass), true, 'snapshot items RLS forced');

select col_type_is('public', 'products', 'price_cents', 'bigint', 'product price is bigint cents');
select col_has_default('public', 'products', 'available', 'product availability defaults true');
select col_has_default('public', 'menu_versions', 'status', 'draft is the default version status');
select col_not_null('public', 'products', 'organization_id', 'product tenant is required');
select col_not_null('public', 'products', 'unit_id', 'product unit is required');
select col_not_null('public', 'menu_version_items', 'price_cents', 'snapshot price is required');
select ok(exists(select 1 from pg_constraint where conname = 'products_price_cents_check'), 'non-negative product price constraint exists');
select ok(exists(select 1 from pg_constraint where conname = 'menu_version_items_price_cents_check'), 'non-negative snapshot price constraint exists');
select has_index('public', 'products', 'uq_products_unit_sku', 'SKU is unique per unit');
select has_index('public', 'menu_versions', 'uq_menu_versions_one_draft', 'one draft per menu');
select has_index('public', 'menu_versions', 'uq_menu_versions_one_published', 'one published version per menu');

select is((select prosecdef from pg_proc where oid = 'public.publish_menu_version(uuid, uuid, uuid)'::regprocedure), true, 'publish RPC is SECURITY DEFINER');
select is((select 'search_path=pg_catalog, public, private' = any(proconfig) from pg_proc where oid = 'public.publish_menu_version(uuid, uuid, uuid)'::regprocedure), true, 'publish RPC has fixed search_path');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'public.publish_menu_version(uuid, uuid, uuid)'::regprocedure), 'tapajiro_catalog_owner', 'publish RPC has technical owner');
select is((select rolcanlogin from pg_roles where rolname = 'tapajiro_catalog_owner'), false, 'catalog owner cannot login');
select is((select rolinherit from pg_roles where rolname = 'tapajiro_catalog_owner'), false, 'catalog owner does not inherit roles');
select is((select rolsuper from pg_roles where rolname = 'tapajiro_catalog_owner'), false, 'catalog owner is not superuser');
select is((select rolbypassrls from pg_roles where rolname = 'tapajiro_catalog_owner'), true, 'catalog owner bypasses RLS only for RPCs');
select is(pg_catalog.has_function_privilege('anon', 'public.get_public_menu_by_slug(text)', 'EXECUTE'), true, 'anon can execute only public menu RPC');
select is(pg_catalog.has_function_privilege('anon', 'public.publish_menu_version(uuid, uuid, uuid)', 'EXECUTE'), false, 'anon cannot execute publish RPC');
select is(pg_catalog.has_function_privilege('service_role', 'public.publish_menu_version(uuid, uuid, uuid)', 'EXECUTE'), false, 'service_role has no direct publish grant');
select table_privs_are('public', 'products', 'authenticated', array['SELECT'], 'authenticated can only select products');
select table_privs_are('public', 'products', 'anon', array[]::text[], 'anon has no product privileges');
select table_privs_are('public', 'menu_version_items', 'anon', array[]::text[], 'anon has no snapshot table privileges');
select is((select count(*)::int from pg_policy where polrelid in ('public.menus'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.menu_versions'::regclass, 'public.menu_version_items'::regclass)), 5, 'all catalog tables have one internal select policy');

insert into public.organizations (id, legal_name, trade_name, document_type)
values
  ('00000000-0000-0000-0000-000000000801', 'Catalog Org A', 'Catalog A', 'other'),
  ('00000000-0000-0000-0000-000000000802', 'Catalog Org B', 'Catalog B', 'other');

insert into public.units (id, organization_id, name, public_name, slug)
values
  ('00000000-0000-0000-0000-000000000811', '00000000-0000-0000-0000-000000000801', 'Catalog Unit A', 'Catalog Unit A', 'catalog-a'),
  ('00000000-0000-0000-0000-000000000812', '00000000-0000-0000-0000-000000000802', 'Catalog Unit B', 'Catalog Unit B', 'catalog-b');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000821', 'catalog-a@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000822', 'catalog-b@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000823', 'catalog-suspended@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now());

insert into public.roles (id, organization_id, name, is_system)
values
  ('00000000-0000-0000-0000-000000000831', '00000000-0000-0000-0000-000000000801', 'Catalog Manager A', false),
  ('00000000-0000-0000-0000-000000000832', '00000000-0000-0000-0000-000000000802', 'Catalog Manager B', false);

insert into public.permissions (id, key, description, risk_level)
values
  ('00000000-0000-0000-0000-000000000841', 'catalog.read', 'Read catalog', 'low'),
  ('00000000-0000-0000-0000-000000000842', 'catalog.manage', 'Manage catalog', 'high'),
  ('00000000-0000-0000-0000-000000000843', 'catalog.publish', 'Publish catalog', 'high')
on conflict (key) do update set description = excluded.description, risk_level = excluded.risk_level;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000831', id from public.permissions where key in ('catalog.read', 'catalog.manage', 'catalog.publish')
union all
select '00000000-0000-0000-0000-000000000832', id from public.permissions where key in ('catalog.read', 'catalog.manage', 'catalog.publish');

insert into public.memberships (id, organization_id, profile_id, role_id, status)
values
  ('00000000-0000-0000-0000-000000000851', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000821', '00000000-0000-0000-0000-000000000831', 'active'),
  ('00000000-0000-0000-0000-000000000852', '00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000822', '00000000-0000-0000-0000-000000000832', 'active'),
  ('00000000-0000-0000-0000-000000000853', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000823', '00000000-0000-0000-0000-000000000831', 'suspended');

insert into public.membership_units (membership_id, organization_id, unit_id)
values
  ('00000000-0000-0000-0000-000000000851', '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811'),
  ('00000000-0000-0000-0000-000000000852', '00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000812');

set local role to 'authenticated';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000821', true);

select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', 'catalog.manage'), true, 'authorized manager has catalog permission');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000812', 'catalog.manage'), false, 'manager cannot cross tenant');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', 'catalog.publish'), true, 'authorized manager can publish');

select public.create_menu_draft('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811') is not null;
select public.create_catalog_category('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', 'Lanches', 'Cardápio principal', 1) is not null;
select public.create_catalog_product('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', (select id from public.categories limit 1), 'X Tapajós', 'Produto sintético', 2590, true, 1, 'XTAP-01') is not null;

select throws_ok($$ select public.create_catalog_product('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000812', gen_random_uuid(), 'Cross', null, 100, true, 1, null) $$, '42501', null, 'RPC denies cross-tenant product creation');
select throws_ok($$ insert into public.products (organization_id, unit_id, category_id, name, price_cents) values ('00000000-0000-0000-0000-000000000802', '00000000-0000-0000-0000-000000000812', gen_random_uuid(), 'Direct', 100) $$, '42501', null, 'direct product insert is denied');
select results_eq($$ select count(*)::int from public.products where organization_id = '00000000-0000-0000-0000-000000000801' $$, $$ values (1::int) $$, 'authorized member reads own catalog');
select results_eq($$ select count(*)::int from public.products where organization_id = '00000000-0000-0000-0000-000000000802' $$, $$ values (0::int) $$, 'authorized member cannot read another organization catalog');

select public.publish_menu_version('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', (select id from public.menu_versions where status = 'draft')) is not null;
select is((select status from public.menus limit 1), 'published', 'menu becomes published');
select is((select count(*)::int from public.menu_version_items), 1, 'published snapshot has one item');
select is((select price_cents from public.menu_version_items limit 1), 2590::bigint, 'snapshot preserves price cents');
select is((select available from public.menu_version_items limit 1), true, 'snapshot preserves availability');
select throws_ok($$ update public.menu_version_items set product_name = 'Tampered' $$, '42501', null, 'snapshot item cannot be edited');
select throws_ok($$ select public.publish_menu_version('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', (select current_version_id from public.menus limit 1)) $$, '40001', null, 'published version cannot be published twice');

select public.set_product_availability('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', (select id from public.products limit 1), false, null) is not null;
select is((select count(*)::int from public.menu_versions where status = 'draft'), 1, 'availability edit creates a new draft');
select is((select available from public.menu_version_items limit 1), true, 'old published snapshot remains unchanged');
select throws_ok($$ select public.archive_menu_version('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000811', (select current_version_id from public.menus limit 1)) $$, '23514', null, 'current published version cannot be archived');

select results_eq($$ select category_name, product_name, price_cents, available from public.get_public_menu_by_slug('CATALOG-A') $$, $$ values ('Lanches'::text, 'X Tapajós'::text, 2590::bigint, true) $$, 'public RPC returns only published snapshot');
select results_eq($$ select count(*)::int from public.get_public_menu_by_slug('catalog-b') $$, $$ values (0::int) $$, 'unpublished tenant has no public menu');
select results_eq($$ select count(*)::int from public.menu_version_items where organization_id = '00000000-0000-0000-0000-000000000802' $$, $$ values (0::int) $$, 'authenticated cannot read another organization snapshot');

reset role;
set local role to 'anon';
select throws_ok($$ select count(*)::int from public.products $$, '42501', null, 'anon cannot read products table');
select is(pg_catalog.has_function_privilege('anon', 'public.get_public_menu_by_slug(text)', 'EXECUTE'), true, 'anon retains only public snapshot function');
select is((select count(*)::int from public.get_public_menu_by_slug('catalog-a')), 1, 'anon can read published snapshot through RPC');
reset role;

select is((select count(*)::int from pg_trigger where tgname = 'menu_version_items_immutable'), 1, 'snapshot immutability trigger exists');
select is((select count(*)::int from pg_policy p join pg_roles r on r.oid = any(p.polroles) where p.polrelid in ('public.menus'::regclass, 'public.categories'::regclass, 'public.products'::regclass, 'public.menu_versions'::regclass, 'public.menu_version_items'::regclass) and r.rolname = 'anon'), 0, 'no catalog policy targets anon');

rollback;
