-- +---------------------------+
-- | F2.2C — Identity Profiles |
-- +---------------------------+
-- Cria public.profiles como extensão de auth.users.
-- RLS: leitura do próprio perfil; mutações bloqueadas na Data API.
-- Sem trigger, RPC ou seed.
--
-- on delete cascade conforme contrato (§2.1 e §3.1):
--   profile é extensão do usuário; usuário removido leva profile.

-- 1. Tabela
create table public.profiles (
  id               uuid         not null primary key references auth.users(id) on delete cascade,
  full_name        text         not null,
  phone_normalized text         null,
  avatar_path      text         null,
  status           text         not null default 'active',
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now(),
  version          integer      not null default 1
);

-- 2. Constraints
alter table public.profiles
  add constraint profiles_full_name_check check (char_length(btrim(full_name)) >= 2 and char_length(btrim(full_name)) <= 120);

alter table public.profiles
  add constraint profiles_phone_e164_check check (phone_normalized is null or phone_normalized ~ '^\+[1-9]\d{6,14}$');

alter table public.profiles
  add constraint profiles_status_check check (status in ('active', 'blocked'));

alter table public.profiles
  add constraint profiles_version_check check (version > 0);

-- 4. RLS
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- 5. Grants
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

-- 6. Policies
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());
