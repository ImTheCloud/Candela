// Gives a temporary password to an account whose owner forgot it (the app sends no reset emails).
// Only callers listed in public.admins may use it. Body: { who: "email" | "Prenume Nume" } → { ok, name, password }.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const slugOf = (n: string) => n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
// easy to read aloud or dictate: no 0/o, 1/l/i
const ABC = "abcdefghjkmnpqrstuvwxyz23456789";
const tempPassword = () => { const b = crypto.getRandomValues(new Uint8Array(8)); return Array.from(b, x => ABC[x % ABC.length]).join(""); };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return json(401, { error: "auth" });
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", who.user.id).maybeSingle();
  if (!isAdmin) return json(403, { error: "forbidden" });

  let body: { who?: string };
  try { body = await req.json(); } catch { return json(400, { error: "body" }); }
  const q = String(body.who || "").trim();
  if (!q) return json(400, { error: "who" });

  let id: string | null = null, name = "";
  if (q.includes("@")) {
    const email = q.toLowerCase();
    for (let page = 1; page <= 20 && !id; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) { console.error(error); return json(500, { error: "server" }); }
      const u = data.users.find(x => (x.email || "").toLowerCase() === email);
      if (u) id = u.id;
      if (data.users.length < 1000) break;
    }
  } else {
    const { data } = await admin.from("profiles").select("id, name").eq("slug", slugOf(q)).maybeSingle();
    if (data) { id = data.id; name = data.name; }
  }
  if (!id) return json(404, { error: "not_found" });
  if (!name) { const { data } = await admin.from("profiles").select("name").eq("id", id).maybeSingle(); name = data?.name || q; }

  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) { console.error(error); return json(500, { error: "server" }); }
  return json(200, { ok: true, name, password });
});
