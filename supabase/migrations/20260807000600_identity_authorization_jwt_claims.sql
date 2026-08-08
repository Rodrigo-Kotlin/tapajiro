-- F2.5C-R4 — Read authorization identity from the JWT claims object.
-- PostgREST exposes the authenticated subject in request.jwt.claims.

create or replace function private.is_active_org_member(
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
    and p_user_id = nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
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

create or replace function private.has_unit_access(
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
    and p_user_id = nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
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

create or replace function private.has_permission(
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
    and p_user_id = nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
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
