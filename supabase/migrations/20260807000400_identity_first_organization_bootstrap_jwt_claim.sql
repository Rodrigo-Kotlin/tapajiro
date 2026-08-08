-- F2.2J-D — Read the bootstrap identity from the JWT claim.
-- The dedicated function owner cannot access Supabase's auth schema.

create or replace function public.create_first_organization(
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
  v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;

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
