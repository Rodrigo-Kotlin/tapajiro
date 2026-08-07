-- F2.2J-C — First organization and unit bootstrap
-- Creates the global owner catalog and the atomic onboarding RPC.
-- No users, organizations, units or financial records are seeded.

-- 1. Global owner catalog
insert into public.permissions (key, description, risk_level, active)
values
  ('organization.read', 'Ler dados da organização', 'low', true),
  ('organization.update', 'Alterar dados da organização', 'high', true),
  ('unit.read', 'Ler unidade autorizada', 'low', true),
  ('unit.update', 'Alterar dados da unidade', 'high', true),
  ('unit.pause_orders', 'Pausar ou reabrir pedidos', 'high', true),
  ('team.read', 'Consultar equipe e papéis', 'medium', true),
  ('team.invite', 'Convidar usuário', 'high', true),
  ('team.manage', 'Alterar papel, unidade ou situação de membro', 'critical', true),
  ('role.manage', 'Gerenciar papéis e permissões', 'critical', true)
on conflict (key) do update
   set description = excluded.description,
       risk_level = excluded.risk_level,
       active = excluded.active;

insert into public.roles (organization_id, name, system_key, is_system, active)
values (null, 'Proprietário', 'owner', true, true)
on conflict (system_key) where is_system = true do update
   set name = excluded.name,
       active = excluded.active;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
  from public.roles r
  cross join public.permissions p
 where r.organization_id is null
   and r.system_key = 'owner'
   and r.is_system = true
   and p.key in (
     'organization.read',
     'organization.update',
     'unit.read',
     'unit.update',
     'unit.pause_orders',
     'team.read',
     'team.invite',
     'team.manage',
     'role.manage'
   )
on conflict (role_id, permission_id) do nothing;

-- 2. Dedicated write owner for the bootstrap RPC.
create role tapajiro_bootstrap_owner
  with nosuperuser
       nologin
       noinherit
       nocreatedb
       nocreaterole
       noreplication
       bypassrls;

grant usage, create on schema private
  to tapajiro_bootstrap_owner;

grant usage, create on schema public
  to tapajiro_bootstrap_owner;

grant select on public.profiles,
               public.memberships,
               public.roles
  to tapajiro_bootstrap_owner;

grant insert on public.organizations,
               public.units,
               public.memberships
  to tapajiro_bootstrap_owner;

-- Managed Supabase roles may retain this membership with inherit/set disabled.
grant tapajiro_bootstrap_owner to postgres;

-- 3. Atomic onboarding RPC.
create function public.create_first_organization(
  p_legal_name text,
  p_trade_name text,
  p_unit_name text,
  p_unit_public_name text,
  p_unit_slug text,
  p_timezone text default 'America/Santarem'
)
returns table (
  organization_id uuid,
  unit_id uuid,
  unit_slug text,
  organization_status text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_unit_id uuid;
  v_unit_slug text;
  v_legal_name text;
  v_trade_name text;
  v_unit_name text;
  v_unit_public_name text;
  v_timezone text;
  v_owner_role_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'auth_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  if not exists (
    select 1
      from public.profiles p
     where p.id = v_user_id
       and p.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'profile_required';
  end if;

  if exists (
    select 1
      from public.memberships m
     where m.profile_id = v_user_id
       and m.status = 'active'
  ) then
    raise exception using errcode = 'P0001', message = 'bootstrap_already_completed';
  end if;

  v_legal_name := btrim(coalesce(p_legal_name, ''));
  v_trade_name := btrim(coalesce(p_trade_name, ''));
  v_unit_name := btrim(coalesce(p_unit_name, ''));
  v_unit_public_name := btrim(coalesce(p_unit_public_name, ''));
  v_timezone := nullif(btrim(coalesce(p_timezone, '')), '');

  if v_legal_name = '' or char_length(v_legal_name) not between 2 and 160
     or v_trade_name = '' or char_length(v_trade_name) not between 2 and 120
     or v_unit_name = '' or char_length(v_unit_name) not between 2 and 120
     or v_unit_public_name = '' or char_length(v_unit_public_name) not between 2 and 120 then
    raise exception using errcode = 'P0001', message = 'invalid_name';
  end if;

  if v_timezone is null then
    v_timezone := 'America/Santarem';
  end if;

  -- Deterministic ASCII slug normalization without introducing an extension.
  v_unit_slug := lower(btrim(coalesce(p_unit_slug, '')));
  v_unit_slug := translate(
    v_unit_slug,
    'áàãâäåéèêëíìîïóòõôöúùûüçñ',
    'aaaaaaeeeeiiiiooooouuuucn'
  );
  v_unit_slug := regexp_replace(v_unit_slug, '[^a-z0-9]+', '-', 'g');
  v_unit_slug := btrim(v_unit_slug, '-');

  if char_length(v_unit_slug) not between 3 and 80 then
    raise exception using errcode = 'P0001', message = 'invalid_unit_slug';
  end if;

  select r.id
    into v_owner_role_id
    from public.roles r
   where r.organization_id is null
     and r.system_key = 'owner'
     and r.is_system = true
     and r.active = true;

  if v_owner_role_id is null then
    raise exception using errcode = 'P0001', message = 'owner_role_missing';
  end if;

  insert into public.organizations (
    legal_name,
    trade_name,
    document_type,
    document_normalized,
    status
  )
  values (v_legal_name, v_trade_name, 'other', null, 'trial')
  returning id into v_organization_id;

  begin
    insert into public.units (
      organization_id,
      name,
      public_name,
      slug,
      timezone,
      status
    )
    values (
      v_organization_id,
      v_unit_name,
      v_unit_public_name,
      v_unit_slug,
      v_timezone,
      'active'
    )
    returning id into v_unit_id;
  exception
    when unique_violation then
      raise exception using errcode = 'P0001', message = 'unit_slug_conflict';
  end;

  insert into public.memberships (
    organization_id,
    profile_id,
    role_id,
    status,
    all_units,
    joined_at
  )
  values (
    v_organization_id,
    v_user_id,
    v_owner_role_id,
    'active',
    true,
    now()
  );

  return query
  select v_organization_id, v_unit_id, v_unit_slug, 'trial'::text;
end;
$function$;

revoke all on function public.create_first_organization(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_first_organization(text, text, text, text, text, text)
  to authenticated;

alter function public.create_first_organization(text, text, text, text, text, text)
  owner to tapajiro_bootstrap_owner;

revoke create on schema private
  from tapajiro_bootstrap_owner;

revoke create on schema public
  from tapajiro_bootstrap_owner;

-- 4. Read-only access after bootstrap; all writes stay inside the RPC.
grant select on public.organizations, public.units to authenticated;

create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (private.is_active_org_member(auth.uid(), id));

create policy units_select_member
  on public.units
  for select
  to authenticated
  using (private.has_unit_access(auth.uid(), organization_id, id));

revoke insert, update, delete on public.organizations, public.units, public.memberships
  from public, anon, authenticated, service_role;
