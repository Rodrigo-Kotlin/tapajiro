-- F2.2H-B — Authorization owner tests
-- Requer pgTAP carregado pelo Supabase CLI no contexto de teste.
-- Todas as verificações são de catálogo e privilégios; não há escrita de dados.

begin;

select plan(31);

-- 1. Technical role attributes
select ok(
  exists(select 1 from pg_roles where rolname = 'tapajiro_authorization_owner'),
  'technical owner role exists'
);
select is((select rolcanlogin from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner cannot login');
select is((select rolinherit from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner does not inherit roles');
select is((select rolsuper from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner is not superuser');
select is((select rolcreaterole from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner cannot create roles');
select is((select rolcreatedb from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner cannot create databases');
select is((select rolreplication from pg_roles where rolname = 'tapajiro_authorization_owner'), false, 'technical owner cannot replicate');
select is((select rolbypassrls from pg_roles where rolname = 'tapajiro_authorization_owner'), true, 'technical owner bypasses RLS only for definer reads');

-- 2. Function ownership and security properties
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'private.is_active_org_member(uuid, uuid)'::regprocedure), 'tapajiro_authorization_owner', 'is_active_org_member has technical owner');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'private.has_unit_access(uuid, uuid, uuid)'::regprocedure), 'tapajiro_authorization_owner', 'has_unit_access has technical owner');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'private.has_permission(uuid, uuid, uuid, text)'::regprocedure), 'tapajiro_authorization_owner', 'has_permission has technical owner');
select is((select pg_get_userbyid(proowner) from pg_proc where oid = 'private.validate_membership_role_organization()'::regprocedure), 'tapajiro_authorization_owner', 'role validation trigger has technical owner');
select is((select count(*)::int from pg_proc where pronamespace = 'private'::regnamespace and proname in ('is_active_org_member', 'has_unit_access', 'has_permission', 'validate_membership_role_organization') and prosecdef), 4, 'all authorization functions remain SECURITY DEFINER');
select is((select count(*)::int from pg_proc where pronamespace = 'private'::regnamespace and proname in ('is_active_org_member', 'has_unit_access', 'has_permission', 'validate_membership_role_organization') and 'search_path=pg_catalog, public, private' = any(proconfig)), 4, 'all authorization functions retain fixed search_path');

-- 3. Minimum table privileges
select is(pg_catalog.has_schema_privilege('tapajiro_authorization_owner', 'private', 'USAGE'), true, 'owner has USAGE on private schema');
select is(pg_catalog.has_schema_privilege('tapajiro_authorization_owner', 'private', 'CREATE'), false, 'owner has no CREATE on private schema');
select table_privs_are('public', 'memberships', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on memberships');
select table_privs_are('public', 'membership_units', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on membership_units');
select table_privs_are('public', 'organizations', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on organizations');
select table_privs_are('public', 'units', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on units');
select table_privs_are('public', 'roles', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on roles');
select table_privs_are('public', 'role_permissions', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on role_permissions');
select table_privs_are('public', 'permissions', 'tapajiro_authorization_owner', array['SELECT'], 'owner has only SELECT on permissions');

-- 4. Application roles do not inherit the owner
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname = 'postgres' and m.roleid = 'tapajiro_authorization_owner'::regrole), 0, 'migration executor does not retain owner membership');
select is((select count(*)::int from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname in ('anon', 'authenticated', 'service_role') and m.roleid = 'tapajiro_authorization_owner'::regrole), 0, 'application roles do not inherit technical owner');
select is(pg_catalog.has_function_privilege('anon', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), false, 'anon still cannot execute helper');
select is(pg_catalog.has_function_privilege('authenticated', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), true, 'authenticated retains policy helper execution');
select is(pg_catalog.has_function_privilege('service_role', 'private.is_active_org_member(uuid, uuid)', 'EXECUTE'), false, 'service_role has no direct helper execution');
select is(pg_catalog.has_table_privilege('tapajiro_authorization_owner', 'public.memberships', 'INSERT'), false, 'owner has no INSERT on memberships');
select is(pg_catalog.has_table_privilege('tapajiro_authorization_owner', 'public.memberships', 'UPDATE'), false, 'owner has no UPDATE on memberships');
select is(pg_catalog.has_table_privilege('tapajiro_authorization_owner', 'public.memberships', 'DELETE'), false, 'owner has no DELETE on memberships');

rollback;
