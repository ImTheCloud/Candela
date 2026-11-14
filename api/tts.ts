import { handleTts } from './_tts-core.mjs';

/**
 * Only the site's own pages may ask for a synthesis: the endpoint is not a free text-to-speech service for
 * anyone (each call costs the function time of the free plan, and too many could get the voice service blocked).
 * Browsers say where a request comes from (Sec-Fetch-Site; older ones only the Referer or Origin).
 */
function fromThisSite(req: any): boolean {
  const h = req.headers || {};
  const site = h['sec-fetch-site'];
  if (site) return site === 'same-origin' || site === 'same-site';
  const host = String(h.host || '').toLowerCase();
  const from = String(h.origin || h.referer || '');
  if (!host || !from) return false;
  try {
    return new URL(from).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (!fromThisSite(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end('Forbidden');
  }
  // a repeated parameter arrives as an array: only a single string is accepted
  const params = { ...(req.body && typeof req.body === 'object' ? req.body : {}), ...(req.query || {}) };
  await handleTts(req, res, { text: params.text, voice: params.voice, marks: params.marks, fresh: params.fresh });
}
