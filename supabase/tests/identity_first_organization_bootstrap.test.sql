-- F2.2J-C — First organization bootstrap tests
-- Synthetic fixtures only; the transaction is rolled back at the end.

begin;

select plan(49);

select has_function('public', 'create_first_organization', 'bootstrap RPC exists');
select is((select pg_get_userbyid(proowner)
             from pg_proc
            where oid = 'public.create_first_organization(text, text, text, text, text, text)'::regprocedure),
          'tapajiro_bootstrap_owner',
          'bootstrap RPC has dedicated owner');
select is((select prosecdef
             from pg_proc
            where oid = 'public.create_first_organization(text, text, text, text, text, text)'::regprocedure),
          true,
          'bootstrap RPC is SECURITY DEFINER');
select is((select 'search_path=pg_catalog, public, private' = any(proconfig)
             from pg_proc
            where oid = 'public.create_first_organization(text, text, text, text, text, text)'::regprocedure),
          true,
          'bootstrap RPC has fixed search_path');
select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('public.create_first_organization(text, text, text, text, text, text)'::regprocedure)) > 0,
  'bootstrap RPC serializes calls per user'
);
select ok(
  position($claim$current_setting('request.jwt.claim.sub', true)$claim$ in pg_get_functiondef('public.create_first_organization(text, text, text, text, text, text)'::regprocedure)) > 0,
  'bootstrap RPC reads the user id from the JWT claim'
);
select is(
  position('auth.uid()' in pg_get_functiondef('public.create_first_organization(text, text, text, text, text, text)'::regprocedure)),
  0,
  'bootstrap RPC does not depend on the auth schema'
);

select is((select rolcanlogin from pg_roles where rolname = 'tapajiro_bootstrap_owner'), false, 'bootstrap owner cannot login');
select is((select rolinherit from pg_roles where rolname = 'tapajiro_bootstrap_owner'), false, 'bootstrap owner does not inherit roles');
select is((select rolsuper from pg_roles where rolname = 'tapajiro_bootstrap_owner'), false, 'bootstrap owner is not superuser');
select is((select rolbypassrls from pg_roles where rolname = 'tapajiro_bootstrap_owner'), true, 'bootstrap owner bypasses FORCE RLS only for the RPC');
select is(pg_catalog.has_schema_privilege('tapajiro_bootstrap_owner', 'private', 'USAGE'), true, 'bootstrap owner retains private schema USAGE');
select is(pg_catalog.has_schema_privilege('tapajiro_bootstrap_owner', 'private', 'CREATE'), false, 'bootstrap owner does not retain private schema CREATE');
select is(pg_catalog.has_schema_privilege('tapajiro_bootstrap_owner', 'public', 'USAGE'), true, 'bootstrap owner retains public schema USAGE');
select is(pg_catalog.has_schema_privilege('tapajiro_bootstrap_owner', 'public', 'CREATE'), false, 'bootstrap owner does not retain public schema CREATE');

select table_privs_are('public', 'profiles', 'tapajiro_bootstrap_owner', array['SELECT'], 'bootstrap owner has only SELECT on profiles');
select table_privs_are('public', 'memberships', 'tapajiro_bootstrap_owner', array['SELECT', 'INSERT'], 'bootstrap owner has SELECT and INSERT on memberships');
select table_privs_are('public', 'roles', 'tapajiro_bootstrap_owner', array['SELECT'], 'bootstrap owner has only SELECT on roles');
select table_privs_are('public', 'organizations', 'tapajiro_bootstrap_owner', array['INSERT'], 'bootstrap owner has only INSERT on organizations');
select table_privs_are('public', 'units', 'tapajiro_bootstrap_owner', array['INSERT'], 'bootstrap owner has only INSERT on units');
select is(pg_catalog.has_function_privilege('authenticated', 'public.create_first_organization(text, text, text, text, text, text)', 'EXECUTE'), true, 'authenticated can execute bootstrap RPC');
select is(pg_catalog.has_function_privilege('anon', 'public.create_first_organization(text, text, text, text, text, text)', 'EXECUTE'), false, 'anon cannot execute bootstrap RPC');
select is(pg_catalog.has_function_privilege('service_role', 'public.create_first_organization(text, text, text, text, text, text)', 'EXECUTE'), false, 'service_role has no direct bootstrap grant');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000001101', 'bootstrap-a@test.invalid', crypt('test', gen_salt('bf')), now(), now(), now());

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000001102', 'bootstrap-b@test.invalid', crypt('test', gen_salt('bf')), now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001101', true);

select results_eq(
  $$ select count(*)::int from public.create_first_organization(
    '  Legal A  ', '  Trade A  ', '  Unidade A  ', '  Público A  ', '  Café  do  Tapajós!!!  ', null
  ) $$,
  $$ values (1::int) $$,
  'authenticated user creates first organization'
);
select is((select count(*)::int from public.organizations where status = 'trial'), 1, 'organization starts in trial');
select is((select count(*)::int from public.units where slug = 'cafe-do-tapajos'), 1, 'unit slug is normalized');
select is((select count(*)::int from public.memberships where profile_id = auth.uid() and status = 'active' and all_units), 1, 'owner membership is active and all_units');
select is((select count(*)::int from public.membership_units), 0, 'owner has no membership_units row');
reset role;
select is(
  (select m.role_id from public.memberships m where m.profile_id = '00000000-0000-0000-0000-000000001101'),
  (select r.id from public.roles r where r.organization_id is null and r.system_key = 'owner' and r.is_system),
  'membership uses global owner role'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001101', true);

select throws_ok(
  $$ select * from public.create_first_organization('Legal B', 'Trade B', 'Unidade B', 'Público B', 'outra-unidade', null) $$,
  'P0001',
  'bootstrap_already_completed',
  'second bootstrap is rejected with stable error'
);

select is((select count(*)::int from public.organizations), 1, 'second bootstrap creates no organization');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001102', true);
select throws_ok(
  $$ select * from public.create_first_organization('Legal B', 'Trade B', 'Unidade B', 'Público B', 'Café do Tapajós', null) $$,
  'P0001',
  'unit_slug_conflict',
  'slug collision has stable error'
);
reset role;
select is((select count(*)::int from public.organizations), 1, 'slug collision rolls back organization');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001102', true);

select throws_ok(
  $$ select * from public.create_first_organization(' ', 'Trade B', 'Unidade B', 'Público B', 'outra-unidade', null) $$,
  'P0001',
  'invalid_name',
  'blank names are rejected'
);

select results_eq(
  $$ select count(*)::int from public.create_first_organization('Legal B', 'Trade B', 'Unidade B', 'Público B', 'outra-unidade', null) $$,
  $$ values (1::int) $$,
  'second user can bootstrap a separate organization'
);
reset role;
select is((select count(*)::int from public.organizations), 2, 'two independent organizations exist in the synthetic fixture');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000001101', true);

select results_eq(
  $$ select count(*)::int from public.organizations where id = (select organization_id from public.memberships where profile_id = '00000000-0000-0000-0000-000000001101') $$,
  $$ values (1::int) $$,
  'member can read own organization'
);
select results_eq(
  $$ select count(*)::int from public.units where organization_id = (select organization_id from public.memberships where profile_id = '00000000-0000-0000-0000-000000001101') $$,
  $$ values (1::int) $$,
  'member can read own unit'
);
select results_eq(
  $$ select count(*)::int from public.organizations where trade_name = 'Trade B' $$,
  $$ values (0::int) $$,
  'member cannot read another organization'
);

select throws_ok(
  $$ insert into public.organizations (legal_name, trade_name, document_type) values ('Direct', 'Direct', 'other') $$,
  '42501',
  null,
  'authenticated cannot insert organizations directly'
);
select throws_ok(
  $$ insert into public.units (organization_id, name, public_name, slug) values ('00000000-0000-0000-0000-000000001199', 'Direct', 'Direct', 'direct-unit') $$,
  '42501',
  null,
  'authenticated cannot insert units directly'
);
select throws_ok(
  $$ insert into public.memberships (organization_id, profile_id, role_id) values ('00000000-0000-0000-0000-000000001199', auth.uid(), (select id from public.roles where system_key = 'owner')) $$,
  '42501',
  null,
  'authenticated cannot insert memberships directly'
);

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.create_first_organization('Legal C', 'Trade C', 'Unidade C', 'Público C', 'outra-unidade', null) $$,
  '42501',
  null,
  'anon cannot execute bootstrap RPC'
);

reset role;
select is((select count(*)::int from information_schema.columns where table_schema = 'public' and table_name = 'organizations' and column_name = 'slug'), 0, 'organizations.slug does not exist');
select hasnt_table('public', 'wallets', 'wallets remains absent');
select hasnt_table('public', 'balances', 'balances remains absent');
select hasnt_table('public', 'payouts', 'payouts remains absent');
select hasnt_table('public', 'settlements', 'settlements remains absent');
select hasnt_table('public', 'transfers', 'transfers remains absent');

rollback;
