alter table public.profiles
  add column user_id uuid references auth.users (id) on delete cascade;

alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,20}$') not valid;

drop policy if exists "Allow reading profiles" on public.profiles;
drop policy if exists "Allow adding profiles" on public.profiles;
drop policy if exists "Profiles are readable by authenticated users" on public.profiles;
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Anonymous players can read their profile" on public.profiles;
drop policy if exists "Anonymous players can create their profile" on public.profiles;

revoke all on table public.profiles from anon;
revoke all on sequence public.profiles_id_seq from anon;

grant select (id, username, display_name, created_at, user_id)
  on public.profiles to authenticated;
grant insert (username, user_id)
  on public.profiles to authenticated;
grant usage, select on sequence public.profiles_id_seq to authenticated;

create unique index profiles_user_id_unique
  on public.profiles (user_id);

create policy "Anonymous players can read their profile"
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'is_anonymous') = 'true'
  );

create policy "Anonymous players can create their profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt() ->> 'is_anonymous') = 'true'
  );