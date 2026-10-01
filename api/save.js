import { authenticate, mergeProgress, publicProfile, readBody, writePlayer } from "../lib/players.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  try {
    const { name, pin, profile } = readBody(req);
    const r = await authenticate(name, pin);
    if (r.status !== 200) return res.status(r.status).json({ error: r.error, retryAt: r.retryAt });
    const rec = await writePlayer(mergeProgress(r.rec, profile || {}));
    return res.status(200).json({ profile: publicProfile(rec) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
