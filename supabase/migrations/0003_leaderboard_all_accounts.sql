-- Every account is on the leaderboard from the start, with 0 mastered questions until its first test.
create or replace function public.leaderboard() returns table (name text, ok int, tests int, ok_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.name,
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    p.ok_at
  from public.profiles p
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
