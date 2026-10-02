-- Expose mock exams count in public_profile
create or replace function public.public_profile(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', public.short_name(p.name),
    'tests', (select count(*) from public.results r where r.user_id = p.id),
    'exams', (select count(*) from public.results r where r.user_id = p.id and (r.chs = '{0}' or 0 = any(r.chs))),
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
