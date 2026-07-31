-- F2.2E-A — Organizations and Units Tests
-- Requer pgTAP (carregado pelo Supabase CLI no contexto de teste).
-- Fixtures sintéticas são revertidas pelo rollback final.
-- Não há memberships/RBAC nesta etapa; RLS permanece deny-by-default.

begin;

select plan(108);

-- 1. Migration e tabelas
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_organizations_units'
  ),
  'migration identity_organizations_units applied'
);
select has_table('public', 'organizations', 'table organizations exists');
select has_table('public', 'units', 'table units exists');

-- 2. Schema exato
select columns_are('public', 'organizations', array[
  'id', 'legal_name', 'trade_name', 'document_type', 'document_normalized',
  'status', 'default_currency', 'created_at', 'updated_at', 'version'
], 'organizations has exactly 10 columns');

select columns_are('public', 'units', array[
  'id', 'organization_id', 'name', 'public_name', 'slug', 'timezone',
  'phone_normalized', 'email_normalized', 'status', 'pause_reason',
  'pause_until', 'street', 'number', 'district', 'city', 'state_code',
  'postal_code', 'latitude', 'longitude', 'created_at', 'updated_at', 'version'
], 'units has exactly 22 columns');

-- 3. Types
select col_type_is('public', 'organizations', 'id', 'uuid', 'organizations.id is uuid');
select col_type_is('public', 'organizations', 'legal_name', 'text', 'organizations.legal_name is text');
select col_type_is('public', 'organizations', 'trade_name', 'text', 'organizations.trade_name is text');
select col_type_is('public', 'organizations', 'document_type', 'text', 'organizations.document_type is text');
select col_type_is('public', 'organizations', 'document_normalized', 'text', 'organizations.document_normalized is text');
select col_type_is('public', 'organizations', 'status', 'text', 'organizations.status is text');
select col_type_is('public', 'organizations', 'default_currency', 'character', 'organizations.default_currency is char(3)');
select col_type_is('public', 'organizations', 'created_at', 'timestamp with time zone', 'organizations.created_at is timestamptz');
select col_type_is('public', 'organizations', 'updated_at', 'timestamp with time zone', 'organizations.updated_at is timestamptz');
select col_type_is('public', 'organizations', 'version', 'integer', 'organizations.version is integer');
select col_type_is('public', 'units', 'id', 'uuid', 'units.id is uuid');
select col_type_is('public', 'units', 'organization_id', 'uuid', 'units.organization_id is uuid');
select col_type_is('public', 'units', 'name', 'text', 'units.name is text');
select col_type_is('public', 'units', 'public_name', 'text', 'units.public_name is text');
select col_type_is('public', 'units', 'slug', 'text', 'units.slug is text');
select col_type_is('public', 'units', 'timezone', 'text', 'units.timezone is text');
select col_type_is('public', 'units', 'latitude', 'numeric', 'units.latitude is numeric');
select col_type_is('public', 'units', 'longitude', 'numeric', 'units.longitude is numeric');
select col_type_is('public', 'units', 'version', 'integer', 'units.version is integer');

-- 4. Nullability and defaults
select col_not_null('public', 'organizations', 'id', 'organizations.id not null');
select col_not_null('public', 'organizations', 'legal_name', 'organizations.legal_name not null');
select col_not_null('public', 'organizations', 'trade_name', 'organizations.trade_name not null');
select col_not_null('public', 'organizations', 'document_type', 'organizations.document_type not null');
select col_is_null('public', 'organizations', 'document_normalized', 'organizations.document_normalized nullable');
select col_not_null('public', 'organizations', 'status', 'organizations.status not null');
select col_not_null('public', 'organizations', 'default_currency', 'organizations.default_currency not null');
select col_not_null('public', 'organizations', 'created_at', 'organizations.created_at not null');
select col_not_null('public', 'organizations', 'updated_at', 'organizations.updated_at not null');
select col_not_null('public', 'organizations', 'version', 'organizations.version not null');
select col_has_default('public', 'organizations', 'id', 'organizations.id has uuid default');
select col_has_default('public', 'organizations', 'document_type', 'organizations.document_type has default');
select col_has_default('public', 'organizations', 'status', 'organizations.status has default');
select col_has_default('public', 'organizations', 'default_currency', 'organizations.default_currency has default');
select col_has_default('public', 'organizations', 'created_at', 'organizations.created_at has default');
select col_has_default('public', 'organizations', 'updated_at', 'organizations.updated_at has default');
select col_has_default('public', 'organizations', 'version', 'organizations.version has default');
select col_not_null('public', 'units', 'organization_id', 'units.organization_id not null');
select col_not_null('public', 'units', 'name', 'units.name not null');
select col_not_null('public', 'units', 'public_name', 'units.public_name not null');
select col_not_null('public', 'units', 'slug', 'units.slug not null');
select col_not_null('public', 'units', 'timezone', 'units.timezone not null');
select col_is_null('public', 'units', 'pause_reason', 'units.pause_reason nullable');
select col_is_null('public', 'units', 'latitude', 'units.latitude nullable');
select col_is_null('public', 'units', 'longitude', 'units.longitude nullable');
select col_has_default('public', 'units', 'id', 'units.id has uuid default');
select col_has_default('public', 'units', 'timezone', 'units.timezone has default');
select col_has_default('public', 'units', 'status', 'units.status has default');
select col_has_default('public', 'units', 'created_at', 'units.created_at has default');
select col_has_default('public', 'units', 'updated_at', 'units.updated_at has default');
select col_has_default('public', 'units', 'version', 'units.version has default');

-- 5. Primary and foreign keys
select col_is_pk('public', 'organizations', 'id', 'organizations.id is primary key');
select col_is_pk('public', 'units', 'id', 'units.id is primary key');
select col_is_fk('public', 'units', 'organization_id', 'units.organization_id is foreign key');
select results_eq(
  $$ select rc.delete_rule from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on tc.constraint_name = rc.constraint_name
      and tc.table_schema = 'public' and tc.table_name = 'units'
     where tc.constraint_type = 'FOREIGN KEY' $$,
  $$ values ('RESTRICT'::text) $$,
  'units organization FK is ON DELETE RESTRICT'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid = 'public.units'::regclass
      and contype = 'u'
      and conname = 'uq_units_organization_id_id'
  ),
  'units has unique (organization_id, id) for composite FKs'
);

-- 6. Fixtures sintéticas
insert into public.organizations (id, legal_name, trade_name, document_type, document_normalized)
values
  ('00000000-0000-0000-0000-000000000201', 'Org A Legal', 'Org A', 'cnpj', '12345678000190'),
  ('00000000-0000-0000-0000-000000000202', 'Org B Legal', 'Org B', 'cpf', '12345678901');

insert into public.units (id, organization_id, name, public_name, slug)
values
  ('00000000-0000-0000-0000-000000000211', '00000000-0000-0000-0000-000000000201', 'Unidade A', 'A Público', 'org-a'),
  ('00000000-0000-0000-0000-000000000212', '00000000-0000-0000-0000-000000000202', 'Unidade B', 'B Público', 'org-b');

-- 7. Defaults e valores válidos
select is((select status from public.organizations where id = '00000000-0000-0000-0000-000000000201'), 'trial', 'organization default status is trial');
select is((select default_currency from public.organizations where id = '00000000-0000-0000-0000-000000000201'), 'BRL', 'organization default currency is BRL');
select is((select status from public.units where id = '00000000-0000-0000-0000-000000000211'), 'active', 'unit default status is active');
select is((select timezone from public.units where id = '00000000-0000-0000-0000-000000000211'), 'America/Santarem', 'unit default timezone is America/Santarem');
select ok((select created_at is not null and updated_at is not null from public.organizations where id = '00000000-0000-0000-0000-000000000201'), 'organization timestamps populated');
select ok((select created_at is not null and updated_at is not null from public.units where id = '00000000-0000-0000-0000-000000000211'), 'unit timestamps populated');

-- 8. Constraints de nome, status, version, slug e campos normalizados
select throws_ok($$ insert into public.organizations (legal_name, trade_name) values ('X', 'Valid') $$, '23514', null, 'rejects short legal_name');
select throws_ok($$ insert into public.organizations (legal_name, trade_name) values ('Valid', repeat('X', 121)) $$, '23514', null, 'rejects long trade_name');
select throws_ok($$ insert into public.organizations (legal_name, trade_name, document_type) values ('Valid', 'Valid', 'invalid') $$, '23514', null, 'rejects invalid document_type');
select throws_ok($$ insert into public.organizations (legal_name, trade_name, document_normalized) values ('Valid', 'Valid', 'abc') $$, '23514', null, 'rejects non-digit document');
select throws_ok($$ insert into public.organizations (legal_name, trade_name, status) values ('Valid', 'Valid', 'invalid') $$, '23514', null, 'rejects invalid organization status');
select throws_ok($$ insert into public.organizations (legal_name, trade_name, version) values ('Valid', 'Valid', 0) $$, '23514', null, 'rejects non-positive organization version');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'AB_') $$, '23514', null, 'rejects invalid slug');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug) values ('00000000-0000-0000-0000-000000000201', 'X', 'Valid', 'valid') $$, '23514', null, 'rejects short unit name');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, status) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 'invalid') $$, '23514', null, 'rejects invalid unit status');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, status) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 'paused') $$, '23514', null, 'paused unit requires pause_reason');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, version) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 0) $$, '23514', null, 'rejects non-positive unit version');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, latitude) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 91) $$, '23514', null, 'rejects latitude outside range');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, phone_normalized) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 'not-phone') $$, '23514', null, 'rejects invalid phone');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug, email_normalized) values ('00000000-0000-0000-0000-000000000201', 'Valid', 'Valid', 'valid-unit', 'UPPER@TEST.COM') $$, '23514', null, 'rejects uppercase email');

-- 9. Unicidade e isolamento estrutural
select throws_ok($$ insert into public.organizations (legal_name, trade_name, document_normalized) values ('Duplicate', 'Duplicate', '12345678000190') $$, '23505', null, 'active organizations reject duplicate document');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug) values ('00000000-0000-0000-0000-000000000201', 'Duplicate', 'Duplicate', 'ORG-A') $$, '23505', null, 'active units reject duplicate slug case-insensitively');
select throws_ok($$ insert into public.units (organization_id, name, public_name, slug) values ('00000000-0000-0000-0000-000000000299', 'Orphan', 'Orphan', 'orphan') $$, '23503', null, 'unit cannot reference missing organization');
select throws_ok($$ delete from public.organizations where id = '00000000-0000-0000-0000-000000000201' $$, '23503', null, 'organization cannot be deleted while it has units');
select ok(
  exists(
    select 1 from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where i.indrelid = 'public.units'::regclass and c.relname = 'idx_units_slug'
  ),
  'units has slug lookup index'
);

-- 10. RLS e grants: sem policies e sem acesso para clientes
select is((select relrowsecurity from pg_class where oid = 'public.organizations'::regclass), true, 'organizations RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.organizations'::regclass), true, 'organizations RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.units'::regclass), true, 'units RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.units'::regclass), true, 'units RLS forced');
select results_eq($$ select count(*)::int from pg_policy where polrelid in ('public.organizations'::regclass, 'public.units'::regclass) $$, $$ values (0::int) $$, 'organizations and units have no policies before memberships');
select table_privs_are('public', 'organizations', 'anon', array[]::text[], 'anon has no privileges on organizations');
select table_privs_are('public', 'organizations', 'authenticated', array[]::text[], 'authenticated has no privileges on organizations');
select table_privs_are('public', 'units', 'anon', array[]::text[], 'anon has no privileges on units');
select table_privs_are('public', 'units', 'authenticated', array[]::text[], 'authenticated has no privileges on units');

set local role to 'anon';
select throws_ok($$ select count(*)::int from public.organizations $$, '42501', null, 'anon cannot select organizations');
select throws_ok($$ select count(*)::int from public.units $$, '42501', null, 'anon cannot select units');
reset role;

set local role to 'authenticated';
select throws_ok($$ select count(*)::int from public.organizations $$, '42501', null, 'authenticated cannot select organizations before membership');
select throws_ok($$ select count(*)::int from public.units $$, '42501', null, 'authenticated cannot select units before membership');
reset role;

-- 11. Fora do escopo e tabelas financeiras proibidas
select hasnt_table('public', 'memberships', 'memberships not created in this migration');
select hasnt_table('public', 'membership_units', 'membership_units not created in this migration');
select hasnt_table('public', 'roles', 'roles not created in this migration');
select hasnt_table('public', 'permissions', 'permissions not created in this migration');
select hasnt_table('public', 'role_permissions', 'role_permissions not created in this migration');
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

rollback;
