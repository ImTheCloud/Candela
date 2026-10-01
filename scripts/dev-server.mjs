// Local preview with the API and an in-memory Blob store (nothing is saved to disk).
// Usage: node --experimental-test-module-mocks scripts/dev-server.mjs   →  http://localhost:4173
import { mock } from "node:test";
import http from "node:http";
import fs from "node:fs";

const files = new Map(); let n = 0;
mock.module(import.meta.resolve("@vercel/blob"), { namedExports: {
  async put(path, body){ const url = "mem://" + path + "-" + (n++); files.set(url, { pathname: path, url, body, uploadedAt: new Date(Date.now() + n).toISOString() }); return { url }; },
  async list({ prefix }){ return { blobs: [...files.values()].filter(f => f.pathname.startsWith(prefix)), hasMore: false }; },
  async del(urls){ for (const u of [].concat(urls)) files.delete(u); },
}});
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o) => String(url).startsWith("mem://") ? { ok: true, json: async () => JSON.parse(files.get(url).body) } : realFetch(url, o);

const root = new URL("..", import.meta.url).pathname;
const handlers = {};
for (const name of ["login", "save", "leaderboard"]) handlers[`/api/${name}`] = (await import(`${root}api/${name}.js`)).default;

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  if (handlers[u.pathname]) {
    let body = ""; for await (const c of req) body += c;
    req.body = body ? JSON.parse(body) : {}; req.query = Object.fromEntries(u.searchParams);
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); };
    return handlers[u.pathname](req, res);
  }
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.end(fs.readFileSync(root + "index.html"));
}).listen(4173, () => console.log("http://localhost:4173"));
