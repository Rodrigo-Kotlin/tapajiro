begin;

select plan(10);

select ok(
  exists (select 1 from pg_roles where rolname = 'tapajiro_order_owner'),
  'ordering technical owner exists'
);
select is(
  has_schema_privilege('tapajiro_order_owner', 'extensions', 'USAGE'),
  true,
  'ordering technical owner has extensions usage'
);
select is(
  has_schema_privilege('anon', 'extensions', 'USAGE'),
  false,
  'anon does not have extensions usage'
);
select is(
  has_schema_privilege('authenticated', 'extensions', 'USAGE'),
  false,
  'authenticated does not have extensions usage'
);
select is(
  has_function_privilege('tapajiro_order_owner', 'extensions.digest(bytea, text)', 'EXECUTE'),
  true,
  'ordering technical owner keeps digest execute'
);
select is(
  has_function_privilege('tapajiro_order_owner', 'extensions.gen_random_uuid()', 'EXECUTE'),
  true,
  'ordering technical owner keeps UUID execute'
);

select hasnt_table('public', 'wallets', 'wallets remain absent');
select hasnt_table('public', 'balances', 'balances remain absent');
select hasnt_table('public', 'payouts', 'payouts remain absent');
select hasnt_table('public', 'settlements', 'settlements remain absent');

rollback;
