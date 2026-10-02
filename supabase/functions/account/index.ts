// Changes the signed-in player's name and/or email.
// The name must stay unique (it is what the leaderboard shows); the email must not belong to another account.
// Deployed with verify_jwt = true: the caller's own token decides whose account changes.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const clean = (s: unknown) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 30);
const slugOf = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254 && !e.endsWith("@candela.invalid");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  const user = who?.user;
  if (!user) return json(401, { error: "auth" });

  let body: { first?: string; last?: string; email?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }
  const first = clean(body.first), last = clean(body.last);
  const email = String(body.email || "").trim().toLowerCase();
  if (!slugOf(first) || !slugOf(last)) return json(400, { error: "name" });
  if (!emailOk(email)) return json(400, { error: "email" });
  const name = `${first} ${last}`, slug = slugOf(name);

  const changes: Record<string, unknown> = { user_metadata: { ...user.user_metadata, name } };
  if (email !== (user.email || "").toLowerCase()) { changes.email = email; changes.email_confirm = true; }
  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, changes);
  if (authErr) {
    const m = (authErr.message || "").toLowerCase(), code = (authErr as { code?: string }).code;
    if (code === "email_exists" || m.includes("already been registered")) return json(409, { error: "email_taken" });
    console.error(authErr);
    return json(500, { error: "server" });
  }
  const { error: pErr } = await admin.from("profiles").update({ name, slug }).eq("id", user.id);
  if (pErr) {
    console.error(pErr);
    return json(500, { error: "server" });
  }
  return json(200, { ok: true, name, email });
});
