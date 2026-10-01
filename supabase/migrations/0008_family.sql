-- Family: a parent account adds its children as profiles on the same phone and switches between them.
-- A child is a real account (auth user + profile) with no email and no usable password: only its parent plays as it.
alter table public.profiles add column if not exists is_parent boolean not null default false;
alter table public.profiles add column if not exists parent_id uuid references public.profiles(id) on delete cascade;
create index if not exists profiles_parent on public.profiles(parent_id);
-- a player can choose not to appear on the public leaderboard
alter table public.profiles add column if not exists hidden boolean not null default false;

create or replace function public.set_hidden(p_player uuid, p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_play(p_player) then raise exception 'forbidden'; end if;
  update public.profiles set hidden = p_on where id = p_player;
end $$;

-- the caller may play as p: itself or one of its children
create or replace function public.can_play(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p = auth.uid() or exists (select 1 from public.profiles c where c.id = p and c.parent_id = auth.uid())
$$;

create or replace function public.set_parent(p_on boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.profiles c where c.parent_id = auth.uid()) and not p_on then raise exception 'has_children'; end if;
  if exists (select 1 from public.profiles x where x.id = auth.uid() and x.parent_id is not null) then raise exception 'child'; end if;
  update public.profiles set is_parent = p_on where id = auth.uid();
end $$;

-- the caller and its children, for the switcher
create or replace function public.my_family() returns table (id uuid, name text, is_parent boolean, child boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.is_parent, p.id <> auth.uid()
  from public.profiles p where p.id = auth.uid() or p.parent_id = auth.uid()
  order by (p.id <> auth.uid()), p.created_at
$$;

create or replace function public.player_progress(p_player uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when not public.can_play(p_player) then null else jsonb_build_object(
    'name', (select name from public.profiles where id = p_player),
    'is_parent', (select is_parent from public.profiles where id = p_player),
    'hidden', (select hidden from public.profiles where id = p_player),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', (extract(epoch from r.at) * 1000)::bigint, 'chs', r.chs, 'mode', r.mode, 'score', r.score, 'total', r.total, 'pct', r.pct, 'secs', r.secs) order by r.at)
                         from (select * from public.results where user_id = p_player order by at desc limit 300) r), '[]'::jsonb),
    'tests', (select count(*) from public.results where user_id = p_player),
    'chap', coalesce((select jsonb_object_agg(key, jsonb_build_object('best', best, 'last', last, 'n', n)) from public.chapter_best where user_id = p_player), '{}'::jsonb),
    'ok', coalesce((select jsonb_agg(qid) from public.mastered where user_id = p_player), '[]'::jsonb)
  ) end
$$;

create or replace function public.board_for(p_player uuid) returns table (name text, ok int, tests int, me boolean)
language sql stable security definer set search_path = '' as $$
  select public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    coalesce(p.id = p_player and public.can_play(p_player), false)
  from public.profiles p
  where not p.hidden
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;

-- save_result for any player the caller may play as
create or replace function public.save_play(p_player uuid, p_at timestamp with time zone, p_chs integer[], p_mode text, p_score numeric, p_total integer, p_pct integer, p_secs integer, p_chap jsonb, p_ok text[])
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := p_player; rid bigint; k text; v jsonb; added int; recent int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.can_play(p_player) then raise exception 'forbidden'; end if;
  if p_total not between 1 and 2100 or p_pct not between 0 and 100 or p_mode not in ('easy','hard','both')
     or p_score < 0 or p_score > p_total or cardinality(coalesce(p_ok, '{}')) > p_total then raise exception 'invalid'; end if;
  select count(*) into recent from public.results r where r.user_id = uid and r.at > now() - interval '1 hour';
  if recent >= 120 then raise exception 'too_many'; end if;
  insert into public.results (user_id, at, chs, mode, score, total, pct, secs)
    values (uid, least(coalesce(p_at, now()), now()), p_chs, p_mode, p_score, p_total, p_pct, greatest(coalesce(p_secs, 0), 0))
    on conflict (user_id, at) do nothing returning id into rid;
  if rid is null then return; end if;
  for k, v in select * from jsonb_each(coalesce(p_chap, '{}'::jsonb)) loop
    if k ~ '^\d{1,2}[eh]$' and substring(k from '^\d+')::int = any(p_chs) then
      insert into public.chapter_best (user_id, key, best, last, n)
        values (uid, k, least(100, greatest(0, (v #>> '{}')::int)), least(100, greatest(0, (v #>> '{}')::int)), 1)
        on conflict (user_id, key) do update set best = greatest(public.chapter_best.best, excluded.best), last = excluded.last, n = public.chapter_best.n + 1;
    end if;
  end loop;
  if coalesce(p_secs, 0) < p_total * 2 then return; end if;
  insert into public.mastered (user_id, qid)
    select uid, q from unnest(coalesce(p_ok, '{}')) q
    join public.quiz_counts c on q ~ '^\d{1,2}[eh]\d{1,4}$' and c.ch = substring(q from '^\d+')::int
    where substring(q from '\d+$')::int < case substring(q from '[eh]') when 'e' then c.e else c.h end
      and c.ch = any(p_chs)
      and (p_mode = 'both' or substring(q from '[eh]') = left(p_mode, 1))
    on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then update public.profiles set ok_at = now() where id = uid; end if;
end $function$;

revoke execute on function public.can_play(uuid) from public, anon, authenticated;
revoke execute on function public.set_parent(boolean) from public, anon;
grant execute on function public.set_parent(boolean) to authenticated;
revoke execute on function public.my_family() from public, anon;
grant execute on function public.my_family() to authenticated;
revoke execute on function public.player_progress(uuid) from public, anon;
grant execute on function public.player_progress(uuid) to authenticated;
revoke execute on function public.board_for(uuid) from public;
grant execute on function public.board_for(uuid) to anon, authenticated;
revoke execute on function public.save_play(uuid, timestamp with time zone, integer[], text, numeric, integer, integer, integer, jsonb, text[]) from public, anon;
grant execute on function public.save_play(uuid, timestamp with time zone, integer[], text, numeric, integer, integer, integer, jsonb, text[]) to authenticated;
revoke execute on function public.set_hidden(uuid, boolean) from public, anon;
grant execute on function public.set_hidden(uuid, boolean) to authenticated;
-- older leaderboard functions also leave hidden players out
create or replace function public.board() returns table (name text, ok int, tests int, me boolean)
language sql stable security definer set search_path = '' as $$
  select public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    coalesce(p.id = auth.uid(), false)
  from public.profiles p where not p.hidden
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
create or replace function public.leaderboard() returns table (name text, ok int, tests int, ok_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select public.short_name(p.name),
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    p.ok_at
  from public.profiles p where not p.hidden
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
  limit 200
$$;
