-- F2.6A — Ordering constraints, authorization and idempotent command contracts.
-- Full pgTAP execution requires the authorized Supabase test environment.

begin;

select plan(31);

select ok(
  exists (select 1 from supabase_migrations.schema_migrations where name = 'ordering_mvp'),
  'ordering migration is applied'
);

select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_customers', 'order customer snapshots exist');
select has_table('public', 'order_items', 'order item snapshots exist');
select has_table('public', 'order_status_history', 'order status history exists');
select has_table('private', 'unit_order_counters', 'unit order counters are private');
select has_table('private', 'idempotency_keys', 'idempotency keys are private');

select has_function('public', 'get_public_menu_by_slug', 'existing catalog public menu RPC remains present');
select is(
  (select pg_get_userbyid(proowner) from pg_proc where oid = 'public.get_public_menu_by_slug(text)'::regprocedure),
  'tapajiro_catalog_owner',
  'existing catalog public menu RPC keeps its catalog owner'
);
select is(
  position('product_id' in pg_get_function_result('public.get_public_menu_by_slug(text)'::regprocedure)),
  0,
  'existing catalog public menu RPC keeps its original return contract'
);
select is(
  (select count(*)::int from pg_proc where oid = 'public.get_public_ordering_menu_by_slug(text)'::regprocedure and prosecdef and 'search_path=pg_catalog, public, private' = any(proconfig) and pg_get_userbyid(proowner) = 'tapajiro_order_owner'),
  1,
  'ordering menu RPC is a separate secured read function'
);

select is(
  (select count(*)::int from pg_constraint where conrelid = 'public.orders'::regclass and contype = 'c'),
  10,
  'orders has the expected state and total constraints'
);

select is(
  (select count(*)::int from pg_constraint where conrelid = 'public.order_status_history'::regclass and contype = 'c'),
  3,
  'status history has controlled status, source and reason constraints'
);

select is(
  (select count(*)::int from pg_policy where polrelid in (
    'public.orders'::regclass,
    'public.order_customers'::regclass,
    'public.order_items'::regclass,
    'public.order_status_history'::regclass
  )),
  4,
  'all exposed order tables have an authenticated read policy'
);

select is(
  (select count(*)::int from pg_proc where oid = 'private.create_order_atomic(text, uuid, jsonb)'::regprocedure and prosecdef and 'search_path=pg_catalog, public, private' = any(proconfig) and pg_get_userbyid(proowner) = 'tapajiro_order_owner'),
  1,
  'private order RPC keeps definer security, search path and owner'
);

select is(
  (select count(*)::int from pg_proc where oid = 'public.create_order_atomic(text, uuid, jsonb)'::regprocedure and prosecdef and 'search_path=pg_catalog, public, private' = any(proconfig) and pg_get_userbyid(proowner) = 'tapajiro_order_owner'),
  1,
  'server-only order bridge keeps definer security, search path and owner'
);

select is(
  (select count(*)::int from pg_proc where oid = 'public.transition_order_status(uuid, text, integer)'::regprocedure and prosecdef and 'search_path=pg_catalog, public, private' = any(proconfig) and pg_get_userbyid(proowner) = 'tapajiro_order_owner'),
  1,
  'transition RPC keeps definer security, search path and owner'
);

select is(has_function_privilege('service_role', 'public.create_order_atomic(text, uuid, jsonb)', 'EXECUTE'), true, 'only server role can execute public order bridge');
select is(has_function_privilege('anon', 'public.create_order_atomic(text, uuid, jsonb)', 'EXECUTE'), false, 'anon cannot execute public order bridge');
select is(has_function_privilege('authenticated', 'public.create_order_atomic(text, uuid, jsonb)', 'EXECUTE'), false, 'authenticated cannot execute public order bridge');
select is(has_function_privilege('authenticated', 'public.transition_order_status(uuid, text, integer)', 'EXECUTE'), true, 'authenticated can execute order transition');
select is(has_function_privilege('anon', 'public.transition_order_status(uuid, text, integer)', 'EXECUTE'), false, 'anon cannot execute order transition');
select is(has_function_privilege('anon', 'public.get_public_ordering_menu_by_slug(text)', 'EXECUTE'), true, 'anon can read the ordering menu snapshot');

select ok(position('on conflict (unit_id, operation, idempotency_key)' in pg_get_functiondef('private.create_order_atomic(text, uuid, jsonb)'::regprocedure)) > 0, 'order creation has unique idempotency conflict handling');
select ok(position('payload_hash' in pg_get_functiondef('private.create_order_atomic(text, uuid, jsonb)'::regprocedure)) > 0, 'order creation compares payload hash');
select ok(position('status = ''published''' in pg_get_functiondef('private.create_order_atomic(text, uuid, jsonb)'::regprocedure)) > 0, 'order creation requires a published menu');
select ok(position('available' in pg_get_functiondef('private.create_order_atomic(text, uuid, jsonb)'::regprocedure)) > 0, 'order creation validates item availability');
select ok(position('order status conflict' in pg_get_functiondef('public.transition_order_status(uuid, text, integer)'::regprocedure)) > 0, 'order transition has optimistic conflict handling');
select ok(position('invalid order status transition' in pg_get_functiondef('public.transition_order_status(uuid, text, integer)'::regprocedure)) > 0, 'order transition rejects invalid states');

select hasnt_table('public', 'wallets', 'wallets remain absent');
select hasnt_table('public', 'balances', 'balances remain absent');

rollback;
