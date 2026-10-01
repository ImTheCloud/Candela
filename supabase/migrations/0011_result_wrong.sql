-- Mistakes of a test, kept with the account so the report can be opened from any device.
-- Each item: {id: question id, g: answer given (option indexes in the question's own order), p: points}.
alter table public.results add column if not exists wrong jsonb;

create or replace function public.set_result_wrong(p_player uuid, p_at timestamptz, p_wrong jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_play(p_player) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_wrong) <> 'array' or jsonb_array_length(p_wrong) > 2100 or pg_column_size(p_wrong) > 300000 then raise exception 'invalid'; end if;
  -- the saved time can be capped to the server clock, so take the closest result
  update public.results set wrong = p_wrong where id = (
    select r.id from public.results r where r.user_id = p_player and r.at between p_at - interval '1 day' and p_at + interval '1 day'
    order by abs(extract(epoch from r.at - p_at)) limit 1);
end $$;

create or replace function public.result_wrong(p_player uuid, p_at timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
  select r.wrong from public.results r where public.can_play(p_player) and r.user_id = p_player and r.at = p_at
$$;

revoke execute on function public.set_result_wrong(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.set_result_wrong(uuid, timestamptz, jsonb) to authenticated;
revoke execute on function public.result_wrong(uuid, timestamptz) from public, anon;
grant execute on function public.result_wrong(uuid, timestamptz) to authenticated;
