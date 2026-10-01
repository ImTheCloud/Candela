import { put, list, del } from "@vercel/blob";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SLOTS = 62; // 31 chapters x (easy, hard)
const KEEP_VERSIONS = 5;
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

export function slugOf(name) {
  return String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-").slice(0, 60);
}
export const cleanName = n => String(n || "").replace(/\s+/g, " ").trim().slice(0, 40);
export const validPin = p => /^\d{4}$/.test(String(p || ""));

function hashPin(pin, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(String(pin), salt, 32).toString("hex") };
}
function pinMatches(rec, pin) {
  if (!rec.pin) return false;
  const a = Buffer.from(hashPin(pin, rec.pin.salt).hash, "hex"), b = Buffer.from(rec.pin.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function versions(slug) {
  const { blobs } = await list({ prefix: `players/${slug}/`, limit: 100 });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}
async function readBlob(b) {
  const r = await fetch(b.url, { cache: "no-store" });
  return r.ok ? r.json() : null;
}
export async function readPlayer(slug) {
  const [latest] = await versions(slug);
  return latest ? readBlob(latest) : null;
}
// Every write is a new immutable blob (unique URL, no stale CDN copy); the last few versions are kept as backup.
export async function writePlayer(rec) {
  rec.updatedAt = Date.now();
  await put(`players/${rec.slug}/${rec.updatedAt}.json`, JSON.stringify(rec), { access: "public", addRandomSuffix: true, contentType: "application/json" });
  const old = (await versions(rec.slug)).slice(KEEP_VERSIONS).map(b => b.url);
  if (old.length) await del(old);
  return rec;
}

export function publicProfile(rec) {
  return { name: rec.name, history: rec.history || [], chap: rec.chap || {}, updatedAt: rec.updatedAt || 0 };
}

/** Check a name + PIN. Creates the account on first use; an old account without a PIN is claimed by the first PIN given. */
export async function authenticate(name, pin) {
  name = cleanName(name);
  const slug = slugOf(name);
  if (!slug) return { status: 400, error: "name" };
  if (!validPin(pin)) return { status: 400, error: "pin_format" };
  let rec = await readPlayer(slug);
  if (!rec) {
    rec = await writePlayer({ slug, name, pin: hashPin(pin), history: [], chap: {}, createdAt: Date.now(), fails: 0 });
    return { status: 200, rec, created: true };
  }
  rec.slug = slug;
  if (rec.lockUntil && rec.lockUntil > Date.now()) return { status: 423, error: "locked", retryAt: rec.lockUntil };
  if (!rec.pin) {
    rec.pin = hashPin(pin); rec.fails = 0;
    return { status: 200, rec: await writePlayer(rec) };
  }
  if (!pinMatches(rec, pin)) {
    rec.fails = (rec.fails || 0) + 1;
    if (rec.fails >= MAX_FAILS) { rec.lockUntil = Date.now() + LOCK_MS; rec.fails = 0; }
    await writePlayer(rec);
    return rec.lockUntil > Date.now() ? { status: 423, error: "locked", retryAt: rec.lockUntil } : { status: 401, error: "pin" };
  }
  if (rec.fails || rec.lockUntil) { rec.fails = 0; delete rec.lockUntil; await writePlayer(rec); }
  return { status: 200, rec };
}

/** Merge so an older device can never erase newer results: history is a union by timestamp, best scores only go up. */
export function mergeProgress(rec, incoming) {
  const byAt = new Map();
  for (const h of [...(rec.history || []), ...(incoming.history || [])]) {
    if (h && typeof h.at === "number" && typeof h.pct === "number") byAt.set(h.at, h);
  }
  rec.history = [...byAt.values()].sort((a, b) => a.at - b.at).slice(-300);
  const chap = { ...(rec.chap || {}) };
  for (const [k, v] of Object.entries(incoming.chap || {})) {
    if (!/^\d{1,2}[eh]$/.test(k) || !v || typeof v !== "object") continue;
    const cur = chap[k] || {};
    chap[k] = {
      best: Math.max(cur.best || 0, Math.min(100, Number(v.best) || 0)),
      last: Number(v.last ?? cur.last) || 0,
      n: Math.max(cur.n || 0, Number(v.n) || 0),
    };
  }
  rec.chap = chap;
  return rec;
}

export function standing(rec) {
  const chap = rec.chap || {};
  const sum = Object.values(chap).reduce((s, v) => s + (v.best || 0), 0);
  const h = rec.history || [];
  return {
    name: rec.name,
    mastery: Math.round(sum / SLOTS),
    chapters: new Set(Object.keys(chap).map(k => parseInt(k))).size,
    tests: h.length,
    last: h.length ? h[h.length - 1].at : rec.updatedAt || 0,
  };
}

export async function allStandings() {
  const newest = new Map();
  let cursor;
  do {
    const page = await list({ prefix: "players/", limit: 1000, cursor });
    for (const b of page.blobs) {
      const slug = b.pathname.split("/")[1];
      const cur = newest.get(slug);
      if (!cur || new Date(b.uploadedAt) > new Date(cur.uploadedAt)) newest.set(slug, b);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const recs = await Promise.all([...newest.values()].map(b => readBlob(b).catch(() => null)));
  return recs.filter(r => r && r.name && (r.history || []).length).map(standing)
    .sort((a, b) => b.mastery - a.mastery || b.tests - a.tests || a.name.localeCompare(b.name, "ro"));
}

export function readBody(req) {
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (JSON.stringify(b).length > 300_000) throw new Error("too large");
  return b;
}
