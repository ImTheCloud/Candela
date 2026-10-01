-- Questions a player has answered (right or wrong), so "31 correct out of 34 answered" can be shown,
-- plus a public profile opened from the leaderboard.
create table if not exists public.answered (
  user_id uuid not null references public.profiles(id) on delete cascade,
  qid text not null,
  primary key (user_id, qid)
);
alter table public.answered enable row level security;
-- no policies: only the functions below read or write it
revoke all on table public.answered from anon, authenticated;
insert into public.answered (user_id, qid) select user_id, qid from public.mastered on conflict do nothing;

-- same as save_play, plus the ids of every question answered in that test
create or replace function public.save_play(p_player uuid, p_at timestamp with time zone, p_chs integer[], p_mode text, p_score numeric, p_total integer, p_pct integer, p_secs integer, p_chap jsonb, p_ok text[], p_seen text[])
 returns void language plpgsql security definer set search_path to ''
as $$
begin
  if cardinality(coalesce(p_seen, '{}')) > p_total then raise exception 'invalid'; end if;
  perform public.save_play(p_player, p_at, p_chs, p_mode, p_score, p_total, p_pct, p_secs, p_chap, p_ok);
  if coalesce(p_secs, 0) < p_total * 2 then return; end if;   -- same speed rule as mastered questions
  insert into public.answered (user_id, qid)
    select p_player, q from unnest(coalesce(p_seen, '{}') || coalesce(p_ok, '{}')) q
    join public.quiz_counts c on q ~ '^\d{1,2}[eh]\d{1,4}$' and c.ch = substring(q from '^\d+')::int
    where substring(q from '\d+$')::int < case substring(q from '[eh]') when 'e' then c.e else c.h end
      and c.ch = any(p_chs)
      and (p_mode = 'both' or substring(q from '[eh]') = left(p_mode, 1))
    on conflict do nothing;
end $$;
revoke execute on function public.save_play(uuid, timestamp with time zone, integer[], text, numeric, integer, integer, integer, jsonb, text[], text[]) from public, anon;
grant execute on function public.save_play(uuid, timestamp with time zone, integer[], text, numeric, integer, integer, integer, jsonb, text[], text[]) to authenticated;

create or replace function public.player_progress(p_player uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when not public.can_play(p_player) then null else jsonb_build_object(
    'name', (select name from public.profiles where id = p_player),
    'is_parent', (select is_parent from public.profiles where id = p_player),
    'hidden', (select hidden from public.profiles where id = p_player),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', (extract(epoch from r.at) * 1000)::bigint, 'chs', r.chs, 'mode', r.mode, 'score', r.score, 'total', r.total, 'pct', r.pct, 'secs', r.secs) order by r.at)
                         from (select * from public.results where user_id = p_player order by at desc limit 300) r), '[]'::jsonb),
    'tests', (select count(*) from public.results where user_id = p_player),
    'chap', coalesce((select jsonb_object_agg(key, jsonb_build_object('best', best, 'last', last, 'n', n)) from public.chapter_best where user_id = p_player), '{}'::jsonb),
    'ok', coalesce((select jsonb_agg(qid) from public.mastered where user_id = p_player), '[]'::jsonb),
    'seen', coalesce((select jsonb_agg(qid) from public.answered where user_id = p_player), '[]'::jsonb)
  ) end
$$;

-- leaderboard with the answered count and an id to open the public profile (board_for stays for older clients)
create or replace function public.board2(p_player uuid) returns table (id uuid, name text, ok int, seen int, tests int, me boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from (select qid from public.answered a where a.user_id = p.id union select qid from public.mastered m where m.user_id = p.id) x)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    coalesce(p.id = p_player and public.can_play(p_player), false)
  from public.profiles p
  where not p.hidden
  order by 3 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
revoke execute on function public.board2(uuid) from public;
grant execute on function public.board2(uuid) to anon, authenticated;

-- what anyone can see about a player who appears in the leaderboard
create or replace function public.public_profile(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', public.short_name(p.name),
    'tests', (select count(*) from public.results r where r.user_id = p.id),
    'avg', (select round(avg(r.pct)) from public.results r where r.user_id = p.id),
    'ok_e', (select count(*) from public.mastered m where m.user_id = p.id and m.qid ~ '^\d+e'),
    'ok_h', (select count(*) from public.mastered m where m.user_id = p.id and m.qid ~ '^\d+h'),
    'seen_e', (select count(*) from (select qid from public.answered a where a.user_id = p.id union select qid from public.mastered m where m.user_id = p.id) x where x.qid ~ '^\d+e'),
    'seen_h', (select count(*) from (select qid from public.answered a where a.user_id = p.id union select qid from public.mastered m where m.user_id = p.id) x where x.qid ~ '^\d+h'),
    'chaps', (select count(distinct substring(key from '^\d+')) from public.chapter_best b where b.user_id = p.id)
  ) from public.profiles p where p.id = p_id and not p.hidden
$$;
revoke execute on function public.public_profile(uuid) from public;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- full tests played before this table existed: every question of those chapters and level was answered
with ft as (
  select r.user_id, r.chs, r.mode from public.results r
  where r.secs >= r.total * 2
    and r.total = (select sum(case r.mode when 'easy' then c.e when 'hard' then c.h else c.e + c.h end) from public.quiz_counts c where c.ch = any(r.chs))
)
insert into public.answered (user_id, qid)
select f.user_id, c.ch || l.lv || i
from ft f
join public.quiz_counts c on c.ch = any(f.chs)
cross join lateral (values ('e'), ('h')) l(lv)
cross join lateral generate_series(0, case l.lv when 'e' then c.e else c.h end - 1) i
where f.mode = 'both' or l.lv = left(f.mode, 1)
on conflict do nothing;
