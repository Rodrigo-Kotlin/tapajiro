-- F2.5B — Catalog MVP
-- Simple products only. Variants, options, images and Storage are out of scope.

create extension if not exists pgcrypto;

insert into public.permissions (key, description, risk_level, active)
values
  ('catalog.read', 'Ler o catálogo da unidade', 'low', true),
  ('catalog.manage', 'Criar e editar o catálogo da unidade', 'high', true),
  ('catalog.publish', 'Publicar o catálogo da unidade', 'high', true)
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
   and p.key in ('catalog.read', 'catalog.manage', 'catalog.publish')
on conflict (role_id, permission_id) do nothing;

create table public.menus (
  id                   uuid        not null default gen_random_uuid() primary key,
  organization_id      uuid        not null,
  unit_id              uuid        not null,
  name                 text        not null default 'Cardápio principal',
  status               text        not null default 'draft',
  current_version_id   uuid        null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  version              integer     not null default 1,
  constraint menus_unit_fkey
    foreign key (organization_id, unit_id)
    references public.units (organization_id, id)
    on delete restrict,
  constraint menus_name_check
    check (char_length(btrim(name)) between 2 and 100),
  constraint menus_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint menus_version_check
    check (version > 0),
  constraint uq_menus_organization_unit_id
    unique (organization_id, unit_id, id)
);

create unique index uq_menus_active_unit
  on public.menus (organization_id, unit_id)
  where status <> 'archived';

create table public.menu_versions (
  id                 uuid        not null default gen_random_uuid() primary key,
  organization_id    uuid        not null,
  unit_id            uuid        not null,
  menu_id            uuid        not null,
  version_number     integer     not null,
  status             text        not null default 'draft',
  checksum           text        null,
  created_at         timestamptz not null default now(),
  published_at       timestamptz null,
  published_by       uuid        null,
  constraint menu_versions_menu_fkey
    foreign key (organization_id, unit_id, menu_id)
    references public.menus (organization_id, unit_id, id)
    on delete restrict,
  constraint menu_versions_published_by_fkey
    foreign key (published_by)
    references public.profiles (id)
    on delete restrict,
  constraint menu_versions_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint menu_versions_number_check
    check (version_number > 0),
  constraint menu_versions_checksum_check
    check (status = 'draft' or checksum is not null),
  constraint menu_versions_published_at_check
    check (status = 'draft' or published_at is not null),
  constraint menu_versions_published_by_check
    check (status = 'draft' or published_by is not null),
  constraint uq_menu_versions_menu_number
    unique (organization_id, unit_id, menu_id, version_number),
  constraint uq_menu_versions_organization_unit_id
    unique (organization_id, unit_id, id)
);

create unique index uq_menu_versions_one_draft
  on public.menu_versions (organization_id, unit_id, menu_id)
  where status = 'draft';

create unique index uq_menu_versions_one_published
  on public.menu_versions (organization_id, unit_id, menu_id)
  where status = 'published';

alter table public.menus
  add constraint menus_current_version_fkey
  foreign key (organization_id, unit_id, current_version_id)
  references public.menu_versions (organization_id, unit_id, id)
  on delete restrict;

create table public.categories (
  id                 uuid        not null default gen_random_uuid() primary key,
  organization_id    uuid        not null,
  unit_id            uuid        not null,
  menu_id            uuid        not null,
  name               text        not null,
  description        text        null,
  position           integer     not null default 0,
  active             boolean     not null default true,
  deleted_at         timestamptz null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  version            integer     not null default 1,
  constraint categories_menu_fkey
    foreign key (organization_id, unit_id, menu_id)
    references public.menus (organization_id, unit_id, id)
    on delete restrict,
  constraint categories_name_check
    check (char_length(btrim(name)) between 1 and 80),
  constraint categories_description_check
    check (description is null or char_length(description) <= 500),
  constraint categories_position_check
    check (position >= 0),
  constraint categories_version_check
    check (version > 0),
  constraint uq_categories_organization_unit_id
    unique (organization_id, unit_id, id)
);

create index idx_categories_unit_menu_position
  on public.categories (organization_id, unit_id, menu_id, active, position, id);

create table public.products (
  id                 uuid        not null default gen_random_uuid() primary key,
  organization_id    uuid        not null,
  unit_id            uuid        not null,
  category_id        uuid        not null,
  name               text        not null,
  description        text        null,
  price_cents        bigint      not null,
  active             boolean     not null default true,
  available          boolean     not null default true,
  position           integer     not null default 0,
  sku                text        null,
  deleted_at         timestamptz null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  version            integer     not null default 1,
  constraint products_category_fkey
    foreign key (organization_id, unit_id, category_id)
    references public.categories (organization_id, unit_id, id)
    on delete restrict,
  constraint products_name_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint products_description_check
    check (description is null or char_length(description) <= 2000),
  constraint products_price_cents_check
    check (price_cents >= 0),
  constraint products_position_check
    check (position >= 0),
  constraint products_sku_check
    check (sku is null or char_length(btrim(sku)) between 1 and 80),
  constraint products_version_check
    check (version > 0),
  constraint uq_products_organization_unit_id
    unique (organization_id, unit_id, id)
);

create unique index uq_products_unit_sku
  on public.products (organization_id, unit_id, lower(sku))
  where sku is not null and deleted_at is null;

create index idx_products_category_position
  on public.products (organization_id, unit_id, category_id, active, position, id);

create table public.menu_version_items (
  id                   uuid        not null default gen_random_uuid() primary key,
  organization_id      uuid        not null,
  unit_id              uuid        not null,
  menu_version_id      uuid        not null,
  source_product_id    uuid        null,
  category_name        text        not null,
  category_position    integer     not null,
  product_name         text        not null,
  product_description  text        null,
  price_cents          bigint      not null,
  available            boolean     not null,
  product_position     integer     not null,
  created_at           timestamptz not null default now(),
  constraint menu_version_items_version_fkey
    foreign key (organization_id, unit_id, menu_version_id)
    references public.menu_versions (organization_id, unit_id, id)
    on delete restrict,
  constraint menu_version_items_category_position_check
    check (category_position >= 0),
  constraint menu_version_items_product_position_check
    check (product_position >= 0),
  constraint menu_version_items_price_cents_check
    check (price_cents >= 0),
  constraint menu_version_items_product_name_check
    check (char_length(btrim(product_name)) between 1 and 120),
  constraint menu_version_items_description_check
    check (product_description is null or char_length(product_description) <= 2000),
  constraint uq_menu_version_items_product
    unique (organization_id, unit_id, menu_version_id, source_product_id)
);

create index idx_menu_version_items_order
  on public.menu_version_items (organization_id, unit_id, menu_version_id, category_position, product_position, id);

create function private.prevent_menu_version_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  raise exception using errcode = '42501', message = 'published snapshot is immutable';
end;
$function$;

revoke all on function private.prevent_menu_version_item_mutation() from public, anon, authenticated, service_role;

create trigger menu_version_items_immutable
  before update or delete on public.menu_version_items
  for each row execute function private.prevent_menu_version_item_mutation();

create function private.prevent_published_version_content_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  if old.status = 'published' and (
    new.organization_id <> old.organization_id
    or new.unit_id <> old.unit_id
    or new.menu_id <> old.menu_id
    or new.version_number <> old.version_number
    or new.checksum is distinct from old.checksum
    or new.published_at is distinct from old.published_at
    or new.published_by is distinct from old.published_by
    or new.created_at <> old.created_at
  ) then
    raise exception using errcode = '42501', message = 'published version is immutable';
  end if;
  return new;
end;
$function$;

revoke all on function private.prevent_published_version_content_mutation() from public, anon, authenticated, service_role;

create trigger menu_versions_published_immutable
  before update on public.menu_versions
  for each row execute function private.prevent_published_version_content_mutation();

create function private.ensure_catalog_menu(
  p_organization_id uuid,
  p_unit_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_menu_id uuid;
begin
  select id into v_menu_id
    from public.menus
   where organization_id = p_organization_id and unit_id = p_unit_id
   for update;

  if v_menu_id is null then
    insert into public.menus (organization_id, unit_id)
    values (p_organization_id, p_unit_id)
    returning id into v_menu_id;
  elsif exists (select 1 from public.menus where id = v_menu_id and status = 'archived') then
    update public.menus
       set status = 'draft', updated_at = now(), version = version + 1
     where id = v_menu_id;
  end if;

  return v_menu_id;
end;
$function$;

create function private.ensure_catalog_draft(
  p_organization_id uuid,
  p_unit_id uuid,
  p_menu_id uuid
)
returns public.menu_versions
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_draft public.menu_versions;
  v_next_number integer;
begin
  select * into v_draft
    from public.menu_versions
   where organization_id = p_organization_id
     and unit_id = p_unit_id
     and menu_id = p_menu_id
     and status = 'draft'
   for update;

  if found then
    return v_draft;
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_number
    from public.menu_versions
   where organization_id = p_organization_id
     and unit_id = p_unit_id
     and menu_id = p_menu_id;

  insert into public.menu_versions (organization_id, unit_id, menu_id, version_number)
  values (p_organization_id, p_unit_id, p_menu_id, v_next_number)
  returning * into v_draft;

  update public.menus
     set status = case when current_version_id is null then 'draft' else 'published' end,
         updated_at = now(),
         version = version + 1
   where organization_id = p_organization_id and unit_id = p_unit_id and id = p_menu_id;

  return v_draft;
end;
$function$;

create role tapajiro_catalog_owner
  with nologin noinherit nosuperuser nocreatedb nocreaterole noreplication bypassrls;

grant usage on schema public, private to tapajiro_catalog_owner;
grant execute on function private.has_permission(uuid, uuid, uuid, text) to tapajiro_catalog_owner;
grant select on public.units, public.profiles, public.permissions, public.roles,
  public.role_permissions, public.memberships, public.membership_units to tapajiro_catalog_owner;
grant select, insert, update on public.menus, public.menu_versions, public.categories, public.products to tapajiro_catalog_owner;
grant select, insert on public.menu_version_items to tapajiro_catalog_owner;
grant insert on private.audit_logs to tapajiro_catalog_owner;
grant tapajiro_catalog_owner to postgres;
revoke tapajiro_catalog_owner from anon, authenticated, service_role;

alter function private.ensure_catalog_menu(uuid, uuid) owner to tapajiro_catalog_owner;
alter function private.ensure_catalog_draft(uuid, uuid, uuid) owner to tapajiro_catalog_owner;

create function public.create_menu_draft(
  p_organization_id uuid,
  p_unit_id uuid
)
returns public.menu_versions
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_menu_id uuid;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  v_menu_id := private.ensure_catalog_menu(p_organization_id, p_unit_id);
  return private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
end;
$function$;

create function public.create_catalog_category(
  p_organization_id uuid,
  p_unit_id uuid,
  p_name text,
  p_description text default null,
  p_position integer default 0
)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_menu_id uuid;
  v_category public.categories;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  v_menu_id := private.ensure_catalog_menu(p_organization_id, p_unit_id);
  perform private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
  insert into public.categories (organization_id, unit_id, menu_id, name, description, position)
  values (p_organization_id, p_unit_id, v_menu_id, btrim(p_name), nullif(btrim(p_description), ''), p_position)
  returning * into v_category;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.category.created', 'category', v_category.id);
  return v_category;
end;
$function$;

create function public.update_catalog_category(
  p_organization_id uuid,
  p_unit_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text default null,
  p_position integer default 0,
  p_active boolean default true,
  p_expected_version integer default null
)
returns public.categories
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_category public.categories;
  v_menu_id uuid;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  select menu_id into v_menu_id from public.categories
   where id = p_category_id and organization_id = p_organization_id and unit_id = p_unit_id;
  if v_menu_id is null then
    raise exception using errcode = 'P0002', message = 'category not found';
  end if;
  perform private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
  update public.categories
     set name = btrim(p_name), description = nullif(btrim(p_description), ''),
         position = p_position, active = p_active, updated_at = now(), version = version + 1
   where id = p_category_id and organization_id = p_organization_id and unit_id = p_unit_id
     and (p_expected_version is null or version = p_expected_version)
  returning * into v_category;
  if not found then
    raise exception using errcode = '40001', message = 'catalog category version conflict';
  end if;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.category.updated', 'category', v_category.id);
  return v_category;
end;
$function$;

create function public.create_catalog_product(
  p_organization_id uuid,
  p_unit_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_price_cents bigint,
  p_available boolean default true,
  p_position integer default 0,
  p_sku text default null
)
returns public.products
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_product public.products;
  v_menu_id uuid;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  select menu_id into v_menu_id from public.categories
   where id = p_category_id and organization_id = p_organization_id and unit_id = p_unit_id and deleted_at is null;
  if v_menu_id is null then
    raise exception using errcode = '23503', message = 'category does not belong to unit';
  end if;
  perform private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
  insert into public.products (organization_id, unit_id, category_id, name, description, price_cents, available, position, sku)
  values (p_organization_id, p_unit_id, p_category_id, btrim(p_name), nullif(btrim(p_description), ''), p_price_cents, p_available, p_position, nullif(btrim(p_sku), ''))
  returning * into v_product;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.product.created', 'product', v_product.id);
  return v_product;
end;
$function$;

create function public.update_catalog_product(
  p_organization_id uuid,
  p_unit_id uuid,
  p_product_id uuid,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_price_cents bigint,
  p_active boolean default true,
  p_available boolean default true,
  p_position integer default 0,
  p_sku text default null,
  p_expected_version integer default null
)
returns public.products
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_product public.products;
  v_menu_id uuid;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  select c.menu_id into v_menu_id
    from public.products p join public.categories c
      on c.organization_id = p.organization_id and c.unit_id = p.unit_id and c.id = p.category_id
   where p.id = p_product_id and p.organization_id = p_organization_id and p.unit_id = p_unit_id;
  if v_menu_id is null then
    raise exception using errcode = 'P0002', message = 'product not found';
  end if;
  if not exists (select 1 from public.categories where organization_id = p_organization_id and unit_id = p_unit_id and id = p_category_id and deleted_at is null) then
    raise exception using errcode = '23503', message = 'category does not belong to unit';
  end if;
  perform private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
  update public.products
     set category_id = p_category_id, name = btrim(p_name), description = nullif(btrim(p_description), ''),
         price_cents = p_price_cents, active = p_active, available = p_available, position = p_position,
         sku = nullif(btrim(p_sku), ''), updated_at = now(), version = version + 1
   where id = p_product_id and organization_id = p_organization_id and unit_id = p_unit_id
     and (p_expected_version is null or version = p_expected_version)
  returning * into v_product;
  if not found then
    raise exception using errcode = '40001', message = 'catalog product version conflict';
  end if;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.product.updated', 'product', v_product.id);
  return v_product;
end;
$function$;

create function public.set_product_availability(
  p_organization_id uuid,
  p_unit_id uuid,
  p_product_id uuid,
  p_available boolean,
  p_expected_version integer default null
)
returns public.products
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_product public.products;
  v_menu_id uuid;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  select c.menu_id into v_menu_id
    from public.products p join public.categories c
      on c.organization_id = p.organization_id and c.unit_id = p.unit_id and c.id = p.category_id
   where p.id = p_product_id and p.organization_id = p_organization_id and p.unit_id = p_unit_id;
  if v_menu_id is null then
    raise exception using errcode = 'P0002', message = 'product not found';
  end if;
  perform private.ensure_catalog_draft(p_organization_id, p_unit_id, v_menu_id);
  update public.products
     set available = p_available, updated_at = now(), version = version + 1
   where id = p_product_id and organization_id = p_organization_id and unit_id = p_unit_id
     and (p_expected_version is null or version = p_expected_version)
  returning * into v_product;
  if not found then
    raise exception using errcode = '40001', message = 'catalog product version conflict';
  end if;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.product.availability_updated', 'product', v_product.id);
  return v_product;
end;
$function$;

create function public.publish_menu_version(
  p_organization_id uuid,
  p_unit_id uuid,
  p_menu_version_id uuid
)
returns public.menu_versions
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_draft public.menu_versions;
  v_previous_id uuid;
  v_item_count integer;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.publish') then
    raise exception using errcode = '42501', message = 'catalog publish permission required';
  end if;

  select * into v_draft from public.menu_versions
   where id = p_menu_version_id and organization_id = p_organization_id and unit_id = p_unit_id
     and status = 'draft' for update;
  if not found then
    raise exception using errcode = '40001', message = 'draft is missing or already published';
  end if;

  perform 1 from public.menus
   where id = v_draft.menu_id and organization_id = p_organization_id and unit_id = p_unit_id
   for update;
  select current_version_id into v_previous_id from public.menus
   where id = v_draft.menu_id and organization_id = p_organization_id and unit_id = p_unit_id;

  if exists (
    select 1 from public.menu_version_items where menu_version_id = p_menu_version_id
  ) then
    raise exception using errcode = '40001', message = 'draft already contains snapshot items';
  end if;

  insert into public.menu_version_items (
    organization_id, unit_id, menu_version_id, source_product_id,
    category_name, category_position, product_name, product_description,
    price_cents, available, product_position
  )
  select p.organization_id, p.unit_id, p_menu_version_id, p.id,
         c.name, c.position, p.name, p.description,
         p.price_cents, p.available, p.position
    from public.products p
    join public.categories c
      on c.organization_id = p.organization_id and c.unit_id = p.unit_id and c.id = p.category_id
   where p.organization_id = p_organization_id and p.unit_id = p_unit_id
     and p.deleted_at is null and p.active
     and c.deleted_at is null and c.active;

  get diagnostics v_item_count = row_count;
  if v_item_count = 0 then
    raise exception using errcode = '23514', message = 'catalog needs an active product';
  end if;

  if v_previous_id is not null then
    update public.menu_versions set status = 'archived'
     where id = v_previous_id and status = 'published';
  end if;

  update public.menu_versions
     set status = 'published', checksum = encode(digest(convert_to(
       (select coalesce(jsonb_agg(to_jsonb(i) order by i.category_position, i.product_position, i.id), '[]'::jsonb)
          from public.menu_version_items i where i.menu_version_id = p_menu_version_id)::text,
       'UTF8'), 'sha256'), 'hex'),
         published_at = now(), published_by = auth.uid()
   where id = p_menu_version_id;

  update public.menus
     set status = 'published', current_version_id = p_menu_version_id,
         updated_at = now(), version = version + 1
   where id = v_draft.menu_id and organization_id = p_organization_id and unit_id = p_unit_id;

  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.menu.published', 'menu_version', p_menu_version_id);

  select * into v_draft from public.menu_versions where id = p_menu_version_id;
  return v_draft;
end;
$function$;

create function public.archive_menu_version(
  p_organization_id uuid,
  p_unit_id uuid,
  p_menu_version_id uuid
)
returns public.menu_versions
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
declare
  v_version public.menu_versions;
begin
  if not private.has_permission(auth.uid(), p_organization_id, p_unit_id, 'catalog.manage') then
    raise exception using errcode = '42501', message = 'catalog manage permission required';
  end if;
  select * into v_version from public.menu_versions
   where id = p_menu_version_id and organization_id = p_organization_id and unit_id = p_unit_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'menu version not found';
  end if;
  if exists (select 1 from public.menus where current_version_id = p_menu_version_id) then
    raise exception using errcode = '23514', message = 'current published version cannot be archived';
  end if;
  update public.menu_versions set status = 'archived' where id = p_menu_version_id;
  insert into private.audit_logs (organization_id, unit_id, actor_profile_id, actor_type, action, resource_type, resource_id)
  values (p_organization_id, p_unit_id, auth.uid(), 'user', 'catalog.menu_version.archived', 'menu_version', p_menu_version_id);
  select * into v_version from public.menu_versions where id = p_menu_version_id;
  return v_version;
end;
$function$;

create function public.get_public_menu_by_slug(p_slug text)
returns table (
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
  select i.category_name, i.category_position, i.product_name,
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
   where u.status = 'active'
     and lower(u.slug) = lower(btrim(p_slug))
   order by i.category_position, i.product_position, i.id;
$function$;

alter function public.create_menu_draft(uuid, uuid) owner to tapajiro_catalog_owner;
alter function public.create_catalog_category(uuid, uuid, text, text, integer) owner to tapajiro_catalog_owner;
alter function public.update_catalog_category(uuid, uuid, uuid, text, text, integer, boolean, integer) owner to tapajiro_catalog_owner;
alter function public.create_catalog_product(uuid, uuid, uuid, text, text, bigint, boolean, integer, text) owner to tapajiro_catalog_owner;
alter function public.update_catalog_product(uuid, uuid, uuid, uuid, text, text, bigint, boolean, boolean, integer, text, integer) owner to tapajiro_catalog_owner;
alter function public.set_product_availability(uuid, uuid, uuid, boolean, integer) owner to tapajiro_catalog_owner;
alter function public.publish_menu_version(uuid, uuid, uuid) owner to tapajiro_catalog_owner;
alter function public.archive_menu_version(uuid, uuid, uuid) owner to tapajiro_catalog_owner;
alter function public.get_public_menu_by_slug(text) owner to tapajiro_catalog_owner;

revoke all on function public.create_menu_draft(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.create_catalog_category(uuid, uuid, text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.update_catalog_category(uuid, uuid, uuid, text, text, integer, boolean, integer) from public, anon, authenticated, service_role;
revoke all on function public.create_catalog_product(uuid, uuid, uuid, text, text, bigint, boolean, integer, text) from public, anon, authenticated, service_role;
revoke all on function public.update_catalog_product(uuid, uuid, uuid, uuid, text, text, bigint, boolean, boolean, integer, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.set_product_availability(uuid, uuid, uuid, boolean, integer) from public, anon, authenticated, service_role;
revoke all on function public.publish_menu_version(uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.archive_menu_version(uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_public_menu_by_slug(text) from public, anon, authenticated, service_role;

grant execute on function public.create_menu_draft(uuid, uuid) to authenticated;
grant execute on function public.create_catalog_category(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.update_catalog_category(uuid, uuid, uuid, text, text, integer, boolean, integer) to authenticated;
grant execute on function public.create_catalog_product(uuid, uuid, uuid, text, text, bigint, boolean, integer, text) to authenticated;
grant execute on function public.update_catalog_product(uuid, uuid, uuid, uuid, text, text, bigint, boolean, boolean, integer, text, integer) to authenticated;
grant execute on function public.set_product_availability(uuid, uuid, uuid, boolean, integer) to authenticated;
grant execute on function public.publish_menu_version(uuid, uuid, uuid) to authenticated;
grant execute on function public.archive_menu_version(uuid, uuid, uuid) to authenticated;
grant execute on function public.get_public_menu_by_slug(text) to anon, authenticated;

alter table public.menus enable row level security;
alter table public.menus force row level security;
alter table public.menu_versions enable row level security;
alter table public.menu_versions force row level security;
alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.products enable row level security;
alter table public.products force row level security;
alter table public.menu_version_items enable row level security;
alter table public.menu_version_items force row level security;

revoke all on public.menus, public.menu_versions, public.categories, public.products, public.menu_version_items
  from public, anon, authenticated, service_role;
grant select on public.menus, public.menu_versions, public.categories, public.products, public.menu_version_items to authenticated;

create policy menus_select_catalog
  on public.menus for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'catalog.read'));

create policy menu_versions_select_catalog
  on public.menu_versions for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'catalog.read'));

create policy categories_select_catalog
  on public.categories for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'catalog.read'));

create policy products_select_catalog
  on public.products for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'catalog.read'));

create policy menu_version_items_select_catalog
  on public.menu_version_items for select to authenticated
  using (private.has_permission(auth.uid(), organization_id, unit_id, 'catalog.read'));

revoke all on function private.ensure_catalog_menu(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function private.ensure_catalog_draft(uuid, uuid, uuid) from public, anon, authenticated, service_role;
