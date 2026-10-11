create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.neighborhoods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.lots (
  id uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods (id) on delete cascade,
  position integer not null check (position between 1 and 8),
  owner_id bigint references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (neighborhood_id, position)
);

create unique index lots_one_owned_lot_per_player
  on public.lots (owner_id)
  where owner_id is not null;

create index lots_neighborhood_id_idx on public.lots (neighborhood_id);

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null unique references public.profiles (id) on delete cascade,
  lot_id uuid not null unique references public.lots (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.flower_types (
  id uuid primary key,
  name text not null unique,
  image_key text not null,
  sell_price integer not null check (sell_price > 0),
  sort_order integer not null unique
);

create table public.flowers (
  id uuid primary key default gen_random_uuid(),
  owner_id bigint not null references public.profiles (id) on delete cascade,
  house_id uuid not null references public.houses (id) on delete cascade,
  flower_type_id uuid not null references public.flower_types (id),
  planted_at timestamptz not null default now(),
  last_watered_at timestamptz,
  growth_stage integer not null default 0 check (growth_stage between 0 and 2),
  status text not null default 'growing'
    check (status in ('growing', 'harvested', 'sold')),
  harvested_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'growing' and harvested_at is null)
    or (status in ('harvested', 'sold') and harvested_at is not null)
  )
);

create index flowers_owner_id_idx on public.flowers (owner_id, created_at);
create index flowers_house_id_idx on public.flowers (house_id);

create table public.wallets (
  user_id bigint primary key references public.profiles (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  transaction_type text not null
    check (transaction_type in ('initial_balance', 'flower_sale', 'item_purchase')),
  reference_id text,
  created_at timestamptz not null default now()
);

create index coin_transactions_user_created_idx
  on public.coin_transactions (user_id, created_at desc);

create table public.items (
  id uuid primary key,
  name text not null unique,
  description text not null,
  image_key text not null,
  price integer not null check (price > 0),
  category text not null check (category in ('house', 'garden', 'decoration')),
  sort_order integer not null unique
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.profiles (id) on delete cascade,
  item_id uuid not null references public.items (id),
  quantity integer not null check (quantity > 0),
  unique (user_id, item_id)
);

create index inventory_user_id_idx on public.inventory (user_id);

create table public.neighbor_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id bigint not null references public.profiles (id) on delete cascade,
  recipient_id bigint not null references public.profiles (id) on delete cascade,
  lot_id uuid not null references public.lots (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  check (sender_id <> recipient_id)
);

create unique index neighbor_invitations_pending_lot_idx
  on public.neighbor_invitations (lot_id)
  where status = 'pending';

create unique index neighbor_invitations_pending_recipient_idx
  on public.neighbor_invitations (recipient_id)
  where status = 'pending';

create index neighbor_invitations_sender_idx
  on public.neighbor_invitations (sender_id, created_at desc);

create index neighbor_invitations_recipient_idx
  on public.neighbor_invitations (recipient_id, created_at desc);

insert into public.flower_types (id, name, image_key, sell_price, sort_order)
values
  ('10000000-0000-4000-8000-000000000001', 'Daisy', 'daisy', 10, 1),
  ('10000000-0000-4000-8000-000000000002', 'Tulip', 'tulip', 12, 2),
  ('10000000-0000-4000-8000-000000000003', 'Sunflower', 'sunflower', 15, 3),
  ('10000000-0000-4000-8000-000000000004', 'Rose', 'rose', 18, 4);

insert into public.items (id, name, description, image_key, price, category, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', 'Small Plant', 'A cheerful green friend for your home.', 'small-plant', 10, 'house', 1),
  ('20000000-0000-4000-8000-000000000002', 'Flower Pot', 'A sunny pot for a favorite corner.', 'flower-pot', 20, 'garden', 2),
  ('20000000-0000-4000-8000-000000000003', 'Garden Chair', 'A comfy seat for a quiet afternoon.', 'garden-chair', 30, 'garden', 3),
  ('20000000-0000-4000-8000-000000000004', 'Garden Table', 'A little table for tea and flowers.', 'garden-table', 35, 'garden', 4),
  ('20000000-0000-4000-8000-000000000005', 'Mailbox', 'A welcoming spot for neighborhood notes.', 'mailbox', 25, 'decoration', 5),
  ('20000000-0000-4000-8000-000000000006', 'Tiny Fence', 'A small fence to make the garden feel cozy.', 'tiny-fence', 40, 'decoration', 6);

create function private.current_profile_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.profiles p
  where p.user_id = (select auth.uid())
$$;

create function private.current_neighborhood_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select l.neighborhood_id
  from public.houses h
  join public.lots l on l.id = h.lot_id
  where h.owner_id = (select private.current_profile_id())
$$;

alter table public.neighborhoods enable row level security;
alter table public.lots enable row level security;
alter table public.houses enable row level security;
alter table public.flower_types enable row level security;
alter table public.flowers enable row level security;
alter table public.wallets enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.items enable row level security;
alter table public.inventory enable row level security;
alter table public.neighbor_invitations enable row level security;
alter table public.profiles enable row level security;

revoke all on table
  public.neighborhoods,
  public.lots,
  public.houses,
  public.flower_types,
  public.flowers,
  public.wallets,
  public.coin_transactions,
  public.items,
  public.inventory,
  public.neighbor_invitations
from anon, authenticated;

grant select on
  public.neighborhoods,
  public.lots,
  public.houses,
  public.flower_types,
  public.flowers,
  public.wallets,
  public.coin_transactions,
  public.items,
  public.inventory,
  public.neighbor_invitations
to authenticated;

drop policy if exists "Players can read neighborhood profiles" on public.profiles;
create policy "Players can read neighborhood profiles"
  on public.profiles for select to authenticated
  using (
    id = (select private.current_profile_id())
    or id in (
      select l.owner_id
      from public.lots l
      where l.neighborhood_id = (select private.current_neighborhood_id())
        and l.owner_id is not null
    )
  );

create policy "Players can read their neighborhood"
  on public.neighborhoods for select to authenticated
  using (id = (select private.current_neighborhood_id()));

create policy "Players can read neighborhood lots"
  on public.lots for select to authenticated
  using (neighborhood_id = (select private.current_neighborhood_id()));

create policy "Players can read neighborhood houses"
  on public.houses for select to authenticated
  using (
    owner_id = (select private.current_profile_id())
    or lot_id in (
      select l.id from public.lots l
      where l.neighborhood_id = (select private.current_neighborhood_id())
    )
  );

create policy "Players can read flower catalog"
  on public.flower_types for select to authenticated
  using (true);

create policy "Players can read neighborhood flowers"
  on public.flowers for select to authenticated
  using (
    owner_id = (select private.current_profile_id())
    or house_id in (
      select h.id
      from public.houses h
      join public.lots l on l.id = h.lot_id
      where l.neighborhood_id = (select private.current_neighborhood_id())
    )
  );

create policy "Players can read their wallet"
  on public.wallets for select to authenticated
  using (user_id = (select private.current_profile_id()));

create policy "Players can read their coin history"
  on public.coin_transactions for select to authenticated
  using (user_id = (select private.current_profile_id()));

create policy "Players can read the shop"
  on public.items for select to authenticated
  using (true);

create policy "Players can read their inventory"
  on public.inventory for select to authenticated
  using (user_id = (select private.current_profile_id()));

create policy "Players can read their invitations"
  on public.neighbor_invitations for select to authenticated
  using (
    sender_id = (select private.current_profile_id())
    or recipient_id = (select private.current_profile_id())
  );

create function private.ensure_starter_assets(p_profile_id bigint, p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted_user_id bigint;
begin
  insert into public.wallets (user_id, coins)
  values (p_profile_id, 100)
  on conflict (user_id) do nothing
  returning user_id into v_inserted_user_id;

  if v_inserted_user_id is not null then
    insert into public.coin_transactions (user_id, amount, transaction_type)
    values (p_profile_id, 100, 'initial_balance');
  end if;

  if not exists (
    select 1 from public.flowers f where f.house_id = p_house_id
  ) then
    insert into public.flowers (owner_id, house_id, flower_type_id, growth_stage)
    select p_profile_id, p_house_id, ft.id, 0
    from public.flower_types ft
    order by ft.sort_order
    limit 4;
  end if;
end;
$$;

create function private.initialize_player()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_username text;
  v_neighborhood_id uuid;
  v_lot_id uuid;
  v_house_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  select p.id, p.username
  into v_profile_id, v_username
  from public.profiles p
  where p.user_id = (select auth.uid())
  for update;

  if v_profile_id is null then
    raise exception 'Player profile not found.';
  end if;

  select h.id into v_house_id
  from public.houses h
  where h.owner_id = v_profile_id;

  if v_house_id is not null then
    perform private.ensure_starter_assets(v_profile_id, v_house_id);
    return;
  end if;

  insert into public.neighborhoods (name)
  values (v_username || '''s Neighborhood')
  returning id into v_neighborhood_id;

  insert into public.lots (neighborhood_id, position)
  select v_neighborhood_id, positions.position
  from generate_series(1, 8) as positions(position);

  select l.id into v_lot_id
  from public.lots l
  where l.neighborhood_id = v_neighborhood_id
    and l.position = 1
  for update;

  insert into public.houses (owner_id, lot_id)
  values (v_profile_id, v_lot_id)
  returning id into v_house_id;

  update public.lots
  set owner_id = v_profile_id
  where id = v_lot_id;

  perform private.ensure_starter_assets(v_profile_id, v_house_id);
end;
$$;

create function private.get_game_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_neighborhood_id uuid;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();
  v_neighborhood_id := private.current_neighborhood_id();

  if v_profile_id is null or v_neighborhood_id is null then
    raise exception 'Player home has not been initialized.';
  end if;

  select jsonb_build_object(
    'username', p.username,
    'coins', w.coins,
    'neighborhoodName', n.name,
    'lotPosition', own_lot.position,
    'flowers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'name', ft.name,
        'imageKey', ft.image_key,
        'growthStage', f.growth_stage,
        'status', f.status,
        'wateredToday', f.last_watered_at is not null
          and (f.last_watered_at at time zone 'Asia/Manila')::date
            = (statement_timestamp() at time zone 'Asia/Manila')::date,
        'sellPrice', ft.sell_price
      ) order by f.created_at, ft.sort_order)
      from public.flowers f
      join public.flower_types ft on ft.id = f.flower_type_id
      where f.owner_id = v_profile_id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'description', i.description,
        'imageKey', i.image_key,
        'price', i.price,
        'category', i.category
      ) order by i.sort_order)
      from public.items i
    ), '[]'::jsonb),
    'inventory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemId', i.id,
        'name', i.name,
        'imageKey', i.image_key,
        'quantity', inv.quantity
      ) order by i.sort_order)
      from public.inventory inv
      join public.items i on i.id = inv.item_id
      where inv.user_id = v_profile_id
    ), '[]'::jsonb),
    'lots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'position', l.position,
        'ownerId', l.owner_id,
        'ownerUsername', owner.username
      ) order by l.position)
      from public.lots l
      left join public.profiles owner on owner.id = l.owner_id
      where l.neighborhood_id = v_neighborhood_id
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', inv.id,
        'direction', case when inv.recipient_id = v_profile_id then 'incoming' else 'outgoing' end,
        'status', case
          when inv.status = 'pending' and inv.expires_at <= statement_timestamp() then 'expired'
          else inv.status
        end,
        'username', case when inv.recipient_id = v_profile_id then sender.username else recipient.username end,
        'lotPosition', l.position,
        'expiresAt', inv.expires_at
      ) order by inv.created_at desc)
      from public.neighbor_invitations inv
      join public.profiles sender on sender.id = inv.sender_id
      join public.profiles recipient on recipient.id = inv.recipient_id
      join public.lots l on l.id = inv.lot_id
      where (inv.sender_id = v_profile_id or inv.recipient_id = v_profile_id)
        and inv.created_at > statement_timestamp() - interval '30 days'
    ), '[]'::jsonb),
    'recentTransactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', t.amount,
        'type', t.transaction_type,
        'createdAt', t.created_at
      ) order by t.created_at desc)
      from (
        select ct.amount, ct.transaction_type, ct.created_at
        from public.coin_transactions ct
        where ct.user_id = v_profile_id
        order by ct.created_at desc
        limit 10
      ) t
    ), '[]'::jsonb)
  )
  into v_result
  from public.profiles p
  join public.wallets w on w.user_id = p.id
  join public.houses h on h.owner_id = p.id
  join public.lots own_lot on own_lot.id = h.lot_id
  join public.neighborhoods n on n.id = own_lot.neighborhood_id
  where p.id = v_profile_id;

  return v_result;
end;
$$;

create function private.water_flower(p_flower_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_growth_stage integer;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  update public.flowers f
  set growth_stage = f.growth_stage + 1,
      last_watered_at = statement_timestamp()
  where f.id = p_flower_id
    and f.owner_id = v_profile_id
    and f.status = 'growing'
    and f.growth_stage < 2
    and (
      f.last_watered_at is null
      or (f.last_watered_at at time zone 'Asia/Manila')::date
        < (statement_timestamp() at time zone 'Asia/Manila')::date
    )
  returning f.growth_stage into v_growth_stage;

  if v_growth_stage is null then
    raise exception 'This flower cannot be watered today.';
  end if;

  return v_growth_stage;
end;
$$;

create function private.harvest_flower(p_flower_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  update public.flowers f
  set status = 'harvested',
      harvested_at = statement_timestamp()
  where f.id = p_flower_id
    and f.owner_id = v_profile_id
    and f.status = 'growing'
    and f.growth_stage = 2;

  if not found then
    raise exception 'This flower is not ready to harvest.';
  end if;
end;
$$;

create function private.sell_flower(p_flower_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_price integer;
  v_balance integer;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  select ft.sell_price into v_price
  from public.flowers f
  join public.flower_types ft on ft.id = f.flower_type_id
  where f.id = p_flower_id
    and f.owner_id = v_profile_id
    and f.status = 'harvested'
  for update of f;

  if v_price is null then
    raise exception 'This flower cannot be sold.';
  end if;

  update public.flowers
  set status = 'growing',
      growth_stage = 0,
      planted_at = statement_timestamp(),
      last_watered_at = null,
      harvested_at = null
  where id = p_flower_id and owner_id = v_profile_id and status = 'harvested';

  if not found then
    raise exception 'This flower cannot be sold.';
  end if;

  update public.wallets
  set coins = coins + v_price,
      updated_at = statement_timestamp()
  where user_id = v_profile_id
  returning coins into v_balance;

  if v_balance is null then
    raise exception 'Player wallet not found.';
  end if;

  insert into public.coin_transactions (user_id, amount, transaction_type, reference_id)
  values (v_profile_id, v_price, 'flower_sale', p_flower_id::text);

  return v_balance;
end;
$$;

create function private.buy_item(p_item_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_price integer;
  v_item_name text;
  v_balance integer;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  select i.price, i.name into v_price, v_item_name
  from public.items i
  where i.id = p_item_id
  for share;

  if v_price is null then
    raise exception 'Shop item not found.';
  end if;

  update public.wallets
  set coins = coins - v_price,
      updated_at = statement_timestamp()
  where user_id = v_profile_id
    and coins >= v_price
  returning coins into v_balance;

  if v_balance is null then
    raise exception 'Not enough coins.';
  end if;

  insert into public.inventory (user_id, item_id, quantity)
  values (v_profile_id, p_item_id, 1)
  on conflict (user_id, item_id)
  do update set quantity = public.inventory.quantity + 1;

  insert into public.coin_transactions (user_id, amount, transaction_type, reference_id)
  values (v_profile_id, -v_price, 'item_purchase', p_item_id::text);

  return v_balance;
end;
$$;

create function private.send_neighbor_invitation(p_username text, p_lot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_recipient_id bigint;
  v_neighborhood_id uuid;
  v_available_lot_id uuid;
  v_invitation_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  select l.neighborhood_id into v_neighborhood_id
  from public.houses h
  join public.lots l on l.id = h.lot_id
  where h.owner_id = v_profile_id;

  if v_neighborhood_id is null then
    raise exception 'Player home has not been initialized.';
  end if;

  select p.id into v_recipient_id
  from public.profiles p
  where lower(p.username) = lower(trim(p_username));

  if v_recipient_id is null then
    raise exception 'No player was found with that username.';
  end if;

  if v_recipient_id = v_profile_id then
    raise exception 'You cannot invite yourself.';
  end if;

  select l.id into v_available_lot_id
  from public.lots l
  where l.id = p_lot_id
    and l.neighborhood_id = v_neighborhood_id
    and l.owner_id is null
  for update;

  if v_available_lot_id is null then
    raise exception 'That lot is not available.';
  end if;

  update public.neighbor_invitations i
  set status = 'declined'
  where i.status = 'pending'
    and i.expires_at <= statement_timestamp()
    and (i.lot_id = p_lot_id or i.recipient_id = v_recipient_id);

  if exists (
    select 1 from public.houses h
    join public.lots l on l.id = h.lot_id
    where h.owner_id = v_recipient_id
      and l.neighborhood_id = v_neighborhood_id
  ) then
    raise exception 'That player is already your neighbor.';
  end if;

  if exists (
    select 1 from public.neighbor_invitations i
    where i.recipient_id = v_recipient_id
      and i.status = 'pending'
  ) then
    raise exception 'That player already has a pending invitation.';
  end if;

  insert into public.neighbor_invitations (sender_id, recipient_id, lot_id)
  values (v_profile_id, v_recipient_id, p_lot_id)
  returning id into v_invitation_id;

  return v_invitation_id;
end;
$$;

create function private.accept_neighbor_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_sender_id bigint;
  v_lot_id uuid;
  v_neighborhood_id uuid;
  v_current_house_id uuid;
  v_current_lot_id uuid;
  v_house_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  select i.sender_id, i.lot_id
  into v_sender_id, v_lot_id
  from public.neighbor_invitations i
  where i.id = p_invitation_id
    and i.recipient_id = v_profile_id
    and i.status = 'pending'
    and i.expires_at > statement_timestamp()
  for update;

  if v_lot_id is null then
    raise exception 'This invitation is no longer available.';
  end if;

  select l.neighborhood_id into v_neighborhood_id
  from public.lots l
  where l.id = v_lot_id
    and l.owner_id is null
  for update;

  if v_neighborhood_id is null then
    raise exception 'That lot is no longer available.';
  end if;

  if not exists (
    select 1 from public.houses h
    join public.lots sender_lot on sender_lot.id = h.lot_id
    where h.owner_id = v_sender_id
      and sender_lot.neighborhood_id = v_neighborhood_id
  ) then
    raise exception 'The inviting player is no longer in this neighborhood.';
  end if;

  select h.id, h.lot_id
  into v_current_house_id, v_current_lot_id
  from public.houses h
  where h.owner_id = v_profile_id
  for update;

  if v_current_house_id is null then
    insert into public.houses (owner_id, lot_id)
    values (v_profile_id, v_lot_id)
    returning id into v_house_id;
  else
    if exists (
      select 1 from public.lots current_lot
      where current_lot.id = v_current_lot_id
        and current_lot.neighborhood_id = v_neighborhood_id
    ) then
      raise exception 'You are already in this neighborhood.';
    end if;

    update public.lots
    set owner_id = null
    where id = v_current_lot_id and owner_id = v_profile_id;

    update public.houses
    set lot_id = v_lot_id
    where id = v_current_house_id
    returning id into v_house_id;
  end if;

  update public.lots
  set owner_id = v_profile_id
  where id = v_lot_id and owner_id is null;

  if not found then
    raise exception 'That lot is no longer available.';
  end if;

  perform private.ensure_starter_assets(v_profile_id, v_house_id);

  update public.neighbor_invitations
  set status = 'accepted'
  where id = p_invitation_id and recipient_id = v_profile_id and status = 'pending';

  if not found then
    raise exception 'This invitation is no longer available.';
  end if;
end;
$$;

create function private.decline_neighbor_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();

  update public.neighbor_invitations
  set status = 'declined'
  where id = p_invitation_id
    and recipient_id = v_profile_id
    and status = 'pending';

  if not found then
    raise exception 'This invitation is no longer available.';
  end if;
end;
$$;

create function private.visit_neighbor(p_owner_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile_id bigint;
  v_neighborhood_id uuid;
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'A signed-in player is required.';
  end if;

  v_profile_id := private.current_profile_id();
  v_neighborhood_id := private.current_neighborhood_id();

  if p_owner_id = v_profile_id then
    raise exception 'Choose another neighbor to visit.';
  end if;

  select jsonb_build_object(
    'username', p.username,
    'flowers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'name', ft.name,
        'imageKey', ft.image_key,
        'growthStage', f.growth_stage,
        'status', f.status
      ) order by f.created_at, ft.sort_order)
      from public.flowers f
      join public.flower_types ft on ft.id = f.flower_type_id
      where f.owner_id = p.id and f.status <> 'sold'
    ), '[]'::jsonb)
  )
  into v_result
  from public.profiles p
  join public.houses h on h.owner_id = p.id
  join public.lots l on l.id = h.lot_id
  where p.id = p_owner_id
    and l.neighborhood_id = v_neighborhood_id;

  if v_result is null then
    raise exception 'That player is not in your neighborhood.';
  end if;

  return v_result;
end;
$$;

create function public.initialize_player()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.initialize_player() $$;

create function public.get_game_state()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_game_state() $$;

create function public.water_flower(p_flower_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.water_flower(p_flower_id) $$;

create function public.harvest_flower(p_flower_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.harvest_flower(p_flower_id) $$;

create function public.sell_flower(p_flower_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.sell_flower(p_flower_id) $$;

create function public.buy_item(p_item_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.buy_item(p_item_id) $$;

create function public.send_neighbor_invitation(p_username text, p_lot_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.send_neighbor_invitation(p_username, p_lot_id) $$;

create function public.accept_neighbor_invitation(p_invitation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.accept_neighbor_invitation(p_invitation_id) $$;

create function public.decline_neighbor_invitation(p_invitation_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decline_neighbor_invitation(p_invitation_id) $$;

create function public.visit_neighbor(p_owner_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.visit_neighbor(p_owner_id) $$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.current_neighborhood_id() to authenticated;
grant execute on function private.initialize_player() to authenticated;
grant execute on function private.get_game_state() to authenticated;
grant execute on function private.water_flower(uuid) to authenticated;
grant execute on function private.harvest_flower(uuid) to authenticated;
grant execute on function private.sell_flower(uuid) to authenticated;
grant execute on function private.buy_item(uuid) to authenticated;
grant execute on function private.send_neighbor_invitation(text, uuid) to authenticated;
grant execute on function private.accept_neighbor_invitation(uuid) to authenticated;
grant execute on function private.decline_neighbor_invitation(uuid) to authenticated;
grant execute on function private.visit_neighbor(bigint) to authenticated;

revoke all on function public.initialize_player() from public, anon;
revoke all on function public.get_game_state() from public, anon;
revoke all on function public.water_flower(uuid) from public, anon;
revoke all on function public.harvest_flower(uuid) from public, anon;
revoke all on function public.sell_flower(uuid) from public, anon;
revoke all on function public.buy_item(uuid) from public, anon;
revoke all on function public.send_neighbor_invitation(text, uuid) from public, anon;
revoke all on function public.accept_neighbor_invitation(uuid) from public, anon;
revoke all on function public.decline_neighbor_invitation(uuid) from public, anon;
revoke all on function public.visit_neighbor(bigint) from public, anon;

grant execute on function public.initialize_player() to authenticated;
grant execute on function public.get_game_state() to authenticated;
grant execute on function public.water_flower(uuid) to authenticated;
grant execute on function public.harvest_flower(uuid) to authenticated;
grant execute on function public.sell_flower(uuid) to authenticated;
grant execute on function public.buy_item(uuid) to authenticated;
grant execute on function public.send_neighbor_invitation(text, uuid) to authenticated;
grant execute on function public.accept_neighbor_invitation(uuid) to authenticated;
grant execute on function public.decline_neighbor_invitation(uuid) to authenticated;
grant execute on function public.visit_neighbor(bigint) to authenticated;
