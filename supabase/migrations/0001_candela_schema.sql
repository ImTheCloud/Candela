-- Applied to the Supabase project "candela" (hpmypeoszocxjjxrnbfh). Question counts: see supabase/quiz_counts.sql.
create extension if not exists unaccent with schema extensions;

create table public.quiz_counts (ch int primary key, e int not null, h int not null);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  slug text not null unique,
  ok_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.results (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  at timestamptz not null,
  chs int[] not null,
  mode text not null check (mode in ('easy','hard','both')),
  score numeric not null,
  total int not null,
  pct int not null check (pct between 0 and 100),
  secs int not null,
  unique (user_id, at)
);
create table public.chapter_best (
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null check (key ~ '^\d{1,2}[eh]$'),
  best int not null, last int not null, n int not null,
  primary key (user_id, key)
);
create table public.mastered (
  user_id uuid not null references public.profiles(id) on delete cascade,
  qid text not null,
  at timestamptz not null default now(),
  primary key (user_id, qid)
);

alter table public.quiz_counts enable row level security;
alter table public.profiles enable row level security;
alter table public.results enable row level security;
alter table public.chapter_best enable row level security;
alter table public.mastered enable row level security;

create policy "counts readable" on public.quiz_counts for select to anon, authenticated using (true);
create policy "own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own results" on public.results for select to authenticated using ((select auth.uid()) = user_id);
create policy "own chapters" on public.chapter_best for select to authenticated using ((select auth.uid()) = user_id);
create policy "own mastered" on public.mastered for select to authenticated using ((select auth.uid()) = user_id);

create function public.slugify(n text) returns text language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(extensions.unaccent(n)), '[^a-z0-9]+', '-', 'g'), '-')
$$;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare n text := btrim(regexp_replace(coalesce(new.raw_user_meta_data->>'name', ''), '\s+', ' ', 'g'));
begin
  if public.slugify(n) = '' then raise exception 'name_required'; end if;
  insert into public.profiles (id, name, slug) values (new.id, left(n, 40), left(public.slugify(n), 60));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- One call per finished test: stores the result, raises chapter bests, and records newly mastered questions (each counts once).
create function public.save_result(p_at timestamptz, p_chs int[], p_mode text, p_score numeric, p_total int, p_pct int, p_secs int, p_chap jsonb, p_ok text[])
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); rid bigint; k text; v jsonb; added int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_total not between 1 and 1500 or p_pct not between 0 and 100 or p_mode not in ('easy','hard','both') then raise exception 'invalid'; end if;
  insert into public.results (user_id, at, chs, mode, score, total, pct, secs)
    values (uid, least(coalesce(p_at, now()), now()), p_chs, p_mode, p_score, p_total, p_pct, greatest(coalesce(p_secs, 0), 0))
    on conflict (user_id, at) do nothing returning id into rid;
  if rid is null then return; end if;
  for k, v in select * from jsonb_each(coalesce(p_chap, '{}'::jsonb)) loop
    if k ~ '^\d{1,2}[eh]$' then
      insert into public.chapter_best (user_id, key, best, last, n)
        values (uid, k, least(100, greatest(0, (v #>> '{}')::int)), least(100, greatest(0, (v #>> '{}')::int)), 1)
        on conflict (user_id, key) do update set best = greatest(public.chapter_best.best, excluded.best), last = excluded.last, n = public.chapter_best.n + 1;
    end if;
  end loop;
  insert into public.mastered (user_id, qid)
    select uid, q from unnest(coalesce(p_ok, '{}')) q
    join public.quiz_counts c on q ~ '^\d{1,2}[eh]\d{1,4}$' and c.ch = substring(q from '^\d+')::int
    where substring(q from '\d+$')::int < case substring(q from '[eh]') when 'e' then c.e else c.h end
    on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then update public.profiles set ok_at = now() where id = uid; end if;
end $$;

create function public.leaderboard() returns table (name text, ok int, tests int, ok_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.name,
    (select count(*) from public.mastered m where m.user_id = p.id)::int,
    (select count(*) from public.results r where r.user_id = p.id)::int,
    p.ok_at
  from public.profiles p
  where exists (select 1 from public.results r where r.user_id = p.id)
  order by 2 desc, p.ok_at asc nulls last, p.name
  limit 100
$$;

revoke execute on function public.save_result from public, anon;
grant execute on function public.save_result to authenticated;
revoke execute on function public.leaderboard from public;
grant execute on function public.leaderboard to anon, authenticated;
revoke execute on function public.handle_new_user from public, anon, authenticated;
