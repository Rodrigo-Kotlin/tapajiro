-- F2.2H-B — Dedicated owner for authorization SECURITY DEFINER functions
-- The role is NOLOGIN and is not granted to any application role.
-- BYPASSRLS is intentionally limited to this non-login technical owner so
-- helpers can read authorization tables protected by FORCE ROW LEVEL SECURITY.

create role tapajiro_authorization_owner
  with nologin
       noinherit
       nocreatedb
       nocreaterole
       noreplication
       bypassrls;

grant usage, create on schema private
  to tapajiro_authorization_owner;

grant select on public.memberships,
               public.membership_units,
               public.organizations,
               public.units,
               public.roles,
               public.role_permissions,
               public.permissions
  to tapajiro_authorization_owner;

-- PostgreSQL requires the current role to be a member of the target owner
-- when transferring ownership without superuser privileges. In Supabase,
-- this administrative membership is managed by supabase_admin; postgres
-- cannot revoke it. inherit_option and set_option remain disabled.
grant tapajiro_authorization_owner to postgres;

alter function private.is_active_org_member(uuid, uuid)
  owner to tapajiro_authorization_owner;
alter function private.has_unit_access(uuid, uuid, uuid)
  owner to tapajiro_authorization_owner;
alter function private.has_permission(uuid, uuid, uuid, text)
  owner to tapajiro_authorization_owner;
alter function private.validate_membership_role_organization()
  owner to tapajiro_authorization_owner;

revoke create on schema private
  from tapajiro_authorization_owner;
