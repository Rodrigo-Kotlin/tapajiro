-- F2.6A — Idempotent public checkout and order operations.
-- Payment is only declared by the establishment in a later bounded domain;
-- this migration does not receive, custody or move order values.

create role tapajiro_order_owner
  with nologin noinherit nosuperuser nocreatedb nocreaterole noreplication bypassrls;

grant tapajiro_order_owner to postgres;

create function public.get_public_ordering_menu_by_slug(p_slug text)
returns table (
  product_id uuid,
  category_id uuid,
  category_name text,
  category_position integer,
  product_name text,
  product_description text,
  price_cents bigint,
  available boolean,
  product_position integer
)
language sql
security definer
stable
set search_path = pg_catalog, public, private
as $function$
  select i.source_product_id, p.category_id, i.category_name, i.category_position, i.product_name,
         i.product_description, i.price_cents, i.available, i.product_position
    from public.units u
    join public.menus m
      on m.organization_id = u.organization_id and m.unit_id = u.id
     and m.status = 'published'
    join public.menu_versions v
      on v.organization_id = m.organization_id and v.unit_id = m.unit_id
     and v.id = m.current_version_id and v.status = 'published'
    join public.menu_version_items i
      on i.organization_id = v.organization_id and i.unit_id = v.unit_id
     and i.menu_version_id = v.id
    join public.products p
      on p.organization_id = i.organization_id and p.unit_id = i.unit_id
     and p.id = i.source_product_id and p.active and p.deleted_at is null
    join public.categories c
      on c.organization_id = p.organization_id and c.unit_id = p.unit_id
     and c.id = p.category_id and c.active and c.deleted_at is null
   where u.status = 'active'
     and lower(u.slug) = lower(btrim(p_slug))
   order by i.category_position, i.product_position, i.id;
$function$;

alter function public.get_public_ordering_menu_by_slug(text) owner to tapajiro_order_owner;
revoke all on function public.get_public_ordering_menu_by_slug(text) from public, anon, authenticated, service_role;
grant execute on function public.get_public_ordering_menu_by_slug(text) to anon, authenticated;

insert into public.permissions (key, description, risk_level, active)
values
  ('order.read', 'Ler pedidos da unidade', 'medium', true),
  ('order.accept', 'Confirmar pedidos recebidos', 'high', true),
  ('order.cancel', 'Cancelar pedidos com justificativa', 'high', true),
  ('kds.operate', 'Iniciar preparo e marcar pedido pronto', 'high', true)
on conflict (key) do update
   set description = excluded.description,
       risk_level = excluded.risk_level,
       active = excluded.active;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
  from public.roles r
  cross join public.permissions p
 where r.organization_id is null
   and r.system_key = 'owner'
   and r.is_system = true
   and p.key in ('order.read', 'order.accept', 'order.cancel', 'kds.operate')
on conflict (role_id, permission_id) do nothing;

create table public.orders (
  id                    uuid        not null default extensions.gen_random_uuid() primary key,
  organization_id       uuid        not null,
  unit_id               uuid        not null,
  public_id             uuid        not null default extensions.gen_random_uuid(),
  order_number          integer     not null,
  business_date         date        not null,
  channel               text        not null default 'public_menu',
  modality              text        not null,
  status                text        not null default 'pending',
  notes                 text        null,
  subtotal_cents        bigint      not null,
  discount_cents        bigint      not null default 0,
  delivery_fee_cents    bigint      not null default 0,
  total_cents            bigint      not null,
  currency              char(3)     not null default 'BRL',
  confirmed_at          timestamptz null,
  ready_at              timestamptz null,
  cancelled_at          timestamptz null,
  created_by            uuid        null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  version               integer     not null default 1,
  constraint orders_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint orders_created_by_fkey
    foreign key (created_by)
    references public.profiles (id)
    on delete restrict,
  constraint orders_channel_check
    check (channel = 'public_menu'),
  constraint orders_modality_check
    check (modality in ('delivery', 'pickup', 'counter')),
  constraint orders_status_check
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'cancelled')),
  constraint orders_notes_check
    check (notes is null or char_length(notes) <= 1000),
  constraint orders_subtotal_check
    check (subtotal_cents >= 0),
  constraint orders_discount_check
    check (discount_cents >= 0 and discount_cents <= subtotal_cents),
  constraint orders_delivery_fee_check
    check (delivery_fee_cents >= 0 and (modality = 'delivery' or delivery_fee_cents = 0)),
  constraint orders_total_check
    check (total_cents = subtotal_cents - discount_cents + delivery_fee_cents and total_cents >= 0),
  constraint orders_currency_check
    check (currency = 'BRL'),
  constraint orders_version_check
    check (version > 0),
  constraint orders_public_id_unique
    unique (organization_id, public_id),
  constraint orders_number_unique
    unique (organization_id, unit_id, business_date, order_number),
  constraint orders_tenant_id_unique
    unique (organization_id, unit_id, id)
);

create index idx_orders_unit_status_created
  on public.orders (organization_id, unit_id, status, created_at desc);

create table public.order_customers (
  order_id               uuid        not null,
  organization_id        uuid        not null,
  unit_id                uuid        not null,
  customer_name_snapshot text        not null,
  created_at             timestamptz not null default now(),
  primary key (organization_id, unit_id, order_id),
  constraint order_customers_order_fkey
    foreign key (organization_id, unit_id, order_id)
    references public.orders (organization_id, unit_id, id)
    on delete restrict,
  constraint order_customers_name_check
    check (char_length(btrim(customer_name_snapshot)) between 2 and 120)
);

create table public.order_items (
  id                    uuid        not null default extensions.gen_random_uuid() primary key,
  organization_id       uuid        not null,
  unit_id               uuid        not null,
  order_id              uuid        not null,
  product_id            uuid        null,
  category_name_snapshot text       not null,
  product_name_snapshot text        not null,
  quantity              integer     not null,
  unit_price_cents      bigint      not null,
  line_total_cents      bigint      not null,
  notes                 text        null,
  position              integer     not null,
  created_at            timestamptz not null default now(),
  constraint order_items_order_fkey
    foreign key (organization_id, unit_id, order_id)
    references public.orders (organization_id, unit_id, id)
    on delete restrict,
  constraint order_items_quantity_check
    check (quantity > 0),
  constraint order_items_price_check
    check (unit_price_cents >= 0 and line_total_cents = unit_price_cents * quantity),
  constraint order_items_name_check
    check (char_length(btrim(product_name_snapshot)) between 1 and 120),
  constraint order_items_category_check
    check (char_length(btrim(category_name_snapshot)) between 1 and 80),
  constraint order_items_notes_check
    check (notes is null or char_length(notes) <= 500),
  constraint order_items_position_check
    check (position >= 0),
  unique (organization_id, unit_id, id)
);

create index idx_order_items_order_position
  on public.order_items (organization_id, unit_id, order_id, position);

create table public.order_status_history (
  id                uuid        not null default extensions.gen_random_uuid() primary key,
  organization_id   uuid        not null,
  unit_id           uuid        not null,
  order_id          uuid        not null,
  from_status       text        null,
  to_status         text        not null,
  actor_profile_id  uuid        null,
  source            text        not null,
  reason_text       text        null,
  occurred_at       timestamptz not null default now(),
  correlation_id    uuid        not null default extensions.gen_random_uuid(),
  constraint order_status_history_order_fkey
    foreign key (organization_id, unit_id, order_id)
    references public.orders (organization_id, unit_id, id)
    on delete restrict,
  constraint order_status_history_actor_fkey
    foreign key (actor_profile_id)
    references public.profiles (id)
    on delete restrict,
  constraint order_status_history_status_check
    check (to_status in ('pending', 'confirmed', 'preparing', 'ready', 'cancelled')),
  constraint order_status_history_source_check
    check (source in ('customer', 'operator', 'system')),
  constraint order_status_history_reason_check
    check (reason_text is null or char_length(reason_text) <= 500)
);

create index idx_order_status_history_order_time
  on public.order_status_history (organization_id, unit_id, order_id, occurred_at);

create table private.unit_order_counters (
  organization_id uuid        not null,
  unit_id         uuid        not null,
  business_date   date        not null,
  last_value      integer     not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (unit_id, business_date),
  constraint unit_order_counters_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint unit_order_counters_value_check
    check (last_value >= 0)
);

create table private.idempotency_keys (
  id                uuid        not null default extensions.gen_random_uuid() primary key,
  organization_id   uuid        not null,
  unit_id           uuid        not null,
  operation         text        not null,
  idempotency_key   uuid        not null,
  payload_hash      bytea       not null,
  resource_type     text        null,
  resource_id       uuid        null,
  response_status   integer     null,
  response_body_safe jsonb      null,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  constraint idempotency_keys_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint idempotency_keys_operation_check
    check (operation = 'public_create_order'),
  constraint idempotency_keys_unique
    unique (unit_id, operation, idempotency_key)
);

grant usage on schema public, private to tapajiro_order_owner;
grant select on public.units, public.organizations, public.profiles, public.menus,
  public.menu_versions, public.menu_version_items, public.products, public.categories
  to tapajiro_order_owner;
grant select, insert, update on public.orders, public.order_customers, public.order_items,
  public.order_status_history to tapajiro_order_owner;
grant select, insert, update on private.unit_order_counters, private.idempotency_keys to tapajiro_order_owner;
grant insert on private.audit_logs to tapajiro_order_owner;
revoke tapajiro_order_owner from anon, authenticated, service_role;

alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.order_customers enable row level security;
alter table public.order_customers force row level security;
alter table public.order_items enable row level security;
alter table public.order_items force row level security;
alter table public.order_status_history enable row level security;
alter table public.order_status_history force row level security;

revoke all on public.orders, public.order_customers, public.order_items, public.order_status_history
  from public, anon, authenticated, service_role;
grant select on public.orders, public.order_customers, public.order_items, public.order_status_history
  to authenticated;

create policy orders_select_unit
  on public.orders for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'order.read'));

create policy order_customers_select_unit
  on public.order_customers for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'order.read'));

create policy order_items_select_unit
  on public.order_items for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'order.read'));

create policy order_status_history_select_unit
  on public.order_status_history for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'order.read'));

create or replace function private.create_order_atomic(
  p_unit_slug text,
  p_idempotency_key uuid,
  p_payload jsonb
)
returns table (
  order_id uuid,
  public_id uuid,
  order_number integer,
  status text,
  subtotal_cents bigint,
  discount_cents bigint,
  delivery_fee_cents bigint,
  total_cents bigint,
  currency char(3)
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_unit public.units;
  v_menu_id uuid;
  v_menu_version_id uuid;
  v_business_date date;
  v_order_id uuid;
  v_public_id uuid;
  v_order_number integer;
  v_customer_name text;
  v_modality text;
  v_notes text;
  v_item_count integer;
  v_distinct_item_count integer;
  v_subtotal bigint := 0;
  v_payload_hash bytea;
  v_existing private.idempotency_keys;
  v_item record;
  v_product_name text;
  v_category_name text;
  v_unit_price bigint;
  v_line_total bigint;
  v_position integer := 0;
  v_response jsonb;
begin
  if p_idempotency_key is null or p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid checkout payload';
  end if;
  if p_unit_slug is null or char_length(btrim(p_unit_slug)) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'invalid unit slug';
  end if;
  if jsonb_typeof(p_payload -> 'items') <> 'array' or jsonb_array_length(p_payload -> 'items') = 0 then
    raise exception using errcode = '22023', message = 'checkout requires items';
  end if;

  select * into v_unit
    from public.units
   where lower(slug) = lower(btrim(p_unit_slug))
     and status = 'active';
  if not found then
    raise exception using errcode = 'P0002', message = 'active unit not found';
  end if;

  select m.id, m.current_version_id
    into v_menu_id, v_menu_version_id
    from public.menus m
   where m.organization_id = v_unit.organization_id
     and m.unit_id = v_unit.id
     and m.status = 'published'
     and m.current_version_id is not null;
  if v_menu_id is null or v_menu_version_id is null then
    raise exception using errcode = 'P0002', message = 'published menu not found';
  end if;

  v_payload_hash := extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256');
  insert into private.idempotency_keys (
    organization_id, unit_id, operation, idempotency_key, payload_hash, expires_at
  )
  values (
    v_unit.organization_id, v_unit.id, 'public_create_order', p_idempotency_key,
    v_payload_hash, now() + interval '24 hours'
  )
  on conflict (unit_id, operation, idempotency_key) do nothing;

  select * into v_existing
    from private.idempotency_keys
   where unit_id = v_unit.id
     and operation = 'public_create_order'
     and idempotency_key = p_idempotency_key
   for update;
  if v_existing.payload_hash <> v_payload_hash then
    raise exception using errcode = '40001', message = 'idempotency key payload conflict';
  end if;
  if v_existing.resource_id is not null then
    return query
    select o.id, o.public_id, o.order_number, o.status, o.subtotal_cents,
           o.discount_cents, o.delivery_fee_cents, o.total_cents, o.currency
      from public.orders o
     where o.id = v_existing.resource_id
       and o.organization_id = v_unit.organization_id
       and o.unit_id = v_unit.id;
    return;
  end if;

  v_customer_name := btrim(coalesce(p_payload ->> 'customer_name', ''));
  v_modality := p_payload ->> 'modality';
  v_notes := nullif(btrim(p_payload ->> 'notes'), '');
  if char_length(v_customer_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'invalid customer name';
  end if;
  if v_modality not in ('delivery', 'pickup', 'counter') then
    raise exception using errcode = '22023', message = 'invalid order modality';
  end if;
  if v_notes is not null and char_length(v_notes) > 1000 then
    raise exception using errcode = '22023', message = 'order notes too long';
  end if;

  select count(*)::integer,
         count(distinct value ->> 'product_id')::integer
    into v_item_count, v_distinct_item_count
    from jsonb_array_elements(p_payload -> 'items');
  if v_item_count <> v_distinct_item_count then
    raise exception using errcode = '22023', message = 'duplicate products in checkout';
  end if;

  v_business_date := (now() at time zone coalesce(v_unit.timezone, 'America/Santarem'))::date;
  insert into private.unit_order_counters (organization_id, unit_id, business_date, last_value)
  values (v_unit.organization_id, v_unit.id, v_business_date, 1)
  on conflict (unit_id, business_date) do update
     set last_value = private.unit_order_counters.last_value + 1,
         updated_at = now()
  returning last_value into v_order_number;

  v_order_id := extensions.gen_random_uuid();
  v_public_id := extensions.gen_random_uuid();

  for v_item in
    select * from jsonb_to_recordset(p_payload -> 'items') as item(product_id uuid, quantity integer, notes text)
  loop
    if v_item.quantity is null or v_item.quantity <= 0 or v_item.quantity > 99 then
      raise exception using errcode = '22023', message = 'invalid item quantity';
    end if;
    select i.product_name, i.category_name, i.price_cents
      into v_product_name, v_category_name, v_unit_price
      from public.menu_version_items i
     where i.organization_id = v_unit.organization_id
       and i.unit_id = v_unit.id
       and i.menu_version_id = v_menu_version_id
       and i.source_product_id = v_item.product_id
       and i.available;
    if not found then
      raise exception using errcode = 'P0001', message = 'product unavailable';
    end if;
    v_line_total := v_unit_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  insert into public.orders (
    id, organization_id, unit_id, public_id, order_number, business_date,
    modality, status, notes, subtotal_cents, total_cents
  )
  values (
    v_order_id, v_unit.organization_id, v_unit.id, v_public_id, v_order_number, v_business_date,
    v_modality, 'pending', v_notes, v_subtotal, v_subtotal
  );

  insert into public.order_customers (order_id, organization_id, unit_id, customer_name_snapshot)
  values (v_order_id, v_unit.organization_id, v_unit.id, v_customer_name);

  v_position := 0;
  for v_item in
    select * from jsonb_to_recordset(p_payload -> 'items') as item(product_id uuid, quantity integer, notes text)
  loop
    select i.product_name, i.category_name, i.price_cents
      into v_product_name, v_category_name, v_unit_price
      from public.menu_version_items i
     where i.organization_id = v_unit.organization_id
       and i.unit_id = v_unit.id
       and i.menu_version_id = v_menu_version_id
       and i.source_product_id = v_item.product_id
       and i.available;
    v_line_total := v_unit_price * v_item.quantity;
    insert into public.order_items (
      organization_id, unit_id, order_id, product_id, category_name_snapshot,
      product_name_snapshot, quantity, unit_price_cents, line_total_cents, notes, position
    ) values (
      v_unit.organization_id, v_unit.id, v_order_id, v_item.product_id, v_category_name,
      v_product_name, v_item.quantity, v_unit_price, v_line_total,
      nullif(btrim(v_item.notes), ''), v_position
    );
    v_position := v_position + 1;
  end loop;

  insert into public.order_status_history (
    organization_id, unit_id, order_id, from_status, to_status, source
  ) values (
    v_unit.organization_id, v_unit.id, v_order_id, null, 'pending', 'customer'
  );

  v_response := jsonb_build_object(
    'order_id', v_order_id,
    'public_id', v_public_id,
    'order_number', v_order_number,
    'status', 'pending',
    'subtotal_cents', v_subtotal,
    'discount_cents', 0,
    'delivery_fee_cents', 0,
    'total_cents', v_subtotal,
    'currency', 'BRL'
  );
  update private.idempotency_keys
     set resource_type = 'order', resource_id = v_order_id,
         response_status = 201, response_body_safe = v_response
   where id = v_existing.id;

  return query select v_order_id, v_public_id, v_order_number, 'pending'::text,
                      v_subtotal, 0::bigint, 0::bigint, v_subtotal, 'BRL'::char(3);
end;
$function$;

create or replace function public.create_order_atomic(
  p_unit_slug text,
  p_idempotency_key uuid,
  p_payload jsonb
)
returns table (
  order_id uuid,
  public_id uuid,
  order_number integer,
  status text,
  subtotal_cents bigint,
  discount_cents bigint,
  delivery_fee_cents bigint,
  total_cents bigint,
  currency char(3)
)
language sql
security definer
set search_path = pg_catalog, public, private
as $function$
  select * from private.create_order_atomic(p_unit_slug, p_idempotency_key, p_payload);
$function$;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to_status text,
  p_expected_version integer
)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_order public.orders;
  v_user_id uuid;
  v_permission text;
begin
  v_user_id := nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
  if p_to_status = 'confirmed' then v_permission := 'order.accept';
  elsif p_to_status = 'preparing' or p_to_status = 'ready' then v_permission := 'kds.operate';
  elsif p_to_status = 'cancelled' then v_permission := 'order.cancel';
  else raise exception using errcode = '22023', message = 'invalid target order status';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'order not found';
  end if;
  if not private.has_permission(v_user_id, v_order.organization_id, v_order.unit_id, v_permission) then
    raise exception using errcode = '42501', message = 'order status permission required';
  end if;
  if p_expected_version is null or p_expected_version <> v_order.version then
    raise exception using errcode = '40001', message = 'order version conflict';
  end if;
  if not (
    (v_order.status = 'pending' and p_to_status in ('confirmed', 'cancelled'))
    or (v_order.status = 'confirmed' and p_to_status in ('preparing', 'cancelled'))
    or (v_order.status = 'preparing' and p_to_status in ('ready', 'cancelled'))
    or (v_order.status = 'ready' and p_to_status = 'cancelled')
  ) then
    raise exception using errcode = '40001', message = 'invalid order status transition';
  end if;

  update public.orders
     set status = p_to_status,
         confirmed_at = case when p_to_status = 'confirmed' then coalesce(confirmed_at, now()) else confirmed_at end,
         ready_at = case when p_to_status = 'ready' then coalesce(ready_at, now()) else ready_at end,
         cancelled_at = case when p_to_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
         updated_at = now(), version = version + 1
   where id = p_order_id
   returning * into v_order;

  insert into public.order_status_history (
    organization_id, unit_id, order_id, from_status, to_status, actor_profile_id, source
  ) values (
    v_order.organization_id, v_order.unit_id, v_order.id,
    v_order.status, p_to_status, v_user_id, 'operator'
  );
  insert into private.audit_logs (
    organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id
  ) values (
    v_order.organization_id, v_order.unit_id, v_user_id, 'user', 'order.status.updated', 'order', v_order.id
  );
  return v_order;
end;
$function$;

alter function private.create_order_atomic(text, uuid, jsonb) owner to tapajiro_order_owner;
alter function public.create_order_atomic(text, uuid, jsonb) owner to tapajiro_order_owner;
alter function public.transition_order_status(uuid, text, integer) owner to tapajiro_order_owner;

revoke all on function private.create_order_atomic(text, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.create_order_atomic(text, uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.transition_order_status(uuid, text, integer) from public, anon, service_role;
grant execute on function public.create_order_atomic(text, uuid, jsonb) to service_role;
grant execute on function public.transition_order_status(uuid, text, integer) to authenticated;
