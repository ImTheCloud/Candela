import { allStandings } from "../lib/players.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  try {
    const players = await allStandings();
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=60");
    return res.status(200).json({ players: players.slice(0, 100) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server" });
  }
}
