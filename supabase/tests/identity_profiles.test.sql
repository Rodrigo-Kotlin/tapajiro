-- F2.2C — Identity Profiles Tests
-- Requer pgTAP (carregado pelo Supabase CLI no contexto de teste).
--
-- Fixtures sintéticas (user_a, user_b) são inseridas pela conexão
-- administrativa do teste e revertidas pelo rollback final.
-- Nenhum assertion usa service_role.
-- Assertions de RLS usam SET ROLE + set_config JWT.

begin;

select plan(52);

-- 1. Tabela existe
select has_table('public', 'profiles', 'table profiles exists');

-- 2. Colunas exatas (oito, nenhuma extra)
select columns_are('public', 'profiles', array[
  'id', 'full_name', 'phone_normalized', 'avatar_path',
  'status', 'created_at', 'updated_at', 'version'
], 'profiles has exactly 8 columns');

-- 3. Coluna email não existe
select hasnt_column('public', 'profiles', 'email', 'no email column');

-- 4. Coluna organization_id não existe
select hasnt_column('public', 'profiles', 'organization_id', 'no organization_id column');

-- 5. Tipos
select col_type_is('public', 'profiles', 'id', 'uuid', 'id type is uuid');
select col_type_is('public', 'profiles', 'full_name', 'text', 'full_name type is text');
select col_type_is('public', 'profiles', 'phone_normalized', 'text', 'phone_normalized type is text');
select col_type_is('public', 'profiles', 'avatar_path', 'text', 'avatar_path type is text');
select col_type_is('public', 'profiles', 'status', 'text', 'status type is text');
select col_type_is('public', 'profiles', 'created_at', 'timestamp with time zone', 'created_at type is timestamptz');
select col_type_is('public', 'profiles', 'updated_at', 'timestamp with time zone', 'updated_at type is timestamptz');
select col_type_is('public', 'profiles', 'version', 'integer', 'version type is integer');

-- 6. NOT NULL (todas exceto phone_normalized e avatar_path)
select col_not_null('public', 'profiles', 'id', 'id not null');
select col_not_null('public', 'profiles', 'full_name', 'full_name not null');
select col_is_null('public', 'profiles', 'phone_normalized', 'phone_normalized nullable');
select col_is_null('public', 'profiles', 'avatar_path', 'avatar_path nullable');
select col_not_null('public', 'profiles', 'status', 'status not null');
select col_not_null('public', 'profiles', 'created_at', 'created_at not null');
select col_not_null('public', 'profiles', 'updated_at', 'updated_at not null');
select col_not_null('public', 'profiles', 'version', 'version not null');

-- 7. Defaults
select col_has_default('public', 'profiles', 'status', 'status has default');
select col_has_default('public', 'profiles', 'created_at', 'created_at has default');
select col_has_default('public', 'profiles', 'updated_at', 'updated_at has default');
select col_has_default('public', 'profiles', 'version', 'version has default');

-- 8. PK
select col_is_pk('public', 'profiles', 'id', 'id is primary key');

-- 9. FK para auth.users
select col_is_fk('public', 'profiles', 'id', 'id is foreign key to auth.users');

-- 10. FK on delete cascade
select results_eq(
  $$ select count(*)::int
     from information_schema.referential_constraints rc
     join information_schema.table_constraints tc
       on rc.constraint_name = tc.constraint_name
       and tc.table_schema = 'public'
       and tc.table_name = 'profiles'
     where rc.delete_rule = 'CASCADE' $$,
  $$ values (1::int) $$,
  'FK profiles.id -> auth.users.id on delete cascade'
);

-- 11. Check constraints (pg_constraint filtrando contype='c' evita NOT NULL do information_schema)
select results_eq(
  $$ select count(*)::int from pg_catalog.pg_constraint
     where contype = 'c'
       and conrelid = 'public.profiles'::regclass $$,
  $$ values (4::int) $$,
  'profiles has 4 check constraints'
);

-- 12. Rejeitar valores inválidos
-- full_name muito curto
select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), 'X') $$,
  '23514',
  null,
  'rejects full_name too short'
);

-- full_name muito longo
select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), repeat('X', 121)) $$,
  '23514',
  null,
  'rejects full_name too long'
);

-- status inválido
select throws_ok(
  $$ insert into public.profiles (id, full_name, status) values (gen_random_uuid(), 'Valid', 'invalid') $$,
  '23514',
  null,
  'rejects invalid status'
);

-- version zero
select throws_ok(
  $$ insert into public.profiles (id, full_name, version) values (gen_random_uuid(), 'Valid', 0) $$,
  '23514',
  null,
  'rejects version = 0'
);

-- phone_normalized não-E.164
select throws_ok(
  $$ insert into public.profiles (id, full_name, phone_normalized) values (gen_random_uuid(), 'Valid', 'not-a-phone') $$,
  '23514',
  null,
  'rejects phone_normalized not E.164'
);

-- full_name vazio ou só espaços (rejeitado pelo btrim no check)
select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), '  ') $$,
  '23514',
  null,
  'rejects full_name with only spaces'
);

-- 13. RLS habilitada e forçada
select is(
  (select relrowsecurity from pg_catalog.pg_class where relname = 'profiles' and relnamespace = 'public'::regnamespace),
  true,
  'RLS enabled'
);

select is(
  (select relforcerowsecurity from pg_catalog.pg_class where relname = 'profiles' and relnamespace = 'public'::regnamespace),
  true,
  'RLS forced'
);

-- 14. Policy profiles_select_own existe (via catálogo, row_security_policies_are não disponível)
select results_eq(
  $$ select array_agg(polname order by polname) from pg_catalog.pg_policy
     where polrelid = 'public.profiles'::regclass $$,
  $$ values (array['profiles_select_own']::name[]) $$,
  'only policy is profiles_select_own'
);

-- 15. Policy é FOR SELECT (polcmd = 'r')
select is(
  (select polcmd from pg_catalog.pg_policy where polname = 'profiles_select_own'),
  'r',
  'policy cmd is SELECT'
);

-- 16. Policy é TO authenticated
select ok(
  (select polroles @> array[(select oid from pg_roles where rolname = 'authenticated')]
   from pg_catalog.pg_policy where polname = 'profiles_select_own'),
  'policy targets authenticated role'
);

-- 17. Policy USING contém id = auth.uid()
select ok(
  (select pg_get_expr(polqual, polrelid)::text ~ 'id\s*=\s*auth\.uid\(\)'
   from pg_catalog.pg_policy where polname = 'profiles_select_own'),
  'policy USING (id = auth.uid())'
);

-- 18. Grants: authenticated tem SELECT, anon não tem nada
select table_privs_are('public', 'profiles', 'authenticated', array['SELECT'], 'authenticated has only SELECT');
select table_privs_are('public', 'profiles', 'anon', array[]::text[], 'anon has no privileges on profiles');

-- Fixtures sintéticas para RLS (conexão administrativa)
create extension if not exists pgcrypto;
do $$ begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000001', 'user_a@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now()),
    ('00000000-0000-0000-0000-000000000002', 'user_b@test.com', crypt('test', gen_salt('bf')), now(), now(), now(), now());
exception when unique_violation then null;
end $$;

-- Desde F2.2D-A, o trigger on_auth_user_created provisiona profiles
-- automaticamente ao inserir em auth.users; remove os auto-criados
-- para manter o fixture explícito deste arquivo.
delete from public.profiles
  where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

insert into public.profiles (id, full_name, status)
values
  ('00000000-0000-0000-0000-000000000001', 'User A', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'User B', 'active');

-- 19. RLS positivo: usuário A lê o próprio profile
set local role to 'authenticated';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000001' $$,
  $$ values (1::int) $$,
  'user A reads own profile'
);

-- 20. RLS negativo: usuário A não lê profile B
select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000002' $$,
  $$ values (0::int) $$,
  'user A cannot read profile B'
);

-- 21. RLS negativo: usuário A não lê todos os profiles (só o próprio)
select results_eq(
  $$ select count(*)::int from public.profiles $$,
  $$ values (1::int) $$,
  'user A sees only own profile (total 1)'
);

-- 22. RLS negativo: usuário autenticado não insere
select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), 'Hacker') $$,
  '42501',
  null,
  'authenticated cannot INSERT'
);

-- 23. RLS negativo: usuário autenticado não atualiza
select throws_ok(
  $$ update public.profiles set full_name = 'Hacker' where id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'authenticated cannot UPDATE'
);

-- 24. RLS negativo: usuário autenticado não exclui
select throws_ok(
  $$ delete from public.profiles where id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'authenticated cannot DELETE'
);

-- 25. anon não lê profile (results_eq falharia com permissão negada; throws_ok captura)
reset role;
set local role to 'anon';
select throws_ok(
  $$ select count(*)::int from public.profiles $$,
  '42501',
  null,
  'anon cannot SELECT profiles'
);

-- 26. anon não insere
select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), 'AnonHacker') $$,
  '42501',
  null,
  'anon cannot INSERT'
);

-- 27. anon não atualiza
select throws_ok(
  $$ update public.profiles set full_name = 'AnonHacker' where id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'anon cannot UPDATE'
);

-- 28. anon não exclui
select throws_ok(
  $$ delete from public.profiles where id = '00000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'anon cannot DELETE'
);

rollback;
