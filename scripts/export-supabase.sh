#!/usr/bin/env bash
# Reads what v2 keeps from the v1 database (Supabase, project "candela") into one JSON file, read-only.
# Uses the Supabase CLI's temporary login (the project must be linked: supabase/.temp).
#   scripts/export-supabase.sh <output.json>
set -euo pipefail
out="${1:?Folosire: scripts/export-supabase.sh <output.json>}"
eval "$(supabase db dump --linked --dry-run --data-only -s public 2>/dev/null | grep '^export PG')"
umask 077
psql -X -q -t -A -c "set role postgres; set default_transaction_read_only = on;" -c "
select json_build_object(
  'exportedAt', now(),
  'users', (select json_agg(json_build_object('id', u.id, 'email', u.email, 'hash', u.encrypted_password, 'createdAt', u.created_at) order by u.created_at)
            from auth.users u join public.profiles p on p.id = u.id where p.parent_id is null),
  'profiles', (select json_agg(json_build_object('id', id, 'name', name, 'isParent', is_parent, 'parentId', parent_id, 'hidden', hidden, 'createdAt', created_at) order by created_at) from public.profiles),
  'highlights', (select coalesce(json_agg(json_build_object('user', user_id, 'ch', ch, 'v', v)), '[]') from public.highlights),
  'mastered', (select coalesce(json_agg(json_build_object('user', user_id, 'qid', qid)), '[]') from public.mastered),
  'admins', (select coalesce(json_agg(user_id), '[]') from public.admins)
)" > "$out"
echo "Export: $out"
