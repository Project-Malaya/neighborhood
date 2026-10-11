begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (
  id,
  aud,
  role,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  is_anonymous
)
values (
  '30000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  '',
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp(),
  true
);

insert into public.profiles (username, user_id)
values ('game_test_player', '30000000-0000-4000-8000-000000000001');

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);

set local role authenticated;

select extensions.lives_ok(
  $$select public.initialize_player()$$,
  'initialization creates a home for the authenticated player'
);

select extensions.is(
  (select w.coins from public.wallets w
   join public.profiles p on p.id = w.user_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'),
  100,
  'the initial wallet is granted once'
);

select extensions.is(
  (select count(*) from public.flowers f
   join public.profiles p on p.id = f.owner_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'),
  4::bigint,
  'a new player starts with exactly four flowers'
);

select extensions.lives_ok(
  $$select public.initialize_player()$$,
  'initialization can be safely repeated'
);

select extensions.is(
  (select w.coins from public.wallets w
   join public.profiles p on p.id = w.user_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'),
  100,
  'repeated initialization does not duplicate the starting balance'
);

select extensions.is(
  (select count(*) from public.flowers f
   join public.profiles p on p.id = f.owner_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'),
  4::bigint,
  'repeated initialization does not duplicate starting flowers'
);

select extensions.is(
  public.water_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  )),
  1,
  'watering advances a seedling one stage'
);

select extensions.throws_ok(
  $$select public.water_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  ))$$,
  'P0001',
  'This flower cannot be watered today.',
  'watering the same flower twice in one Manila day is rejected'
);

reset role;

update public.flowers f
set last_watered_at = statement_timestamp() - interval '1 day'
from public.profiles p, public.flower_types ft
where f.owner_id = p.id
  and f.flower_type_id = ft.id
  and p.user_id = '30000000-0000-4000-8000-000000000001'
  and ft.name = 'Daisy';

set local role authenticated;

select extensions.is(
  public.water_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  )),
  2,
  'watering on a later Manila day matures the flower'
);

select extensions.lives_ok(
  $$select public.harvest_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  ))$$,
  'a mature flower can be harvested'
);

select extensions.throws_ok(
  $$select public.harvest_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  ))$$,
  'P0001',
  'This flower is not ready to harvest.',
  'a flower cannot be harvested twice'
);

select extensions.is(
  public.sell_flower((
    select f.id from public.flowers f
    join public.profiles p on p.id = f.owner_id
    join public.flower_types ft on ft.id = f.flower_type_id
    where p.user_id = '30000000-0000-4000-8000-000000000001'
      and ft.name = 'Daisy'
  )),
  110,
  'selling uses the catalog price and credits the wallet'
);

select extensions.is(
  (select f.growth_stage from public.flowers f
   join public.profiles p on p.id = f.owner_id
   join public.flower_types ft on ft.id = f.flower_type_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'
     and ft.name = 'Daisy'),
  0,
  'selling replants the flower for another growth cycle'
);

select extensions.is(
  public.buy_item('20000000-0000-4000-8000-000000000001'),
  100,
  'a shop purchase uses the catalog price and deducts the wallet'
);

select extensions.is(
  (select inv.quantity from public.inventory inv
   join public.profiles p on p.id = inv.user_id
   where p.user_id = '30000000-0000-4000-8000-000000000001'
     and inv.item_id = '20000000-0000-4000-8000-000000000001'),
  1,
  'a purchase adds one item to inventory'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.wallets', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.inventory', 'INSERT')
  and not has_table_privilege('authenticated', 'public.flowers', 'UPDATE'),
  'clients cannot directly change wallet, inventory, or flowers'
);

select * from extensions.finish();
rollback;
