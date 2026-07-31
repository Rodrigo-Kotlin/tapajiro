-- F2.2G-B — Membership authorization and RLS tests
-- Requer pgTAP carregado pelo Supabase CLI no contexto de teste.
-- Fixtures são sintéticas e revertidas pelo rollback final.
-- Nenhum assertion usa service_role; RLS usa SET ROLE + JWT sintético.

begin;

select plan(58);

-- 1. Migration, helpers and trigger
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_membership_authorization'
  ),
  'migration identity_membership_authorization applied'
);
select has_function('private', 'is_active_org_member', 'function is_active_org_member exists');
select has_function('private', 'has_unit_access', 'function has_unit_access exists');
select has_function('private', 'has_permission', 'function has_permission exists');
select has_trigger('public', 'memberships', 'memberships_validate_role_organization', 'role organization validation trigger exists');

-- 2. Exact helper signatures
select ok(to_regprocedure('private.is_active_org_member(uuid, uuid)') is not null, 'is_active_org_member signature is exact');
select ok(to_regprocedure('private.has_unit_access(uuid, uuid, uuid)') is not null, 'has_unit_access signature is exact');
select ok(to_regprocedure('private.has_permission(uuid, uuid, uuid, text)') is not null, 'has_permission signature is exact');

-- 3. SECURITY DEFINER and fixed search_path
select is((select prosecdef from pg_proc where oid = 'private.is_active_org_member(uuid, uuid)'::regprocedure), true, 'is_active_org_member is security definer');
select is((select prosecdef from pg_proc where oid = 'private.has_unit_access(uuid, uuid, uuid)'::regprocedure), true, 'has_unit_access is security definer');
select is((select prosecdef from pg_proc where oid = 'private.has_permission(uuid, uuid, uuid, text)'::regprocedure), true, 'has_permission is security definer');
select is((select 'search_path=pg_catalog, public, private' = any(proconfig) from pg_proc where oid = 'private.is_active_org_member(uuid, uuid)'::regprocedure), true, 'is_active_org_member has fixed search_path');
select is((select 'search_path=pg_catalog, public, private' = any(proconfig) from pg_proc where oid = 'private.has_unit_access(uuid, uuid, uuid)'::regprocedure), true, 'has_unit_access has fixed search_path');
select is((select 'search_path=pg_catalog, public, private' = any(proconfig) from pg_proc where oid = 'private.has_permission(uuid, uuid, uuid, text)'::regprocedure), true, 'has_permission has fixed search_path');

-- 4. Grants and revokes
select is(pg_catalog.has_function_privilege('authenticated', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), true, 'authenticated can execute is_active_org_member');
select is(pg_catalog.has_function_privilege('authenticated', 'private.has_unit_access(uuid, uuid, uuid)', 'EXECUTE'), true, 'authenticated can execute has_unit_access');
select is(pg_catalog.has_function_privilege('authenticated', 'private.has_permission(uuid, uuid, uuid, text)', 'EXECUTE'), true, 'authenticated can execute has_permission');
select is(pg_catalog.has_function_privilege('anon', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), false, 'anon cannot execute is_active_org_member');
select is(pg_catalog.has_function_privilege('anon', 'private.has_unit_access(uuid, uuid, uuid)', 'EXECUTE'), false, 'anon cannot execute has_unit_access');
select is(pg_catalog.has_function_privilege('anon', 'private.has_permission(uuid, uuid, uuid, text)', 'EXECUTE'), false, 'anon cannot execute has_permission');
select is(pg_catalog.has_function_privilege('public', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), false, 'public cannot execute is_active_org_member');
select is(pg_catalog.has_function_privilege('public', 'private.has_unit_access(uuid, uuid, uuid)', 'EXECUTE'), false, 'public cannot execute has_unit_access');
select is(pg_catalog.has_function_privilege('public', 'private.has_permission(uuid, uuid, uuid, text)', 'EXECUTE'), false, 'public cannot execute has_permission');
select is(pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE'), true, 'authenticated can resolve policy helpers');
select is(pg_catalog.has_schema_privilege('anon', 'private', 'USAGE'), false, 'anon cannot use private schema');

-- 5. Policies and table grants
select results_eq(
  $$ select count(*)::int from pg_policy where polrelid in ('public.memberships'::regclass, 'public.membership_units'::regclass) $$,
  $$ values (4::int) $$,
  'exactly four authenticated read policies exist'
);
select has_policy('public', 'memberships', 'memberships_select_own', 'own memberships policy exists');
select has_policy('public', 'memberships', 'memberships_select_team', 'team memberships policy exists');
select has_policy('public', 'membership_units', 'membership_units_select_own', 'own membership_units policy exists');
select has_policy('public', 'membership_units', 'membership_units_select_team', 'team membership_units policy exists');
select is((select count(*)::int
           from pg_policy p
           join pg_roles r on r.oid = any(p.polroles)
          where p.polrelid in ('public.memberships'::regclass, 'public.membership_units'::regclass)
            and r.rolname = 'anon'), 0, 'no membership policy targets anon');
select table_privs_are('public', 'memberships', 'authenticated', array['SELECT'], 'authenticated has only SELECT on memberships');
select table_privs_are('public', 'membership_units', 'authenticated', array['SELECT'], 'authenticated has only SELECT on membership_units');
select table_privs_are('public', 'memberships', 'anon', array[]::text[], 'anon has no privileges on memberships');
select table_privs_are('public', 'membership_units', 'anon', array[]::text[], 'anon has no privileges on membership_units');

-- 6. Synthetic tenant fixtures
insert into public.organizations (id, legal_name, trade_name, document_type)
values
  ('00000000-0000-0000-0000-000000000701', 'Auth Org A', 'Auth A', 'other'),
  ('00000000-0000-0000-0000-000000000702', 'Auth Org B', 'Auth B', 'other');

insert into public.units (id, organization_id, name, public_name, slug)
values
  ('00000000-0000-0000-0000-000000000711', '00000000-0000-0000-0000-000000000701', 'Auth Unit A', 'Auth Unit A', 'auth-a'),
  ('00000000-0000-0000-0000-000000000712', '00000000-0000-0000-0000-000000000702', 'Auth Unit B', 'Auth Unit B', 'auth-b');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000721', 'auth-a@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000722', 'auth-b@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000723', 'auth-c@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000724', 'auth-d@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now());

insert into public.roles (id, organization_id, name, is_system)
values
  ('00000000-0000-0000-0000-000000000731', '00000000-0000-0000-0000-000000000701', 'Custom A', false),
  ('00000000-0000-0000-0000-000000000732', '00000000-0000-0000-0000-000000000702', 'Custom B', false),
  ('00000000-0000-0000-0000-000000000733', null, 'Owner', true);

insert into public.permissions (id, key, description, risk_level)
values
  ('00000000-0000-0000-0000-000000000741', 'team.read', 'Read team', 'medium'),
  ('00000000-0000-0000-0000-000000000742', 'unit.read', 'Read unit', 'low');

insert into public.role_permissions (role_id, permission_id)
values
  ('00000000-0000-0000-0000-000000000731', '00000000-0000-0000-0000-000000000741'),
  ('00000000-0000-0000-0000-000000000731', '00000000-0000-0000-0000-000000000742');

insert into public.memberships (id, organization_id, profile_id, role_id, status)
values
  ('00000000-0000-0000-0000-000000000751', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000721', '00000000-0000-0000-0000-000000000731', 'active'),
  ('00000000-0000-0000-0000-000000000752', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000722', '00000000-0000-0000-0000-000000000732', 'active'),
  ('00000000-0000-0000-0000-000000000753', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000723', '00000000-0000-0000-0000-000000000731', 'suspended');

insert into public.membership_units (membership_id, organization_id, unit_id)
values
  ('00000000-0000-0000-0000-000000000751', '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711'),
  ('00000000-0000-0000-0000-000000000752', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000712');

insert into public.memberships (id, organization_id, profile_id, role_id)
values ('00000000-0000-0000-0000-000000000754', '00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000724', '00000000-0000-0000-0000-000000000733');

-- 7. Role validation and helper behavior as user A
select throws_ok(
  $$ insert into public.memberships (organization_id, profile_id, role_id)
     values ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000724', '00000000-0000-0000-0000-000000000732') $$,
  '23503', null, 'rejects custom role from another organization'
);

set local role to 'authenticated';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000721', true);
select is(private.is_active_org_member(auth.uid(), '00000000-0000-0000-0000-000000000701'), true, 'active membership grants organization access');
select is(private.is_active_org_member(auth.uid(), '00000000-0000-0000-0000-000000000702'), false, 'membership does not cross organizations');
select is(private.has_unit_access(auth.uid(), '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711'), true, 'listed unit is accessible');
select is(private.has_unit_access(auth.uid(), '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000712'), false, 'unit from another organization is inaccessible');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000701', null, 'team.read'), true, 'assigned permission is granted');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000701', null, 'role.manage'), false, 'missing permission is denied');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711', 'unit.read'), true, 'assigned unit permission is granted');
select is(private.has_permission(auth.uid(), '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000712', 'unit.read'), false, 'permission is denied outside unit scope');

-- 8. Positive, negative and cross-tenant RLS
select results_eq(
  $$ select count(*)::int from public.memberships where profile_id = auth.uid() $$,
  $$ values (1::int) $$,
  'user A reads own membership'
);
select results_eq(
  $$ select count(*)::int from public.memberships where organization_id = '00000000-0000-0000-0000-000000000702' $$,
  $$ values (0::int) $$,
  'user A cannot read organization B memberships'
);
select results_eq(
  $$ select count(*)::int from public.membership_units where organization_id = '00000000-0000-0000-0000-000000000701' $$,
  $$ values (1::int) $$,
  'user A reads authorized organization unit membership'
);
select results_eq(
  $$ select count(*)::int from public.membership_units where organization_id = '00000000-0000-0000-0000-000000000702' $$,
  $$ values (0::int) $$,
  'user A cannot read organization B unit memberships'
);

-- 9. Suspended membership and anon denial
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000723', true);
select is(private.is_active_org_member(auth.uid(), '00000000-0000-0000-0000-000000000701'), false, 'suspended membership is inactive');
select is(private.has_unit_access(auth.uid(), '00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000711'), false, 'suspended membership has no unit access');
select results_eq(
  $$ select count(*)::int from public.membership_units where organization_id = '00000000-0000-0000-0000-000000000701' $$,
  $$ values (0::int) $$,
  'suspended membership cannot read unit access'
);
reset role;
set local role to 'anon';
select throws_ok($$ select count(*)::int from public.memberships $$, '42501', null, 'anon cannot select memberships');
select throws_ok($$ select count(*)::int from public.membership_units $$, '42501', null, 'anon cannot select membership_units');
reset role;

-- 10. Financial tables remain absent
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

rollback;
