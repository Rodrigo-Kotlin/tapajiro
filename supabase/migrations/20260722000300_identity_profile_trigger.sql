-- +----------------------------------+
-- | F2.2D-A — Profile Trigger        |
-- +----------------------------------+
-- Cria o provisionamento automático de public.profiles quando um novo
-- usuário é criado em auth.users (conforme F2_IDENTITY_SCHEMA_CONTRACT
-- §3.1 e §6.2; DB Schema §17.1 handle_new_auth_user).
--
-- Decisões:
-- - Função em private (dados privilegiados ficam fora da Data API).
-- - SECURITY DEFINER necessária: o insert em auth.users é feito pelo
--   GoTrue (supabase_auth_admin), que não possui INSERT em profiles.
-- - search_path restrito a pg_catalog: a função usa apenas funções
--   embutidas e referencia public.profiles com schema qualificado;
--   um search_path menor que 'pg_catalog, public, private' é
--   estritamente mais seguro contra hijacking (arquitetura §16.4
--   exige fixo; restringir além do mínimo documentado é conservador).
-- - EXECUTE concedido somente a supabase_auth_admin (papel que dispara
--   o trigger). anon/authenticated/public continuam sem EXECUTE.
-- - USAGE em private concedido somente a supabase_auth_admin, papel que
--   resolve a função no disparo do trigger.
-- - Nenhuma senha, token ou JWT é copiado para profiles; apenas
--   full_name vindo de raw_user_meta_data ou fallback determinístico
--   derivado do e-mail.

-- 1. Schema private: USAGE mínimo para o papel que dispara o trigger
grant usage on schema private to supabase_auth_admin;

-- 2. Função de provisionamento
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_meta_name text;
  v_full_name text;
begin
  -- raw_user_meta_data->>'full_name' quando existir e for válido (2..120)
  v_meta_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  if v_meta_name is not null and char_length(v_meta_name) between 2 and 120 then
    v_full_name := v_meta_name;
  else
    -- fallback técnico determinístico a partir do e-mail
    v_full_name := btrim(regexp_replace(
      lower(left(split_part(coalesce(new.email, ''), '@', 1), 120)),
      '[^a-z0-9]+',
      ' ',
      'g'
    ));
    if char_length(v_full_name) < 2 then
      v_full_name := 'user';
    end if;
    v_full_name := left(v_full_name, 120);
  end if;

  -- nunca duplicar profile existente
  insert into public.profiles (id, full_name, status, version, created_at, updated_at)
  values (new.id, v_full_name, 'active', 1, now(), now())
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- 3. Privilégios mínimos
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin;

-- 4. Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();
