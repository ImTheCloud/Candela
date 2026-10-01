-- Everything the app needs about the signed-in player in one call (RLS still applies: invoker rights).
create function public.my_progress() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'name', (select name from public.profiles where id = (select auth.uid())),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', (extract(epoch from r.at) * 1000)::bigint, 'chs', r.chs, 'mode', r.mode, 'score', r.score, 'total', r.total, 'pct', r.pct, 'secs', r.secs) order by r.at)
                         from (select * from public.results where user_id = (select auth.uid()) order by at desc limit 300) r), '[]'::jsonb),
    'tests', (select count(*) from public.results where user_id = (select auth.uid())),
    'chap', coalesce((select jsonb_object_agg(key, jsonb_build_object('best', best, 'last', last, 'n', n)) from public.chapter_best where user_id = (select auth.uid())), '{}'::jsonb),
    'ok', coalesce((select jsonb_agg(qid) from public.mastered where user_id = (select auth.uid())), '[]'::jsonb)
  )
$$;
revoke execute on function public.my_progress from public, anon;
grant execute on function public.my_progress to authenticated;
