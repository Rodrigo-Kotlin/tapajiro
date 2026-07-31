-- F2.2F — Roles and permissions foundation
-- Estrutura de RBAC sem memberships, policies ou seed de dados.
-- O acesso permanece deny-by-default até a etapa de memberships/RLS.

-- 1. Roles
create table public.roles (
  id              uuid        not null default gen_random_uuid() primary key,
  organization_id uuid        null,
  name            text        not null,
  system_key      text        null,
  is_system       boolean     not null default false,
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint roles_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict
);

alter table public.roles
  add constraint roles_name_check
  check (char_length(btrim(name)) between 2 and 80);

alter table public.roles
  add constraint roles_system_key_check
  check (system_key is null or system_key in (
    'owner', 'manager', 'attendant', 'cashier',
    'kitchen', 'dispatch', 'driver', 'finance'
  ));

alter table public.roles
  add constraint roles_system_identity_check
  check (
    (is_system and organization_id is null and system_key is not null)
    or
    (not is_system and organization_id is not null and system_key is null)
  );

create unique index uq_roles_system_key
  on public.roles (system_key)
  where is_system = true;

create unique index uq_roles_organization_name
  on public.roles (organization_id, lower(name))
  where organization_id is not null;

-- 2. Permissions catalog
create table public.permissions (
  id          uuid    not null default gen_random_uuid() primary key,
  key         text    not null,
  description text    not null,
  risk_level  text    not null,
  active      boolean not null default true,
  constraint permissions_key_unique unique (key)
);

alter table public.permissions
  add constraint permissions_key_check
  check (key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$');

alter table public.permissions
  add constraint permissions_description_check
  check (char_length(btrim(description)) > 0);

alter table public.permissions
  add constraint permissions_risk_level_check
  check (risk_level in ('low', 'medium', 'high', 'critical'));

-- 3. Role-permission association
create table public.role_permissions (
  role_id       uuid        not null,
  permission_id uuid        not null,
  created_at    timestamptz not null default now(),
  created_by    uuid        null,
  constraint role_permissions_pkey primary key (role_id, permission_id),
  constraint role_permissions_role_id_fkey
    foreign key (role_id)
    references public.roles(id)
    on delete cascade,
  constraint role_permissions_permission_id_fkey
    foreign key (permission_id)
    references public.permissions(id)
    on delete restrict,
  constraint role_permissions_created_by_fkey
    foreign key (created_by)
    references public.profiles(id)
    on delete set null
);

create index idx_role_permissions_permission_id
  on public.role_permissions (permission_id);

-- 4. RLS and grants: no policies exist at this stage.
alter table public.roles enable row level security;
alter table public.roles force row level security;
alter table public.permissions enable row level security;
alter table public.permissions force row level security;
alter table public.role_permissions enable row level security;
alter table public.role_permissions force row level security;

revoke all on public.roles from public, anon, authenticated;
revoke all on public.permissions from public, anon, authenticated;
revoke all on public.role_permissions from public, anon, authenticated;
