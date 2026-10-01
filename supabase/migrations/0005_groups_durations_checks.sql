-- Groups (family, Sunday school): a leader creates a group, others join with its 6-letter code; each group has its own leaderboard.
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  code text not null unique,
  owner uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user on public.group_members(user_id);
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
-- no table policies: everything goes through the functions below

create or replace function public.create_group(p_name text) returns table (id uuid, code text)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c text; gid uuid; tries int := 0;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  p_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if char_length(p_name) not between 2 and 40 then raise exception 'name'; end if;
  if (select count(*) from public.groups g where g.owner = uid) >= 10 then raise exception 'too_many'; end if;
  loop
    c := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin
      insert into public.groups (name, code, owner) values (p_name, c, uid) returning groups.id into gid;
      exit;
    exception when unique_violation then tries := tries + 1; if tries > 5 then raise; end if;
    end;
  end loop;
  insert into public.group_members (group_id, user_id) values (gid, uid);
  return query select gid, c;
end $$;

create or replace function public.join_group(p_code text) returns table (id uuid, name text)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); g public.groups;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select * into g from public.groups x where x.code = upper(btrim(p_code));
  if g.id is null then raise exception 'no_group'; end if;
  if (select count(*) from public.group_members m where m.group_id = g.id) >= 200 then raise exception 'full'; end if;
  insert into public.group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
  return query select g.id, g.name;
end $$;

-- the leader leaving closes the group for everyone
create or replace function public.leave_group(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.groups g where g.id = p_id and g.owner = uid) then
    delete from public.groups g where g.id = p_id;
  else
    delete from public.group_members m where m.group_id = p_id and m.user_id = uid;
  end if;
end $$;

create or replace function public.my_groups() returns table (id uuid, name text, code text, mine boolean, members int)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.code, g.owner = auth.uid(),
    (select count(*) from public.group_members x where x.group_id = g.id)::int
  from public.groups g join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by m.joined_at
$$;

-- inside a group members see full names (they know each other), the number of tests and the last test date
create or replace function public.group_board(p_id uuid) returns table (name text, ok int, tests int, last_at timestamptz, me boolean)
language sql stable security definer set search_path = '' as $$
  select p.name,
    (select count(*) from public.mastered q where q.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    (select max(r.at) from public.results r where r.user_id = p.id),
    p.id = auth.uid()
  from public.group_members m join public.profiles p on p.id = m.user_id
  where m.group_id = p_id
    and exists (select 1 from public.group_members x where x.group_id = p_id and x.user_id = auth.uid())
  order by 2 desc, p.ok_at asc nulls last, p.created_at asc
$$;

-- real time per question, by level, from finished tests (outliers left out); the app uses it to estimate durations
create or replace function public.pace() returns table (mode text, secs numeric, n int)
language sql stable security definer set search_path = '' as $$
  select r.mode, round(sum(r.secs)::numeric / sum(r.total), 1), count(*)::int
  from public.results r
  where r.secs between r.total * 3 and r.total * 180
  group by r.mode
$$;

do $$ declare f text; begin
  foreach f in array array['create_group(text)','join_group(text)','leave_group(uuid)','my_groups()','group_board(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.pace from public;
grant execute on function public.pace to anon, authenticated;

-- save_result: plausibility checks on the server (answers live in the page, so this is a sanity net, not a lock)
create or replace function public.save_result(p_at timestamp with time zone, p_chs integer[], p_mode text, p_score numeric, p_total integer, p_pct integer, p_secs integer, p_chap jsonb, p_ok text[])
 returns void language plpgsql security definer set search_path to ''
as $function$
declare uid uuid := auth.uid(); rid bigint; k text; v jsonb; added int; recent int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
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
  -- under 2 seconds per question nobody reads: the test is kept but earns no mastered questions
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
