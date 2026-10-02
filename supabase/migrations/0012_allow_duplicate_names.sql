-- Allow multiple accounts to have the same full name / slug as long as their email (auth.users) is different.
alter table public.profiles drop constraint if exists profiles_slug_key;
drop index if exists public.profiles_slug_key;
create index if not exists profiles_slug_idx on public.profiles(slug);
