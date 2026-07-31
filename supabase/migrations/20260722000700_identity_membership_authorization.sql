-- F2.2G-B — Authorization helpers and memberships RLS
-- Completes the authorization boundary for memberships and membership_units.
-- No seed, user, organization, unit or financial table is created here.
--
-- Ownership note: functions are owned by the migration executor (postgres in
-- the current foundation). The baseline does not provision a no-login owner;
-- fixed search_path, schema-qualified SQL and explicit revokes mitigate this
-- risk, which remains a production ownership review item.

-- 1. Structural role/organization validation
-- System templates are global; custom roles must belong to the membership tenant.
create function private.validate_membership_role_organization()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_role_organization_id uuid;
  v_role_is_system boolean;
begin
  select r.organization_id, r.is_system
    into v_role_organization_id, v_role_is_system
    from public.roles r
   where r.id = new.role_id;

  if not found then
    return new;
  end if;

  if not (
    (v_role_is_system and v_role_organization_id is null)
    or
    (not v_role_is_system and v_role_organization_id = new.organization_id)
  ) then
    raise exception using
      errcode = '23503',
      message = 'membership role does not belong to organization';
  end if;

  return new;
end;
$function$;

revoke all on function private.validate_membership_role_organization() from public, anon, authenticated;

create trigger memberships_validate_role_organization
  before insert or update of organization_id, role_id
  on public.memberships
  for each row
  execute function private.validate_membership_role_organization();

-- 2. Authorization helpers
create function private.is_active_org_member(
  p_user_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
  select
    p_user_id is not null
    and p_organization_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
        from public.memberships m
        join public.organizations o on o.id = m.organization_id
       where m.profile_id = p_user_id
         and m.organization_id = p_organization_id
         and m.status = 'active'
         and o.status in ('trial', 'active')
    );
$function$;

create function private.has_unit_access(
  p_user_id uuid,
  p_organization_id uuid,
  p_unit_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
  select
    p_user_id is not null
    and p_organization_id is not null
    and p_unit_id is not null
    and p_user_id = auth.uid()
    and exists (
      select 1
        from public.memberships m
        join public.organizations o on o.id = m.organization_id
        join public.units u
          on u.organization_id = m.organization_id
         and u.id = p_unit_id
       where m.profile_id = p_user_id
         and m.organization_id = p_organization_id
         and m.status = 'active'
         and o.status in ('trial', 'active')
         and (
           m.all_units
           or exists (
             select 1
               from public.membership_units mu
              where mu.membership_id = m.id
                and mu.organization_id = p_organization_id
                and mu.unit_id = p_unit_id
           )
         )
    );
$function$;

create function private.has_permission(
  p_user_id uuid,
  p_organization_id uuid,
  p_unit_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $function$
  select
    p_user_id is not null
    and p_organization_id is not null
    and p_permission_key is not null
    and p_user_id = auth.uid()
    and private.is_active_org_member(p_user_id, p_organization_id)
    and (
      p_unit_id is null
      or private.has_unit_access(p_user_id, p_organization_id, p_unit_id)
    )
    and exists (
      select 1
        from public.memberships m
        join public.roles r on r.id = m.role_id
        join public.role_permissions rp on rp.role_id = r.id
        join public.permissions p on p.id = rp.permission_id
       where m.profile_id = p_user_id
         and m.organization_id = p_organization_id
         and m.status = 'active'
         and r.active
         and p.active
         and p.key = p_permission_key
    );
$function$;

-- 3. Helper privileges: callable by authenticated policies only.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

revoke all on function private.is_active_org_member(uuid, uuid) from public, anon, authenticated;
revoke all on function private.has_unit_access(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.has_permission(uuid, uuid, uuid, text) from public, anon, authenticated;

grant execute on function private.is_active_org_member(uuid, uuid) to authenticated;
grant execute on function private.has_unit_access(uuid, uuid, uuid) to authenticated;
grant execute on function private.has_permission(uuid, uuid, uuid, text) to authenticated;

-- 4. Read access is policy-controlled; mutations remain RPC-only.
grant select on public.memberships, public.membership_units to authenticated;

create policy memberships_select_own
  on public.memberships
  for select
  to authenticated
  using (profile_id = auth.uid());

create policy memberships_select_team
  on public.memberships
  for select
  to authenticated
  using (private.has_permission(auth.uid(), organization_id, null, 'team.read'));

create policy membership_units_select_own
  on public.membership_units
  for select
  to authenticated
  using (private.has_unit_access(auth.uid(), organization_id, unit_id));

create policy membership_units_select_team
  on public.membership_units
  for select
  to authenticated
  using (private.has_permission(auth.uid(), organization_id, null, 'team.read'));
