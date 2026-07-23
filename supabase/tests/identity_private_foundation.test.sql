-- F2.2B — Private Foundation Tests
-- Requires: pgTAP extension (loaded by Supabase CLI in test context)
--
-- Papel criador identificado:
--   current_user = postgres, session_user = postgres
--   connection string: postgresql://postgres:postgres@127.0.0.1:54322/postgres
--   `supabase migration up` e `supabase start` executam SQL como postgres.
--
-- A correção de funções usa ALTER DEFAULT PRIVILEGES GLOBAL
-- (sem IN SCHEMA) porque a variante por esquema é ineficaz:
-- PostgreSQL não permite remover o EXECUTE padrão de PUBLIC
-- via ALTER DEFAULT PRIVILEGES ... IN SCHEMA ... REVOKE EXECUTE.
-- A revogação global tem precedência menor que a normativa por
-- esquema, portanto não afeta o schema public (que possui
-- GRANT explícito do Supabase a anon/authenticated/service_role).

begin;
select plan(20);

-- 1. Migration foi aplicada
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_private_foundation'
  ),
  'migration identity_private_foundation applied'
);

-- 2. Schema private existe
select has_schema('private', 'schema private exists');

-- 3. Nenhum privilégio no schema private para roles não confiáveis
select schema_privs_are('private', 'public', array[]::text[], 'public has no privileges on private');
select schema_privs_are('private', 'anon', array[]::text[], 'anon has no privileges on private');
select schema_privs_are('private', 'authenticated', array[]::text[], 'authenticated has no privileges on private');

-- 4. Default privileges: tabela nova em private não concede nada
create table private._test_t (id int);
select is(pg_catalog.has_table_privilege('public', 'private._test_t', 'SELECT'), false, 'new private table not selectable by public');
select is(pg_catalog.has_table_privilege('anon', 'private._test_t', 'SELECT'), false, 'new private table not selectable by anon');
select is(pg_catalog.has_table_privilege('authenticated', 'private._test_t', 'SELECT'), false, 'new private table not selectable by authenticated');
drop table private._test_t;

-- 5. Default privileges: sequência nova em private não concede nada
create sequence private._test_s;
select is(pg_catalog.has_sequence_privilege('public', 'private._test_s', 'USAGE'), false, 'new private sequence not usable by public');
select is(pg_catalog.has_sequence_privilege('anon', 'private._test_s', 'USAGE'), false, 'new private sequence not usable by anon');
select is(pg_catalog.has_sequence_privilege('authenticated', 'private._test_s', 'USAGE'), false, 'new private sequence not usable by authenticated');
drop sequence private._test_s;

-- 6. Default privileges: função nova em private — sem EXECUTE para roles não confiáveis
create function private._test_fn() returns int language sql as 'select 1';
select is(pg_catalog.has_function_privilege('public', 'private._test_fn()', 'EXECUTE'), false, 'new private function not executable by public');
select is(pg_catalog.has_function_privilege('anon', 'private._test_fn()', 'EXECUTE'), false, 'new private function not executable by anon');
select is(pg_catalog.has_function_privilege('authenticated', 'private._test_fn()', 'EXECUTE'), false, 'new private function not executable by authenticated');

-- 7. A ACL da função não contém PUBLIC com EXECUTE
select is(
  (select coalesce(
    (select count(*)::int from pg_catalog.aclexplode(p.proacl)
     where p.proname = '_test_fn'
       and grantee = 0
       and privilege_type = 'EXECUTE'),
    0
  ) from pg_catalog.pg_proc p where p.proname = '_test_fn'),
  0,
  'PUBLIC has no EXECUTE entry in function ACL'
);
drop function private._test_fn();

-- 8. Nenhuma tabela financeira proibida existe
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

rollback;
