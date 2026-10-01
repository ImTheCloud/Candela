// Public sign-up for Candela: creates an email + password account that is ready to use at once
// (no confirmation email), after checking that the display name is free.
// Deployed with verify_jwt = false: anyone may create an account; the body is validated here.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const slugOf = (n: string) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  let body: { name?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }
  const name = String(body.name || "").replace(/\s+/g, " ").trim().slice(0, 40);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!slugOf(name)) return json(400, { error: "name" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return json(400, { error: "email" });
  if (password.length < 8 || password.length > 72) return json(400, { error: "password" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: taken } = await admin.from("profiles").select("id").eq("slug", slugOf(name)).maybeSingle();
  if (taken) return json(409, { error: "name_taken" });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const m = (error.message || "").toLowerCase();
    if (m.includes("already") || (error as { code?: string }).code === "email_exists") return json(409, { error: "email_taken" });
    if (m.includes("database")) return json(409, { error: "name_taken" });
    console.error(error);
    return json(500, { error: "server" });
  }
  return json(200, { ok: true });
});
