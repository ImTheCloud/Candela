// Public sign-up for Candela: an account is first name + last name + password (no email).
// Supabase Auth needs an email, so each account gets an internal address derived from the name
// (<slug>@candela.invalid, never mailed). The name is unique per account.
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
const slugOf = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  let body: { first?: string; last?: string; password?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }
  const first = clean(body.first), last = clean(body.last), password = String(body.password || "");
  if (!slugOf(first) || !slugOf(last)) return json(400, { error: "name" });
  if (password.length < 6 || password.length > 72) return json(400, { error: "password" });
  const name = `${first} ${last}`, slug = slugOf(name);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: taken } = await admin.from("profiles").select("id").eq("slug", slug).maybeSingle();
  if (taken) return json(409, { error: "name_taken" });
  const { error } = await admin.auth.admin.createUser({ email: `${slug}@candela.invalid`, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const m = (error.message || "").toLowerCase();
    if (m.includes("already") || m.includes("database") || (error as { code?: string }).code === "email_exists") return json(409, { error: "name_taken" });
    console.error(error);
    return json(500, { error: "server" });
  }
  return json(200, { ok: true });
});
