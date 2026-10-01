import { put, list, del } from "@vercel/blob";

const ID = /^[a-z0-9-]{1,60}$/;
const MAX_BYTES = 200_000;

async function versions(prefix) {
  const { blobs } = await list({ prefix, limit: 100 });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const id = String(req.query.id || "").toLowerCase();
  if (!ID.test(id)) return res.status(400).json({ error: "invalid id" });
  const prefix = `players/${id}/`;

  try {
    if (req.method === "GET") {
      const [latest] = await versions(prefix);
      if (!latest) return res.status(404).json(null);
      const r = await fetch(latest.url, { cache: "no-store" });
      return res.status(200).json(await r.json());
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const json = JSON.stringify(body);
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.name !== "string" || json.length > MAX_BYTES)
        return res.status(400).json({ error: "invalid body" });
      // Each save is a new immutable blob (unique URL, so no stale CDN cache); older versions are pruned.
      await put(`${prefix}${Date.now()}.json`, json, { access: "public", addRandomSuffix: true, contentType: "application/json" });
      const old = (await versions(prefix)).slice(2).map(b => b.url);
      if (old.length) await del(old);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "storage error" });
  }
}
