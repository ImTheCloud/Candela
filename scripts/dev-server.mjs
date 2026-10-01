// Local preview of the built page: node scripts/dev-server.mjs → http://localhost:4173
// The page talks to Supabase directly, so the account and leaderboard are the real ones.
import http from "node:http";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
http.createServer((req, res) => {
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(fs.readFileSync(root + "index.html"));
}).listen(4173, () => console.log("http://localhost:4173"));
