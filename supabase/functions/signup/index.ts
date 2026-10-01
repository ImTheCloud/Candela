// Public sign-up for Candela: first name + last name + email + password.
// The email is the login; the full name is shown on the leaderboard and must be unique.
// No confirmation mail is sent (the project has no mail server), so the address is marked confirmed.
// Deployed with verify_jwt = false: anyone may create an account; the body is validated here.
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
  let body: { first?: string; last?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }
  const first = clean(body.first), last = clean(body.last), password = String(body.password || "");
  const email = String(body.email || "").trim().toLowerCase();
  if (!slugOf(first) || !slugOf(last)) return json(400, { error: "name" });
  if (!emailOk(email)) return json(400, { error: "email" });
  if (password.length < 6 || password.length > 72) return json(400, { error: "password" });
  const name = `${first} ${last}`, slug = slugOf(name);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: taken } = await admin.from("profiles").select("id").eq("slug", slug).maybeSingle();
  if (taken) return json(409, { error: "name_taken" });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const m = (error.message || "").toLowerCase(), code = (error as { code?: string }).code;
    if (code === "email_exists" || m.includes("already been registered")) return json(409, { error: "email_taken" });
    if (m.includes("database")) return json(409, { error: "name_taken" });
    console.error(error);
    return json(500, { error: "server" });
  }
  return json(200, { ok: true });
});
