-- +--------------------------------------+
-- | F2.2E-A — Organizations and Units    |
-- +--------------------------------------+
-- Cria as raízes do tenant e suas unidades.
-- RLS é habilitada e forçada, mas não há policies nesta etapa:
-- memberships e RBAC ainda não existem, portanto o acesso permanece negado.

-- 1. Organizations
create table public.organizations (
  id                  uuid        not null default gen_random_uuid() primary key,
  legal_name          text        not null,
  trade_name          text        not null,
  document_type       text        not null default 'cnpj',
  document_normalized text        null,
  status               text        not null default 'trial',
  default_currency     char(3)     not null default 'BRL',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  version              integer     not null default 1
);

alter table public.organizations
  add constraint organizations_legal_name_check
  check (char_length(btrim(legal_name)) between 2 and 160);

alter table public.organizations
  add constraint organizations_trade_name_check
  check (char_length(btrim(trade_name)) between 2 and 120);

alter table public.organizations
  add constraint organizations_document_type_check
  check (document_type in ('cnpj', 'cpf', 'other'));

alter table public.organizations
  add constraint organizations_document_normalized_check
  check (document_normalized is null or document_normalized ~ '^[0-9]+$');

alter table public.organizations
  add constraint organizations_status_check
  check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled'));

alter table public.organizations
  add constraint organizations_default_currency_check
  check (default_currency ~ '^[A-Z]{3}$');

alter table public.organizations
  add constraint organizations_version_check
  check (version > 0);

create unique index uq_organizations_document_active
  on public.organizations (document_normalized)
  where document_normalized is not null and status <> 'cancelled';

create index idx_organizations_status
  on public.organizations (status);

-- 2. Units
create table public.units (
  id               uuid          not null default gen_random_uuid() primary key,
  organization_id  uuid          not null,
  name             text          not null,
  public_name      text          not null,
  slug             text          not null,
  timezone         text          not null default 'America/Santarem',
  phone_normalized text          null,
  email_normalized text          null,
  status           text          not null default 'active',
  pause_reason     text          null,
  pause_until      timestamptz   null,
  street           text          null,
  number           text          null,
  district         text          null,
  city             text          null,
  state_code       char(2)       null,
  postal_code      text          null,
  latitude         numeric(9, 6) null,
  longitude        numeric(9, 6) null,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),
  version          integer       not null default 1,
  constraint units_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict,
  constraint uq_units_organization_id_id unique (organization_id, id)
);

alter table public.units
  add constraint units_name_check
  check (char_length(btrim(name)) between 2 and 120);

alter table public.units
  add constraint units_slug_check
  check (slug ~ '^[a-z0-9-]{3,80}$');

alter table public.units
  add constraint units_phone_e164_check
  check (phone_normalized is null or phone_normalized ~ '^\+[1-9]\d{6,14}$');

alter table public.units
  add constraint units_email_lowercase_check
  check (email_normalized is null or email_normalized = lower(email_normalized));

alter table public.units
  add constraint units_status_check
  check (status in ('active', 'paused', 'inactive'));

alter table public.units
  add constraint units_pause_reason_check
  check (status <> 'paused' or char_length(btrim(coalesce(pause_reason, ''))) > 0);

alter table public.units
  add constraint units_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.units
  add constraint units_longitude_check
  check (longitude is null or longitude between -180 and 180);

alter table public.units
  add constraint units_version_check
  check (version > 0);

create unique index uq_units_slug_active
  on public.units (lower(slug))
  where status <> 'inactive';

create index idx_units_organization_status
  on public.units (organization_id, status);

create index idx_units_slug
  on public.units (slug);

-- 3. Deny by default until memberships/RBAC policies exist.
alter table public.organizations enable row level security;
alter table public.organizations force row level security;
alter table public.units enable row level security;
alter table public.units force row level security;

revoke all on public.organizations from public, anon, authenticated;
revoke all on public.units from public, anon, authenticated;
