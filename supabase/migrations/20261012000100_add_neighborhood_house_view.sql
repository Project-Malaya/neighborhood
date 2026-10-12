create function private.get_neighborhood_houses()
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
    'neighborhoodName', n.name,
    'lots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'position', l.position,
        'ownerId', l.owner_id,
        'ownerUsername', owner.username,
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
          where f.owner_id = l.owner_id
            and f.status <> 'sold'
        ), '[]'::jsonb)
      ) order by l.position)
      from public.lots l
      left join public.profiles owner on owner.id = l.owner_id
      where l.neighborhood_id = v_neighborhood_id
    ), '[]'::jsonb)
  )
  into v_result
  from public.neighborhoods n
  where n.id = v_neighborhood_id;

  return v_result;
end;
$$;

create function public.get_neighborhood_houses()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.get_neighborhood_houses() $$;

revoke all on function private.get_neighborhood_houses() from public, anon;
grant execute on function private.get_neighborhood_houses() to authenticated;
revoke all on function public.get_neighborhood_houses() from public, anon;
grant execute on function public.get_neighborhood_houses() to authenticated;
