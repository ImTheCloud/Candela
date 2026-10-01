// Admin page: { action: "list" } -> { ok, users: [{ id, name, email, parent, tests, created }] }; { action: "delete", id } -> { ok }.
// Only callers listed in public.admins may use it. Deleting an account also deletes its children's accounts.
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
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (!isAdmin) return json(403, { error: "forbidden" });

  let body: { action?: string; id?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }

  if (body.action === "list") {
    const emails: Record<string, string> = {};
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) { console.error(error); return json(500, { error: "server" }); }
      for (const u of data.users) emails[u.id] = u.email || "";
      if (data.users.length < 1000) break;
    }
    const { data: profiles, error } = await admin.from("profiles").select("id, name, parent_id, created_at").order("created_at", { ascending: false });
    if (error) { console.error(error); return json(500, { error: "server" }); }
    const { data: counts } = await admin.from("results").select("user_id");
    const tests: Record<string, number> = {};
    for (const r of counts || []) tests[r.user_id] = (tests[r.user_id] || 0) + 1;
    const names: Record<string, string> = Object.fromEntries((profiles || []).map(p => [p.id, p.name]));
    const users = (profiles || []).map(p => {
      const e = emails[p.id] || "";
      return { id: p.id, name: p.name, email: e.endsWith("@candela.invalid") ? "" : e, parent: p.parent_id ? names[p.parent_id] || "" : "", tests: tests[p.id] || 0, created: p.created_at, me: p.id === who.user.id };
    });
    return json(200, { ok: true, users });
  }

  if (body.action === "delete") {
    const id = String(body.id || "");
    if (!id || id === who.user.id) return json(400, { error: "self" });
    const { data: kids } = await admin.from("profiles").select("id").eq("parent_id", id);
    for (const k of kids || []) await admin.auth.admin.deleteUser(k.id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) { console.error(error); return json(500, { error: "server" }); }
    return json(200, { ok: true });
  }
  return json(400, { error: "action" });
});
