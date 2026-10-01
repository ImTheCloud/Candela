// Children of a parent account: { action: "add", first, last } -> { ok, id, name }; { action: "remove", id } -> { ok }.
// A child is an account without email and without a known password: only its parent plays as it, from the parent's phone.
// Deployed with verify_jwt = true: the caller's own token decides whose children change.
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
const MAX_CHILDREN = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return json(401, { error: "auth" });
  const parentId = who.user.id;
  const { data: parent } = await admin.from("profiles").select("is_parent").eq("id", parentId).maybeSingle();
  if (!parent?.is_parent) return json(403, { error: "not_parent" });

  let body: { action?: string; first?: string; last?: string; id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }

  if (body.action === "add") {
    const first = clean(body.first), last = clean(body.last);
    if (!slugOf(first) || !slugOf(last)) return json(400, { error: "name" });
    const name = `${first} ${last}`, slug = slugOf(name);
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("parent_id", parentId);
    if ((count || 0) >= MAX_CHILDREN) return json(409, { error: "too_many" });
    const { data: taken } = await admin.from("profiles").select("id").eq("slug", slug).maybeSingle();
    if (taken) return json(409, { error: "name_taken" });
    const pw = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
    const { data: made, error } = await admin.auth.admin.createUser({ email: `copil-${crypto.randomUUID()}@candela.invalid`, password: pw, email_confirm: true, user_metadata: { name } });
    if (error || !made?.user) {
      if ((error?.message || "").toLowerCase().includes("database")) return json(409, { error: "name_taken" });
      console.error(error); return json(500, { error: "server" });
    }
    const { error: pErr } = await admin.from("profiles").update({ parent_id: parentId }).eq("id", made.user.id);
    if (pErr) { console.error(pErr); await admin.auth.admin.deleteUser(made.user.id); return json(500, { error: "server" }); }
    return json(200, { ok: true, id: made.user.id, name });
  }

  if (body.action === "remove") {
    const id = String(body.id || "");
    const { data: child } = await admin.from("profiles").select("id").eq("id", id).eq("parent_id", parentId).maybeSingle();
    if (!child) return json(404, { error: "not_found" });
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) { console.error(error); return json(500, { error: "server" }); }
    return json(200, { ok: true });
  }
  return json(400, { error: "action" });
});
