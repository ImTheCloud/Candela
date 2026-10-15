-- Number of registered accounts, hidden ones included (the leaderboard only lists the visible ones).
create or replace function public.signup_count() returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.profiles
$$;
revoke execute on function public.signup_count() from public;
grant execute on function public.signup_count() to anon, authenticated;
