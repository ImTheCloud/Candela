-- Verses a player highlighted while reading (tap to highlight in yellow, tap again to remove).
create table if not exists public.highlights (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ch int not null check (ch between 1 and 31),
  v int not null check (v between 1 and 200),
  at timestamptz not null default now(),
  primary key (user_id, ch, v)
);
alter table public.highlights enable row level security;
-- no policies: only the functions below read or write it

create or replace function public.my_highlights(p_player uuid) returns table (ch int, v int)
language sql stable security definer set search_path = '' as $$
  select h.ch, h.v from public.highlights h where public.can_play(p_player) and h.user_id = p_player
$$;

create or replace function public.set_highlight(p_player uuid, p_ch int, p_v int, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_play(p_player) then raise exception 'forbidden'; end if;
  if p_on then
    if (select count(*) from public.highlights where user_id = p_player) >= 2000 then raise exception 'too_many'; end if;
    insert into public.highlights (user_id, ch, v) values (p_player, p_ch, p_v) on conflict do nothing;
  else
    delete from public.highlights where user_id = p_player and ch = p_ch and v = p_v;
  end if;
end $$;

revoke all on table public.highlights from anon, authenticated;
revoke execute on function public.my_highlights(uuid) from public, anon;
grant execute on function public.my_highlights(uuid) to authenticated;
revoke execute on function public.set_highlight(uuid, int, int, boolean) from public, anon;
grant execute on function public.set_highlight(uuid, int, int, boolean) to authenticated;
