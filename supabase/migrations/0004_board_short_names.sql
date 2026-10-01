-- Public leaderboard shows "Prenume N." only (children's privacy); board() also says which row is the caller's.
create or replace function public.short_name(n text) returns text language sql immutable set search_path = '' as $$
  select case when position(' ' in btrim(n)) > 0 then regexp_replace(btrim(n), '\s+(\S)\S*$', ' \1.') else btrim(n) end
$$;
create or replace function public.board() returns table (name text, ok int, tests int, me boolean)
language sql stable security definer set search_path = '' as $$
  select public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    coalesce(p.id = auth.uid(), false)
  from public.profiles p
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
revoke execute on function public.board from public;
grant execute on function public.board to anon, authenticated;
-- the older leaderboard() stays for cached pages, now with short names too
create or replace function public.leaderboard() returns table (name text, ok int, tests int, ok_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    p.ok_at
  from public.profiles p
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
