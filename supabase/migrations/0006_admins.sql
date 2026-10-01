-- Admins can give a temporary password to an account whose owner forgot it (no reset emails are sent).
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
insert into public.admins (user_id) select id from auth.users where email = 'claudiu.dev@outlook.com' on conflict do nothing;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
$$;
revoke execute on function public.is_admin from public, anon;
grant execute on function public.is_admin to authenticated;
