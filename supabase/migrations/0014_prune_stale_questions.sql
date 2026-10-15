-- Questions removed or reordered after a player answered them left ids beyond the current counts
-- (a chapter could show 39/38). prune_stale_questions() removes them; supabase/quiz_counts.sql calls it after each update.
create or replace function public.prune_stale_questions() returns void language sql security definer set search_path = '' as $$
  delete from public.mastered m where not exists (select 1 from public.quiz_counts c where m.qid ~ '^\d{1,2}[eh]\d{1,4}$' and c.ch = substring(m.qid from '^\d+')::int
    and substring(m.qid from '\d+$')::int < case substring(m.qid from '[eh]') when 'e' then c.e else c.h end);
  delete from public.answered m where not exists (select 1 from public.quiz_counts c where m.qid ~ '^\d{1,2}[eh]\d{1,4}$' and c.ch = substring(m.qid from '^\d+')::int
    and substring(m.qid from '\d+$')::int < case substring(m.qid from '[eh]') when 'e' then c.e else c.h end);
$$;
revoke execute on function public.prune_stale_questions() from public, anon, authenticated;
select public.prune_stale_questions();
