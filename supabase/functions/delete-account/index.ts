// Deletes the signed-in player's own account and its children's accounts. Results, mastered questions and profiles go with them (foreign keys cascade).
// Deployed with verify_jwt = true: the caller's own token decides which account is deleted.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return json(401, { error: "auth" });
  const { data: kids } = await admin.from("profiles").select("id").eq("parent_id", who.user.id);
  for (const k of kids || []) await admin.auth.admin.deleteUser(k.id);
  const { error } = await admin.auth.admin.deleteUser(who.user.id);
  if (error) { console.error(error); return json(500, { error: "server" }); }
  return json(200, { ok: true });
});
