-- F2.2G-A.1 — Memberships structure
-- Creates membership data structures only.
-- RLS is enabled and forced, with deny-by-default and no policies yet.
--
-- The semantic validation that a membership role is either a system template
-- or belongs to the same organization remains pending for F2.2G-B/000700,
-- together with private.is_active_org_member, private.has_unit_access,
-- private.has_permission and the memberships/membership_units policies. This
-- migration keeps the structural role_id foreign key and does not duplicate
-- authorization logic in a trigger or helper.

-- 1. Memberships
create table public.memberships (
  id              uuid        not null default gen_random_uuid() primary key,
  organization_id uuid        not null,
  profile_id      uuid        not null,
  role_id         uuid        not null,
  status          text        not null default 'active',
  all_units       boolean     not null default false,
  joined_at       timestamptz null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  version         integer     not null default 1,
  constraint memberships_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict,
  constraint memberships_profile_id_fkey
    foreign key (profile_id)
    references public.profiles(id)
    on delete cascade,
  constraint memberships_role_id_fkey
    foreign key (role_id)
    references public.roles(id)
    on delete restrict,
  constraint uq_memberships_id_organization_id
    unique (id, organization_id)
);

alter table public.memberships
  add constraint memberships_status_check
  check (status in ('active', 'invited', 'suspended', 'revoked'));

alter table public.memberships
  add constraint memberships_version_check
  check (version > 0);

create unique index uq_memberships_organization_profile
  on public.memberships (organization_id, profile_id);

create index idx_memberships_profile_organization_status
  on public.memberships (profile_id, organization_id, status);

create index idx_memberships_organization_status
  on public.memberships (organization_id, status);

-- 2. Membership-to-unit restrictions
create table public.membership_units (
  membership_id   uuid        not null,
  organization_id uuid        not null,
  unit_id         uuid        not null,
  created_at      timestamptz not null default now(),
  constraint membership_units_pkey
    primary key (membership_id, unit_id),
  constraint membership_units_membership_id_fkey
    foreign key (membership_id)
    references public.memberships(id)
    on delete cascade,
  constraint membership_units_membership_organization_fkey
    foreign key (membership_id, organization_id)
    references public.memberships(id, organization_id)
    on delete cascade,
  constraint membership_units_unit_organization_fkey
    foreign key (organization_id, unit_id)
    references public.units(organization_id, id)
    on delete cascade
);

create index idx_membership_units_organization_unit
  on public.membership_units (organization_id, unit_id);

-- 3. RLS and grants: policies/helpers are intentionally deferred.
alter table public.memberships enable row level security;
alter table public.memberships force row level security;
alter table public.membership_units enable row level security;
alter table public.membership_units force row level security;

revoke all on public.memberships from public, anon, authenticated;
revoke all on public.membership_units from public, anon, authenticated;
