-- F2.2F — Roles and permissions foundation tests
-- Requer pgTAP carregado pelo Supabase CLI no contexto de teste.
-- Fixtures são sintéticas e revertidas pelo rollback final.

begin;

select plan(99);

-- 1. Migration e tabelas
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_roles_permissions'
  ),
  'migration identity_roles_permissions applied'
);
select has_table('public', 'roles', 'table roles exists');
select has_table('public', 'permissions', 'table permissions exists');
select has_table('public', 'role_permissions', 'table role_permissions exists');

-- 2. Schema exato
select columns_are('public', 'roles', array[
  'id', 'organization_id', 'name', 'system_key', 'is_system', 'active',
  'created_at', 'updated_at'
], 'roles has exactly 8 columns');
select columns_are('public', 'permissions', array[
  'id', 'key', 'description', 'risk_level', 'active'
], 'permissions has exactly 5 columns');
select columns_are('public', 'role_permissions', array[
  'role_id', 'permission_id', 'created_at', 'created_by'
], 'role_permissions has exactly 4 columns');

-- 3. Types
select col_type_is('public', 'roles', 'id', 'uuid', 'roles.id is uuid');
select col_type_is('public', 'roles', 'organization_id', 'uuid', 'roles.organization_id is uuid');
select col_type_is('public', 'roles', 'name', 'text', 'roles.name is text');
select col_type_is('public', 'roles', 'system_key', 'text', 'roles.system_key is text');
select col_type_is('public', 'roles', 'is_system', 'boolean', 'roles.is_system is boolean');
select col_type_is('public', 'roles', 'active', 'boolean', 'roles.active is boolean');
select col_type_is('public', 'roles', 'created_at', 'timestamp with time zone', 'roles.created_at is timestamptz');
select col_type_is('public', 'roles', 'updated_at', 'timestamp with time zone', 'roles.updated_at is timestamptz');
select col_type_is('public', 'permissions', 'id', 'uuid', 'permissions.id is uuid');
select col_type_is('public', 'permissions', 'key', 'text', 'permissions.key is text');
select col_type_is('public', 'permissions', 'description', 'text', 'permissions.description is text');
select col_type_is('public', 'permissions', 'risk_level', 'text', 'permissions.risk_level is text');
select col_type_is('public', 'permissions', 'active', 'boolean', 'permissions.active is boolean');
select col_type_is('public', 'role_permissions', 'role_id', 'uuid', 'role_permissions.role_id is uuid');
select col_type_is('public', 'role_permissions', 'permission_id', 'uuid', 'role_permissions.permission_id is uuid');
select col_type_is('public', 'role_permissions', 'created_at', 'timestamp with time zone', 'role_permissions.created_at is timestamptz');
select col_type_is('public', 'role_permissions', 'created_by', 'uuid', 'role_permissions.created_by is uuid');

-- 4. Nullability and defaults
select col_not_null('public', 'roles', 'id', 'roles.id not null');
select col_is_null('public', 'roles', 'organization_id', 'roles.organization_id nullable');
select col_not_null('public', 'roles', 'name', 'roles.name not null');
select col_is_null('public', 'roles', 'system_key', 'roles.system_key nullable');
select col_not_null('public', 'roles', 'is_system', 'roles.is_system not null');
select col_not_null('public', 'roles', 'active', 'roles.active not null');
select col_not_null('public', 'roles', 'created_at', 'roles.created_at not null');
select col_not_null('public', 'roles', 'updated_at', 'roles.updated_at not null');
select col_not_null('public', 'permissions', 'id', 'permissions.id not null');
select col_not_null('public', 'permissions', 'key', 'permissions.key not null');
select col_not_null('public', 'permissions', 'description', 'permissions.description not null');
select col_not_null('public', 'permissions', 'risk_level', 'permissions.risk_level not null');
select col_not_null('public', 'permissions', 'active', 'permissions.active not null');
select col_not_null('public', 'role_permissions', 'role_id', 'role_permissions.role_id not null');
select col_not_null('public', 'role_permissions', 'permission_id', 'role_permissions.permission_id not null');
select col_not_null('public', 'role_permissions', 'created_at', 'role_permissions.created_at not null');
select col_is_null('public', 'role_permissions', 'created_by', 'role_permissions.created_by nullable');
select col_has_default('public', 'roles', 'id', 'roles.id has uuid default');
select col_has_default('public', 'roles', 'is_system', 'roles.is_system has default');
select col_has_default('public', 'roles', 'active', 'roles.active has default');
select col_has_default('public', 'roles', 'created_at', 'roles.created_at has default');
select col_has_default('public', 'roles', 'updated_at', 'roles.updated_at has default');
select col_has_default('public', 'permissions', 'id', 'permissions.id has uuid default');
select col_has_default('public', 'permissions', 'active', 'permissions.active has default');
select col_has_default('public', 'role_permissions', 'created_at', 'role_permissions.created_at has default');

-- 5. Primary and foreign keys
select col_is_pk('public', 'roles', 'id', 'roles.id is primary key');
select col_is_pk('public', 'permissions', 'id', 'permissions.id is primary key');
select col_is_pk('public', 'role_permissions', 'role_id', 'role_permissions.role_id is part of primary key');
select col_is_fk('public', 'roles', 'organization_id', 'roles.organization_id is foreign key');
select col_is_fk('public', 'role_permissions', 'role_id', 'role_permissions.role_id is foreign key');
select col_is_fk('public', 'role_permissions', 'permission_id', 'role_permissions.permission_id is foreign key');
select col_is_fk('public', 'role_permissions', 'created_by', 'role_permissions.created_by is foreign key');
select results_eq(
  $$ select rc.delete_rule from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on tc.constraint_name = rc.constraint_name
      and tc.table_schema = 'public' and tc.table_name = 'roles'
     where tc.constraint_name = 'roles_organization_id_fkey' $$,
  $$ values ('RESTRICT'::text) $$,
  'roles organization FK is ON DELETE RESTRICT'
);
select results_eq(
  $$ select array_agg(rc.delete_rule order by tc.constraint_name)
     from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on tc.constraint_name = rc.constraint_name
      and tc.table_schema = 'public' and tc.table_name = 'role_permissions' $$,
  $$ values (array['SET NULL', 'RESTRICT', 'CASCADE']::text[]) $$,
  'role_permissions has cascade, restrict and set null FKs'
);

-- 6. Fixtures sintéticas, inseridas pela conexão administrativa
insert into public.organizations (id, legal_name, trade_name, document_type)
values ('00000000-0000-0000-0000-000000000251', 'RBAC Org Legal', 'RBAC Org', 'other');

insert into public.roles (id, organization_id, name)
values ('00000000-0000-0000-0000-000000000252', '00000000-0000-0000-0000-000000000251', 'Operador');

insert into public.roles (id, name, system_key, is_system)
values ('00000000-0000-0000-0000-000000000253', 'Proprietário', 'owner', true);

insert into public.permissions (id, key, description, risk_level)
values ('00000000-0000-0000-0000-000000000254', 'team.read', 'Ler equipe', 'medium');

insert into public.role_permissions (role_id, permission_id)
values ('00000000-0000-0000-0000-000000000252', '00000000-0000-0000-0000-000000000254');

-- 7. Defaults e constraints
select is((select is_system from public.roles where id = '00000000-0000-0000-0000-000000000252'), false, 'custom role defaults to non-system');
select is((select active from public.roles where id = '00000000-0000-0000-0000-000000000252'), true, 'role defaults active');
select is((select active from public.permissions where id = '00000000-0000-0000-0000-000000000254'), true, 'permission defaults active');
select ok((select created_at is not null and updated_at is not null from public.roles where id = '00000000-0000-0000-0000-000000000252'), 'role timestamps populated');
select ok((select created_at is not null from public.role_permissions where role_id = '00000000-0000-0000-0000-000000000252'), 'role_permissions timestamp populated');
select throws_ok($$ insert into public.roles (organization_id, name) values ('00000000-0000-0000-0000-000000000251', 'X') $$, '23514', null, 'rejects short role name');
select throws_ok($$ insert into public.permissions (key, description, risk_level) values ('invalid', 'Invalid', 'low') $$, '23514', null, 'rejects invalid permission key');
select throws_ok($$ insert into public.permissions (key, description, risk_level) values ('team.read', 'Duplicate', 'low') $$, '23505', null, 'rejects duplicate permission key');
select throws_ok($$ insert into public.roles (organization_id, name, system_key, is_system) values ('00000000-0000-0000-0000-000000000251', 'Invalid', 'owner', false) $$, '23514', null, 'rejects system key on custom role');
select throws_ok($$ insert into public.roles (name, is_system) values ('Invalid', true) $$, '23514', null, 'rejects system role without system key');
select throws_ok($$ insert into public.roles (name, system_key, is_system) values ('Invalid', 'not-a-system-key', true) $$, '23514', null, 'rejects unknown system key');
select throws_ok($$ insert into public.role_permissions (role_id, permission_id) values ('00000000-0000-0000-0000-000000000252', '00000000-0000-0000-0000-000000000254') $$, '23505', null, 'rejects duplicate role permission');
select throws_ok($$ insert into public.role_permissions (role_id, permission_id) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000254') $$, '23503', null, 'role_permissions requires existing role');
select throws_ok($$ insert into public.role_permissions (role_id, permission_id) values ('00000000-0000-0000-0000-000000000252', gen_random_uuid()) $$, '23503', null, 'role_permissions requires existing permission');
select throws_ok($$ insert into public.roles (organization_id, name) values (gen_random_uuid(), 'Orphan') $$, '23503', null, 'role cannot reference missing organization');

-- 8. RLS and grants: no policies before memberships
select is((select relrowsecurity from pg_class where oid = 'public.roles'::regclass), true, 'roles RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.roles'::regclass), true, 'roles RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.permissions'::regclass), true, 'permissions RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.permissions'::regclass), true, 'permissions RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.role_permissions'::regclass), true, 'role_permissions RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.role_permissions'::regclass), true, 'role_permissions RLS forced');
select results_eq($$ select count(*)::int from pg_policy where polrelid in ('public.roles'::regclass, 'public.permissions'::regclass, 'public.role_permissions'::regclass) $$, $$ values (0::int) $$, 'RBAC tables have no policies before memberships');
select table_privs_are('public', 'roles', 'anon', array[]::text[], 'anon has no privileges on roles');
select table_privs_are('public', 'roles', 'authenticated', array[]::text[], 'authenticated has no privileges on roles');
select table_privs_are('public', 'permissions', 'anon', array[]::text[], 'anon has no privileges on permissions');
select table_privs_are('public', 'permissions', 'authenticated', array[]::text[], 'authenticated has no privileges on permissions');
select table_privs_are('public', 'role_permissions', 'anon', array[]::text[], 'anon has no privileges on role_permissions');
select table_privs_are('public', 'role_permissions', 'authenticated', array[]::text[], 'authenticated has no privileges on role_permissions');

set local role to 'anon';
select throws_ok($$ select count(*)::int from public.roles $$, '42501', null, 'anon cannot select roles');
select throws_ok($$ select count(*)::int from public.permissions $$, '42501', null, 'anon cannot select permissions');
select throws_ok($$ select count(*)::int from public.role_permissions $$, '42501', null, 'anon cannot select role_permissions');
reset role;

set local role to 'authenticated';
select throws_ok($$ select count(*)::int from public.roles $$, '42501', null, 'authenticated cannot select roles before memberships');
select throws_ok($$ select count(*)::int from public.permissions $$, '42501', null, 'authenticated cannot select permissions before memberships');
select throws_ok($$ select count(*)::int from public.role_permissions $$, '42501', null, 'authenticated cannot select role_permissions before memberships');
reset role;

-- 9. Escopo: memberships e entidades financeiras não são criadas
select hasnt_table('public', 'memberships', 'memberships not created in this migration');
select hasnt_table('public', 'membership_units', 'membership_units not created in this migration');
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

rollback;
