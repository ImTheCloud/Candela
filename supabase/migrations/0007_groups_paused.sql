-- Groups are not in the app for now (everyone is on one leaderboard): nobody can call their functions until they come back.
revoke execute on function public.create_group(text) from authenticated;
revoke execute on function public.join_group(text) from authenticated;
revoke execute on function public.leave_group(uuid) from authenticated;
revoke execute on function public.my_groups() from authenticated;
revoke execute on function public.group_board(uuid) from authenticated;
