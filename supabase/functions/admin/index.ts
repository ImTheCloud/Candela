// Admin page: { action: "list" } -> { ok, users: [{ id, name, email, parent, tests, created }] }; { action: "delete", id } -> { ok }; { action: "edit_name", id, first, last } -> { ok, name } or 409 name_taken.
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

  let body: { action?: string; id?: string; first?: string; last?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }

  if (body.action === "list") {
    const emails: Record<string, string> = {};
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) { console.error(error); return json(500, { error: "server" }); }
      for (const u of data.users) emails[u.id] = u.email || "";
      if (data.users.length < 1000) break;
    }
    const { data: profiles, error } = await admin.from("profiles").select("id, name, parent_id, created_at, is_parent, ok_at, hidden").order("created_at", { ascending: false });
    if (error) { console.error(error); return json(500, { error: "server" }); }

    const tests: Record<string, number> = {};
    const points: Record<string, number> = {};
    
    // Fetch counts in parallel for all profiles
    await Promise.all((profiles || []).map(async (p) => {
      const p1 = admin.from("results").select("user_id", { count: "exact", head: true }).eq("user_id", p.id);
      const p2 = admin.from("mastered").select("user_id", { count: "exact", head: true }).eq("user_id", p.id);
      const [r, m] = await Promise.all([p1, p2]);
      tests[p.id] = r.count || 0;
      points[p.id] = m.count || 0;
    }));
    const names: Record<string, string> = Object.fromEntries((profiles || []).map(p => [p.id, p.name]));
    const users = (profiles || []).map(p => {
      const e = emails[p.id] || "";
      return { 
        id: p.id, name: p.name, 
        email: e.endsWith("@candela.invalid") ? "" : e, 
        parent: p.parent_id ? names[p.parent_id] || "" : "", 
        parent_id: p.parent_id || "",
        is_parent: p.is_parent, hidden: p.hidden,
        tests: tests[p.id] || 0, points: points[p.id] || 0,
        created: p.created_at, last_active: p.ok_at || p.created_at,
        me: p.id === who.user.id 
      };
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

  if (body.action === "edit_name") {
    const id = String(body.id || "");
    let first = String(body.first || "").trim().replace(/\s+/g, " ");
    let last = String(body.last || "").trim().replace(/\s+/g, " ");
    const name = `${first} ${last}`.trim().slice(0, 60);
    if (!id || !name) return json(400, { error: "bad_args" });
    const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    
    // names are unique (by slug): check before touching anything
    const { data: clash } = await admin.from("profiles").select("id").eq("slug", slug).neq("id", id).limit(1);
    if (clash && clash.length) return json(409, { error: "name_taken" });

    const { error: profErr } = await admin.from("profiles").update({ name, slug }).eq("id", id);
    if (profErr) { console.error(profErr); return json(profErr.code === "23505" ? 409 : 500, { error: profErr.code === "23505" ? "name_taken" : "server" }); }
    const { error: authErr } = await admin.auth.admin.updateUserById(id, { user_metadata: { name } });
    if (authErr) console.error(authErr);
    
    return json(200, { ok: true, name });
  }
  return json(400, { error: "action" });
});
