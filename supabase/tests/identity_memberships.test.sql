-- F2.2G-A.1 — Memberships structure tests
-- Requer pgTAP carregado pelo Supabase CLI no contexto de teste.
-- Fixtures são sintéticas e revertidas pelo rollback final.
-- Policies e helpers permanecem fora desta migration.

begin;

select plan(92);

-- 1. Migration e tabelas
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_memberships'
  ),
  'migration identity_memberships applied'
);
select has_table('public', 'memberships', 'table memberships exists');
select has_table('public', 'membership_units', 'table membership_units exists');

-- 2. Schema exato
select columns_are('public', 'memberships', array[
  'id', 'organization_id', 'profile_id', 'role_id', 'status', 'all_units',
  'joined_at', 'created_at', 'updated_at', 'version'
], 'memberships has exactly 10 columns');
select columns_are('public', 'membership_units', array[
  'membership_id', 'organization_id', 'unit_id', 'created_at'
], 'membership_units has exactly 4 columns');

-- 3. Types
select col_type_is('public', 'memberships', 'id', 'uuid', 'memberships.id is uuid');
select col_type_is('public', 'memberships', 'organization_id', 'uuid', 'memberships.organization_id is uuid');
select col_type_is('public', 'memberships', 'profile_id', 'uuid', 'memberships.profile_id is uuid');
select col_type_is('public', 'memberships', 'role_id', 'uuid', 'memberships.role_id is uuid');
select col_type_is('public', 'memberships', 'status', 'text', 'memberships.status is text');
select col_type_is('public', 'memberships', 'all_units', 'boolean', 'memberships.all_units is boolean');
select col_type_is('public', 'memberships', 'joined_at', 'timestamp with time zone', 'memberships.joined_at is timestamptz');
select col_type_is('public', 'memberships', 'created_at', 'timestamp with time zone', 'memberships.created_at is timestamptz');
select col_type_is('public', 'memberships', 'updated_at', 'timestamp with time zone', 'memberships.updated_at is timestamptz');
select col_type_is('public', 'memberships', 'version', 'integer', 'memberships.version is integer');
select col_type_is('public', 'membership_units', 'membership_id', 'uuid', 'membership_units.membership_id is uuid');
select col_type_is('public', 'membership_units', 'organization_id', 'uuid', 'membership_units.organization_id is uuid');
select col_type_is('public', 'membership_units', 'unit_id', 'uuid', 'membership_units.unit_id is uuid');
select col_type_is('public', 'membership_units', 'created_at', 'timestamp with time zone', 'membership_units.created_at is timestamptz');

-- 4. Nullability and defaults
select col_not_null('public', 'memberships', 'id', 'memberships.id not null');
select col_not_null('public', 'memberships', 'organization_id', 'memberships.organization_id not null');
select col_not_null('public', 'memberships', 'profile_id', 'memberships.profile_id not null');
select col_not_null('public', 'memberships', 'role_id', 'memberships.role_id not null');
select col_not_null('public', 'memberships', 'status', 'memberships.status not null');
select col_not_null('public', 'memberships', 'all_units', 'memberships.all_units not null');
select col_is_null('public', 'memberships', 'joined_at', 'memberships.joined_at nullable');
select col_not_null('public', 'memberships', 'created_at', 'memberships.created_at not null');
select col_not_null('public', 'memberships', 'updated_at', 'memberships.updated_at not null');
select col_not_null('public', 'memberships', 'version', 'memberships.version not null');
select col_not_null('public', 'membership_units', 'membership_id', 'membership_units.membership_id not null');
select col_not_null('public', 'membership_units', 'organization_id', 'membership_units.organization_id not null');
select col_not_null('public', 'membership_units', 'unit_id', 'membership_units.unit_id not null');
select col_not_null('public', 'membership_units', 'created_at', 'membership_units.created_at not null');
select col_has_default('public', 'memberships', 'id', 'memberships.id has uuid default');
select col_has_default('public', 'memberships', 'status', 'memberships.status has default');
select col_has_default('public', 'memberships', 'all_units', 'memberships.all_units has default');
select col_has_default('public', 'memberships', 'created_at', 'memberships.created_at has default');
select col_has_default('public', 'memberships', 'updated_at', 'memberships.updated_at has default');
select col_has_default('public', 'memberships', 'version', 'memberships.version has default');
select col_has_default('public', 'membership_units', 'created_at', 'membership_units.created_at has default');

-- 5. Primary keys, foreign keys and delete rules
select col_is_pk('public', 'memberships', 'id', 'memberships.id is primary key');
select col_is_pk('public', 'membership_units', 'membership_id', 'membership_units.membership_id is part of primary key');
select col_is_pk('public', 'membership_units', 'unit_id', 'membership_units.unit_id is part of primary key');
select col_is_fk('public', 'memberships', 'organization_id', 'memberships.organization_id is foreign key');
select col_is_fk('public', 'memberships', 'profile_id', 'memberships.profile_id is foreign key');
select col_is_fk('public', 'memberships', 'role_id', 'memberships.role_id is foreign key');
select col_is_fk('public', 'membership_units', 'membership_id', 'membership_units.membership_id is foreign key');
select col_is_fk('public', 'membership_units', 'organization_id', 'membership_units.organization_id participates in foreign keys');
select col_is_fk('public', 'membership_units', 'unit_id', 'membership_units.unit_id participates in foreign key');
select results_eq(
  $$ select rc.delete_rule from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on tc.constraint_name = rc.constraint_name
      and tc.table_schema = 'public' and tc.table_name = 'memberships'
     order by tc.constraint_name $$,
  $$ values ('RESTRICT'::text), ('CASCADE'::text), ('RESTRICT'::text) $$,
  'memberships FKs have cascade and restrict delete rules'
);
select results_eq(
  $$ select array_agg(rc.delete_rule order by tc.constraint_name)
     from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on tc.constraint_name = rc.constraint_name
      and tc.table_schema = 'public' and tc.table_name = 'membership_units' $$,
  $$ values (array['CASCADE', 'CASCADE', 'CASCADE']::text[]) $$,
  'membership_units FKs cascade on parent deletion'
);
select ok(
  exists(
    select 1 from pg_constraint
    where conrelid = 'public.memberships'::regclass
      and conname = 'uq_memberships_id_organization_id'
  ),
  'memberships has unique pair for composite foreign key'
);

-- 6. Checks, uniqueness and indexes
select ok(
  exists(select 1 from pg_constraint where conrelid = 'public.memberships'::regclass and conname = 'memberships_status_check'),
  'memberships status check exists'
);
select ok(
  exists(select 1 from pg_constraint where conrelid = 'public.memberships'::regclass and conname = 'memberships_version_check'),
  'memberships version check exists'
);
select ok(
  exists(select 1 from pg_class where relname = 'uq_memberships_organization_profile'),
  'memberships organization/profile unique index exists'
);
select ok(
  exists(select 1 from pg_class where relname = 'idx_memberships_profile_organization_status'),
  'memberships authorization lookup index exists'
);
select ok(
  exists(select 1 from pg_class where relname = 'idx_memberships_organization_status'),
  'memberships organization/status index exists'
);
select ok(
  exists(select 1 from pg_class where relname = 'idx_membership_units_organization_unit'),
  'membership_units organization/unit index exists'
);

-- 7. Synthetic fixtures and structural constraints
insert into public.organizations (id, legal_name, trade_name, document_type)
values
  ('00000000-0000-0000-0000-000000000601', 'Membership Org A', 'Membership A', 'other'),
  ('00000000-0000-0000-0000-000000000602', 'Membership Org B', 'Membership B', 'other');

insert into public.units (id, organization_id, name, public_name, slug)
values
  ('00000000-0000-0000-0000-000000000611', '00000000-0000-0000-0000-000000000601', 'Unit A', 'Unit A', 'membership-a'),
  ('00000000-0000-0000-0000-000000000612', '00000000-0000-0000-0000-000000000602', 'Unit B', 'Unit B', 'membership-b');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000621', 'membership@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now());

delete from public.profiles where id = '00000000-0000-0000-0000-000000000621';
insert into public.profiles (id, full_name, status)
values ('00000000-0000-0000-0000-000000000621', 'Membership User', 'active');

insert into public.roles (id, name, system_key, is_system)
values ('00000000-0000-0000-0000-000000000631', 'Owner', 'owner', true);

insert into public.memberships (id, organization_id, profile_id, role_id)
values ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000631');

insert into public.membership_units (membership_id, organization_id, unit_id)
values ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611');

select is((select status from public.memberships where id = '00000000-0000-0000-0000-000000000641'), 'active', 'membership defaults active');
select is((select all_units from public.memberships where id = '00000000-0000-0000-0000-000000000641'), false, 'membership defaults to restricted units');
select is((select version from public.memberships where id = '00000000-0000-0000-0000-000000000641'), 1, 'membership defaults version one');
select ok((select created_at is not null and updated_at is not null from public.memberships where id = '00000000-0000-0000-0000-000000000641'), 'membership timestamps populated');
select ok((select created_at is not null from public.membership_units where membership_id = '00000000-0000-0000-0000-000000000641'), 'membership_units timestamp populated');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id, status) values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000631', 'expired') $$, '23514', null, 'rejects invalid membership status');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id, version) values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000631', 0) $$, '23514', null, 'rejects non-positive membership version');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id) values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000631') $$, '23505', null, 'rejects duplicate organization/profile membership');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id) values ('00000000-0000-0000-0000-000000000699', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000631') $$, '23503', null, 'membership requires existing organization');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id) values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000699', '00000000-0000-0000-0000-000000000631') $$, '23503', null, 'membership requires existing profile');
select throws_ok($$ insert into public.memberships (organization_id, profile_id, role_id) values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000621', '00000000-0000-0000-0000-000000000699') $$, '23503', null, 'membership requires existing role');
select throws_ok($$ insert into public.membership_units (membership_id, organization_id, unit_id) values ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000611') $$, '23505', null, 'rejects duplicate membership unit');
select throws_ok($$ insert into public.membership_units (membership_id, organization_id, unit_id) values ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000612') $$, '23503', null, 'rejects membership unit organization mismatch');
select throws_ok($$ insert into public.membership_units (membership_id, organization_id, unit_id) values ('00000000-0000-0000-0000-000000000641', '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000612') $$, '23503', null, 'rejects unit from another organization');

-- 8. RLS and deny-by-default
select is((select relrowsecurity from pg_class where oid = 'public.memberships'::regclass), true, 'memberships RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.memberships'::regclass), true, 'memberships RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.membership_units'::regclass), true, 'membership_units RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.membership_units'::regclass), true, 'membership_units RLS forced');
select results_eq($$ select count(*)::int from pg_policy where polrelid in ('public.memberships'::regclass, 'public.membership_units'::regclass) $$, $$ values (0::int) $$, 'membership tables have no policies');
select table_privs_are('public', 'memberships', 'anon', array[]::text[], 'anon has no privileges on memberships');
select table_privs_are('public', 'memberships', 'authenticated', array[]::text[], 'authenticated has no privileges on memberships');
select table_privs_are('public', 'membership_units', 'anon', array[]::text[], 'anon has no privileges on membership_units');
select table_privs_are('public', 'membership_units', 'authenticated', array[]::text[], 'authenticated has no privileges on membership_units');
set local role to 'anon';
select throws_ok($$ select count(*)::int from public.memberships $$, '42501', null, 'anon cannot select memberships');
select throws_ok($$ select count(*)::int from public.membership_units $$, '42501', null, 'anon cannot select membership_units');
reset role;
set local role to 'authenticated';
select throws_ok($$ select count(*)::int from public.memberships $$, '42501', null, 'authenticated cannot select memberships before policies');
select throws_ok($$ select count(*)::int from public.membership_units $$, '42501', null, 'authenticated cannot select membership_units before policies');
reset role;

-- 9. No permanent seed and prohibited financial tables remain absent
select is((select count(*)::int from public.memberships), 1, 'only synthetic membership fixture exists before rollback');
select is((select count(*)::int from public.membership_units), 1, 'only synthetic membership unit fixture exists before rollback');
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

rollback;
