-- F2.4B — Unit operational configuration tests
-- Synthetic fixtures only; run by Supabase CLI with pgTAP.

begin;
select plan(52);

select has_table('public', 'unit_settings', 'unit_settings exists');
select has_table('public', 'business_hours', 'business_hours exists');
select has_table('private', 'audit_logs', 'private audit_logs exists');
select has_function('public', 'update_unit_operational_settings', 'settings RPC exists');
select has_function('public', 'set_unit_operational_status', 'status RPC exists');
select has_function('public', 'replace_business_hours', 'hours RPC exists');

select is((select relrowsecurity from pg_class where oid = 'public.unit_settings'::regclass), true, 'settings RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.unit_settings'::regclass), true, 'settings RLS forced');
select is((select relrowsecurity from pg_class where oid = 'public.business_hours'::regclass), true, 'hours RLS enabled');
select is((select relforcerowsecurity from pg_class where oid = 'public.business_hours'::regclass), true, 'hours RLS forced');
select is((select prosecdef from pg_proc where oid = 'public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text)'::regprocedure), true, 'settings RPC is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.set_unit_operational_status(uuid, uuid, text, text, timestamptz)'::regprocedure), true, 'status RPC is SECURITY DEFINER');
select is((select prosecdef from pg_proc where oid = 'public.replace_business_hours(uuid, uuid, jsonb)'::regprocedure), true, 'hours RPC is SECURITY DEFINER');
select is((select count(*)::int from pg_proc where oid in (
  'public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text)'::regprocedure,
  'public.set_unit_operational_status(uuid, uuid, text, text, timestamptz)'::regprocedure,
  'public.replace_business_hours(uuid, uuid, jsonb)'::regprocedure
) and 'search_path=pg_catalog, public, private' = any(proconfig)), 3, 'all operational RPCs have fixed search_path');
select is((select count(*)::int from pg_proc where oid in (
  'public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text)'::regprocedure,
  'public.set_unit_operational_status(uuid, uuid, text, text, timestamptz)'::regprocedure,
  'public.replace_business_hours(uuid, uuid, jsonb)'::regprocedure
) and pg_get_userbyid(proowner) = 'tapajiro_unit_operations_owner'), 3, 'all operational RPCs have dedicated owner');
select is((select rolcanlogin from pg_roles where rolname = 'tapajiro_unit_operations_owner'), false, 'operations owner cannot login');
select is((select rolinherit from pg_roles where rolname = 'tapajiro_unit_operations_owner'), false, 'operations owner does not inherit roles');
select is((select rolsuper from pg_roles where rolname = 'tapajiro_unit_operations_owner'), false, 'operations owner is not superuser');
select is((select rolbypassrls from pg_roles where rolname = 'tapajiro_unit_operations_owner'), true, 'operations owner bypasses RLS only for RPCs');
select is(pg_catalog.has_schema_privilege('tapajiro_unit_operations_owner', 'public', 'USAGE'), true, 'operations owner retains public schema USAGE');
select is(pg_catalog.has_schema_privilege('tapajiro_unit_operations_owner', 'public', 'CREATE'), false, 'operations owner does not retain public schema CREATE');
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname in ('anon', 'authenticated', 'service_role') and m.roleid = 'tapajiro_unit_operations_owner'::regrole), 0, 'no application role is member of operations owner');

select table_privs_are('public', 'unit_settings', 'authenticated', array['SELECT'], 'authenticated can only select settings');
select table_privs_are('public', 'business_hours', 'authenticated', array['SELECT'], 'authenticated can only select hours');
select table_privs_are('public', 'units', 'authenticated', array['SELECT'], 'authenticated has no direct unit writes');
select table_privs_are('public', 'unit_settings', 'anon', array[]::text[], 'anon has no settings privileges');
select table_privs_are('public', 'business_hours', 'anon', array[]::text[], 'anon has no hours privileges');
select is(pg_catalog.has_function_privilege('authenticated', 'public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text)', 'EXECUTE'), true, 'authenticated can execute settings RPC');
select is(pg_catalog.has_function_privilege('anon', 'public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text)', 'EXECUTE'), false, 'anon cannot execute settings RPC');
select is(pg_catalog.has_function_privilege('service_role', 'public.replace_business_hours(uuid, uuid, jsonb)', 'EXECUTE'), false, 'service_role has no direct hours RPC grant');
select is((select count(*)::int from pg_policy where polrelid in ('public.unit_settings'::regclass, 'public.business_hours'::regclass) and position('private.has_permission' in coalesce(pg_get_expr(polqual, polrelid), '')) > 0), 2, 'operational policies enforce permission helper');

select col_type_is('public', 'unit_settings', 'delivery_minimum_cents', 'bigint', 'delivery minimum is bigint cents');
select col_type_is('public', 'business_hours', 'weekday', 'smallint', 'weekday is smallint');
select col_has_default('public', 'unit_settings', 'delivery_enabled', 'delivery defaults enabled');
select col_has_default('public', 'business_hours', 'crosses_midnight', 'cross-midnight defaults false');
select col_not_null('public', 'unit_settings', 'organization_id', 'settings tenant is required');
select col_not_null('public', 'business_hours', 'unit_id', 'hours unit is required');
select has_pk('public', 'unit_settings', 'unit_settings has unit primary key');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.unit_settings'::regclass and conname = 'unit_settings_unit_fkey'), 'settings has composite unit foreign key');
select ok(exists(select 1 from pg_constraint where conrelid = 'public.business_hours'::regclass and conname = 'business_hours_unit_fkey'), 'hours has composite unit foreign key');
select has_index('public', 'business_hours', 'uq_business_hours_unit_weekday_sequence', 'hours sequence is unique per unit/day');

select ok(exists(select 1 from pg_constraint where conrelid = 'public.unit_settings'::regclass and conname = 'unit_settings_delivery_minimum_check'), 'settings enforce non-negative delivery minimum');
select throws_ok($$ insert into public.business_hours (organization_id, unit_id, weekday, sequence, opens_at, closes_at) values (gen_random_uuid(), gen_random_uuid(), 7, 1, '08:00', '09:00') $$, '23514', null, 'hours reject invalid weekday');
select throws_ok($$ insert into public.business_hours (organization_id, unit_id, weekday, sequence, opens_at, closes_at) values (gen_random_uuid(), gen_random_uuid(), 0, 0, '08:00', '09:00') $$, '23514', null, 'hours reject invalid sequence');
select is((select count(*)::int from pg_policy where polrelid in ('public.unit_settings'::regclass, 'public.business_hours'::regclass)), 2, 'only authenticated read policies exist');
select is((select count(*)::int from pg_policy p join pg_roles r on r.oid = any(p.polroles) where p.polrelid in ('public.unit_settings'::regclass, 'public.business_hours'::regclass) and r.rolname = 'anon'), 0, 'anon has no operational policy');
select is((select count(*)::int from pg_trigger where tgrelid = 'private.audit_logs'::regclass and not tgisinternal), 1, 'audit logs have one mutation guard');
select throws_ok($$ update private.audit_logs set action = 'tampered' $$, '42501', null, 'audit logs reject mutation');
select hasnt_table('public', 'wallets', 'wallets remain outside scope');
select hasnt_table('public', 'payouts', 'payouts remain outside scope');
select hasnt_table('public', 'settlements', 'settlements remain outside scope');

rollback;
