-- F2.2D-A — Automatic Profile Provisioning Tests
-- Requer pgTAP (carregado pelo Supabase CLI no contexto de teste).
--
-- Fixtures sintéticas são inseridas pela conexão administrativa (postgres)
-- diretamente em auth.users e revertidas pelo rollback final. O trigger
-- on_auth_user_created provisiona public.profiles automaticamente.
-- Nenhum assertion usa service_role; RLS usa SET ROLE + set_config JWT.

begin;

select plan(34);

-- 1. Migration aplicada
select ok(
  exists(
    select 1 from supabase_migrations.schema_migrations
    where name = 'identity_profile_trigger'
  ),
  'migration identity_profile_trigger applied'
);

-- 2. Função existe
select has_function('private', 'handle_new_auth_user', 'function private.handle_new_auth_user exists');

-- 3. Função é security definer
select is(
  (select p.prosecdef
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'handle_new_auth_user'),
  true,
  'function is security definer'
);

-- 4. search_path fixo e restrito
select is(
  (select p.proconfig::text
   from pg_catalog.pg_proc p
   join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'handle_new_auth_user'),
  '{search_path=pg_catalog}',
  'function has fixed restricted search_path'
);

-- 5. Trigger existe em auth.users
select has_trigger('auth', 'users', 'on_auth_user_created', 'trigger on_auth_user_created exists on auth.users');

-- 6. Trigger é AFTER INSERT FOR EACH ROW (tgtype = row + insert, sem before)
select is(
  (select tgtype from pg_catalog.pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass),
  5,
  'trigger is AFTER INSERT FOR EACH ROW'
);

-- Fixtures sintéticas
create extension if not exists pgcrypto;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, confirmation_sent_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000101', 'meta.full@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), '{"full_name":"Maria da Silva"}'),
  ('00000000-0000-0000-0000-000000000102', 'fallback.user@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), null),
  ('00000000-0000-0000-0000-000000000103', 'x@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), null),
  ('00000000-0000-0000-0000-000000000104', 'too.long.meta@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), jsonb_build_object('full_name', repeat('X', 121))),
  ('00000000-0000-0000-0000-000000000105', repeat('a', 130) || '@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), null),
  ('00000000-0000-0000-0000-000000000106', 'dup.user@test.com',
   crypt('test', gen_salt('bf')), now(), now(), now(), now(), '{"full_name":"Dup Name"}');

-- 7. Profile criado automaticamente
select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000101' $$,
  $$ values (1::int) $$,
  'trigger creates profile automatically'
);

-- 8. id do profile igual ao id do usuário Auth
select is(
  (select id from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  '00000000-0000-0000-0000-000000000101'::uuid,
  'profile id equals auth user id'
);

-- 9. full_name vindo de raw_user_meta_data
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  'Maria da Silva',
  'full_name comes from raw_user_meta_data'
);

-- 10. Fallback quando metadata não contém full_name
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000102'),
  'fallback user',
  'fallback name derived from email local part'
);

-- 11. Fallback com e-mail curto garante mínimo de 2 caracteres
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000103'),
  'user',
  'fallback guarantees at least 2 chars'
);

-- 12. Fallback quando metadata full_name é inválido (muito longo)
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000104'),
  'too long meta',
  'invalid metadata full_name ignored, fallback used'
);

-- 13. Fallback limitado a 120 caracteres
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000105'),
  repeat('a', 120),
  'fallback name truncated to 120 chars'
);

-- 14. status active
select is(
  (select status from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  'active',
  'status is active'
);

-- 15. version 1
select is(
  (select version from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  1,
  'version is 1'
);

-- 16. Timestamps preenchidos
select ok(
  (select created_at is not null and updated_at is not null
   from public.profiles where id = '00000000-0000-0000-0000-000000000101'),
  'created_at and updated_at populated'
);

-- 17. Profile duplicado não ocorre (re-disparo do trigger)
-- Trigger temporário de teste para re-invocar a função no mesmo usuário.
create trigger _test_reprovision
  after update on auth.users
  for each row execute function private.handle_new_auth_user();
update auth.users set updated_at = now() where id = '00000000-0000-0000-0000-000000000106';
drop trigger _test_reprovision on auth.users;

select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000106' $$,
  $$ values (1::int) $$,
  'profile is not duplicated on re-execution'
);

-- 18. Profile existente não é sobrescrito no re-disparo
select is(
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-000000000106'),
  'Dup Name',
  'existing profile is not overwritten on re-execution'
);

-- 19. Delete do auth.users remove o profile via cascade
delete from auth.users where id = '00000000-0000-0000-0000-000000000101';
select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000101' $$,
  $$ values (0::int) $$,
  'deleting auth user cascades profile deletion'
);

-- 20. Função não é executável por anon
select is(
  pg_catalog.has_function_privilege('anon', 'private.handle_new_auth_user()', 'EXECUTE'),
  false,
  'anon cannot EXECUTE function'
);

-- 21. Função não é executável por authenticated
select is(
  pg_catalog.has_function_privilege('authenticated', 'private.handle_new_auth_user()', 'EXECUTE'),
  false,
  'authenticated cannot EXECUTE function'
);

-- 22. Função é executável somente pelo papel do trigger
select is(
  pg_catalog.has_function_privilege('supabase_auth_admin', 'private.handle_new_auth_user()', 'EXECUTE'),
  true,
  'supabase_auth_admin can EXECUTE function (trigger role)'
);

-- 23. USAGE no schema private concedido somente ao papel do trigger
select is(
  pg_catalog.has_schema_privilege('supabase_auth_admin', 'private', 'USAGE'),
  true,
  'supabase_auth_admin has USAGE on private (trigger role)'
);

-- 24. Nenhuma policy nova em profiles
select results_eq(
  $$ select array_agg(polname order by polname) from pg_catalog.pg_policy
     where polrelid = 'public.profiles'::regclass $$,
  $$ values (array['profiles_select_own']::name[]) $$,
  'profiles has no new policies beyond profiles_select_own'
);

-- 25. Nenhuma policy de INSERT público em profiles
select is(
  (select count(*)::int from pg_catalog.pg_policy
   where polrelid = 'public.profiles'::regclass and polcmd = 'a'),
  0,
  'no INSERT policy on profiles'
);

-- 26-30. Nenhuma tabela financeira criada
select hasnt_table('public', 'wallets', 'wallets does not exist');
select hasnt_table('public', 'balances', 'balances does not exist');
select hasnt_table('public', 'payouts', 'payouts does not exist');
select hasnt_table('public', 'settlements', 'settlements does not exist');
select hasnt_table('public', 'transfers', 'transfers does not exist');

-- 31-34. Isolamento RLS do profile continua intacto
set local role to 'authenticated';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000102' $$,
  $$ values (1::int) $$,
  'RLS: user reads own profile'
);

select results_eq(
  $$ select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-000000000103' $$,
  $$ values (0::int) $$,
  'RLS: user cannot read other profile'
);

select results_eq(
  $$ select count(*)::int from public.profiles $$,
  $$ values (1::int) $$,
  'RLS: user sees only own profile'
);

select throws_ok(
  $$ insert into public.profiles (id, full_name) values (gen_random_uuid(), 'Hacker') $$,
  '42501',
  null,
  'RLS: authenticated cannot INSERT'
);

reset role;

rollback;
