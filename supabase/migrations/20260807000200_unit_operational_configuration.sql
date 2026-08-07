-- F2.4B — Unit operational configuration
-- Settings and hours are tenant-scoped. Client mutations are RPC-only.

create table private.audit_logs (
  id                 uuid        not null default gen_random_uuid() primary key,
  organization_id    uuid        null,
  unit_id            uuid        null,
  actor_profile_id   uuid        null,
  actor_type         text        not null,
  action             text        not null,
  resource_type      text        not null,
  resource_id        uuid        null,
  safe_diff          jsonb       not null default '{}'::jsonb,
  ip_hash            bytea       null,
  user_agent_summary text        null,
  correlation_id     uuid        not null default gen_random_uuid(),
  occurred_at        timestamptz not null default now(),
  constraint audit_logs_actor_type_check
    check (actor_type in ('user', 'support', 'system', 'integration'))
);

create index idx_audit_logs_organization_occurred_at
  on private.audit_logs (organization_id, occurred_at desc);
create index idx_audit_logs_resource
  on private.audit_logs (resource_type, resource_id, occurred_at);

revoke all on private.audit_logs from public, anon, authenticated, service_role;

create function private.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $function$
begin
  raise exception using errcode = '42501', message = 'audit logs are append-only';
end;
$function$;

revoke all on function private.prevent_audit_log_mutation() from public, anon, authenticated, service_role;

create trigger audit_logs_no_update
  before update or delete on private.audit_logs
  for each row execute function private.prevent_audit_log_mutation();

create table public.unit_settings (
  unit_id                  uuid        not null,
  organization_id          uuid        not null,
  delivery_enabled         boolean     not null default true,
  pickup_enabled           boolean     not null default true,
  counter_enabled          boolean     not null default false,
  accept_immediate_orders  boolean     not null default true,
  delivery_minimum_cents   bigint      not null default 0,
  pickup_minimum_cents     bigint      not null default 0,
  counter_minimum_cents    bigint      not null default 0,
  operational_message      text        null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  version                  integer     not null default 1,
  constraint unit_settings_pkey primary key (unit_id),
  constraint unit_settings_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint unit_settings_delivery_minimum_check check (delivery_minimum_cents >= 0),
  constraint unit_settings_pickup_minimum_check check (pickup_minimum_cents >= 0),
  constraint unit_settings_counter_minimum_check check (counter_minimum_cents >= 0),
  constraint unit_settings_message_check check (
    operational_message is null
    or char_length(btrim(operational_message)) <= 240
  ),
  constraint unit_settings_version_check check (version > 0)
);

create table public.business_hours (
  id                 uuid        not null default gen_random_uuid() primary key,
  organization_id    uuid        not null,
  unit_id            uuid        not null,
  weekday            smallint    not null,
  sequence           smallint    not null,
  opens_at           time        not null,
  closes_at          time        not null,
  crosses_midnight   boolean     not null default false,
  active             boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint business_hours_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint business_hours_weekday_check check (weekday between 0 and 6),
  constraint business_hours_sequence_check check (sequence >= 1),
  constraint business_hours_times_check check (
    opens_at <> closes_at
    and (crosses_midnight or closes_at > opens_at)
  ),
  constraint uq_business_hours_unit_weekday_sequence
    unique (unit_id, weekday, sequence)
);

create index idx_business_hours_organization_unit_weekday
  on public.business_hours (organization_id, unit_id, weekday);

insert into public.unit_settings (unit_id, organization_id)
select u.id, u.organization_id
  from public.units u;

alter table public.unit_settings enable row level security;
alter table public.unit_settings force row level security;
alter table public.business_hours enable row level security;
alter table public.business_hours force row level security;

revoke all on public.unit_settings, public.business_hours
  from public, anon, authenticated, service_role;
grant select on public.unit_settings, public.business_hours to authenticated;

create policy unit_settings_select
  on public.unit_settings for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'unit.read'));

create policy business_hours_select
  on public.business_hours for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'unit.read'));

create role tapajiro_unit_operations_owner
  with nologin noinherit nocreatedb nocreaterole noreplication bypassrls;
grant usage on schema public, private to tapajiro_unit_operations_owner;
grant select, update on public.units to tapajiro_unit_operations_owner;
grant select, insert, update on public.unit_settings to tapajiro_unit_operations_owner;
grant select, insert, delete on public.business_hours to tapajiro_unit_operations_owner;
grant insert on private.audit_logs to tapajiro_unit_operations_owner;
grant tapajiro_unit_operations_owner to postgres;

create function public.update_unit_operational_settings(
  p_organization_id uuid,
  p_unit_id uuid,
  p_delivery_enabled boolean,
  p_pickup_enabled boolean,
  p_counter_enabled boolean,
  p_accept_immediate_orders boolean,
  p_delivery_minimum_cents bigint,
  p_pickup_minimum_cents bigint,
  p_counter_minimum_cents bigint,
  p_operational_message text
)
returns public.unit_settings
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_old public.unit_settings;
  v_new public.unit_settings;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'unit.update') then
    raise exception using errcode = '42501', message = 'unit update permission required';
  end if;

  select * into v_old
    from public.unit_settings
   where unit_id = p_unit_id and organization_id = p_organization_id
   for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'unit settings not found';
  end if;

  update public.unit_settings
     set delivery_enabled = p_delivery_enabled,
         pickup_enabled = p_pickup_enabled,
         counter_enabled = p_counter_enabled,
         accept_immediate_orders = p_accept_immediate_orders,
         delivery_minimum_cents = p_delivery_minimum_cents,
         pickup_minimum_cents = p_pickup_minimum_cents,
         counter_minimum_cents = p_counter_minimum_cents,
         operational_message = nullif(btrim(p_operational_message), ''),
         updated_at = now(),
         version = version + 1
   where unit_id = p_unit_id and organization_id = p_organization_id
   returning * into v_new;

  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id, safe_diff)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'unit.settings.updated', 'unit_settings', p_unit_id,
          jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_new)));

  return v_new;
end;
$function$;

create function public.set_unit_operational_status(
  p_organization_id uuid,
  p_unit_id uuid,
  p_status text,
  p_pause_reason text default null,
  p_pause_until timestamptz default null
)
returns public.units
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_old public.units;
  v_new public.units;
  v_permission text := case when p_status = 'paused' then 'unit.pause_orders' else 'unit.update' end;
begin
  if p_status not in ('active', 'paused', 'inactive') then
    raise exception using errcode = '23514', message = 'invalid unit status';
  end if;
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, v_permission) then
    raise exception using errcode = '42501', message = 'unit status permission required';
  end if;

  select * into v_old from public.units
   where id = p_unit_id and organization_id = p_organization_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'unit not found';
  end if;

  update public.units
     set status = p_status,
         pause_reason = case when p_status = 'paused' then nullif(btrim(p_pause_reason), '') else null end,
         pause_until = case when p_status = 'paused' then p_pause_until else null end,
         updated_at = now(),
         version = version + 1
   where id = p_unit_id and organization_id = p_organization_id
   returning * into v_new;

  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id, safe_diff)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'unit.status.updated', 'unit', p_unit_id,
          jsonb_build_object('old', to_jsonb(v_old), 'new', to_jsonb(v_new)));
  return v_new;
end;
$function$;

create function public.replace_business_hours(
  p_organization_id uuid,
  p_unit_id uuid,
  p_hours jsonb
)
returns setof public.business_hours
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'unit.update') then
    raise exception using errcode = '42501', message = 'unit update permission required';
  end if;
  if jsonb_typeof(p_hours) <> 'array' then
    raise exception using errcode = '22023', message = 'hours must be a JSON array';
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.weekday, h.sequence), '[]'::jsonb)
    into v_old
    from public.business_hours h
   where h.organization_id = p_organization_id and h.unit_id = p_unit_id;

  delete from public.business_hours
   where organization_id = p_organization_id and unit_id = p_unit_id;

  insert into public.business_hours (organization_id, unit_id, weekday, sequence, opens_at, closes_at, crosses_midnight, active)
  select p_organization_id, p_unit_id, h.weekday, h.sequence, h.opens_at, h.closes_at,
         coalesce(h.crosses_midnight, false), coalesce(h.active, true)
    from jsonb_to_recordset(p_hours) as h(
      weekday smallint, sequence smallint, opens_at time, closes_at time,
      crosses_midnight boolean, active boolean
    );

  if exists (
    with segments as (
      select id, weekday as segment_weekday,
             extract(epoch from opens_at)::bigint as segment_start,
             case when crosses_midnight then 86400 else extract(epoch from closes_at)::bigint end as segment_end
        from public.business_hours
       where organization_id = p_organization_id and unit_id = p_unit_id and active
      union all
      select id, (weekday + 1) % 7,
             0, extract(epoch from closes_at)::bigint
        from public.business_hours
       where organization_id = p_organization_id and unit_id = p_unit_id and active and crosses_midnight
    )
    select 1 from segments a join segments b
      on a.id < b.id
     and a.segment_weekday = b.segment_weekday
     and greatest(a.segment_start, b.segment_start) < least(a.segment_end, b.segment_end)
  ) then
    raise exception using errcode = '23514', message = 'business hours overlap';
  end if;

  select coalesce(jsonb_agg(to_jsonb(h) order by h.weekday, h.sequence), '[]'::jsonb)
    into v_new
    from public.business_hours h
   where h.organization_id = p_organization_id and h.unit_id = p_unit_id;

  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id, safe_diff)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'business_hours.replaced', 'business_hours', p_unit_id,
          jsonb_build_object('old', v_old, 'new', v_new));

  return query select h from public.business_hours h
   where h.organization_id = p_organization_id and h.unit_id = p_unit_id
   order by h.weekday, h.sequence;
end;
$function$;

revoke all on function public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.set_unit_operational_status(uuid, uuid, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.replace_business_hours(uuid, uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text) to authenticated;
grant execute on function public.set_unit_operational_status(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.replace_business_hours(uuid, uuid, jsonb) to authenticated;

alter function public.update_unit_operational_settings(uuid, uuid, boolean, boolean, boolean, boolean, bigint, bigint, bigint, text) owner to tapajiro_unit_operations_owner;
alter function public.set_unit_operational_status(uuid, uuid, text, text, timestamptz) owner to tapajiro_unit_operations_owner;
alter function public.replace_business_hours(uuid, uuid, jsonb) owner to tapajiro_unit_operations_owner;
revoke create on schema public, private from tapajiro_unit_operations_owner;
