#!/usr/bin/env node
// Sends the recordings made by scripts/generate-audio.mjs (audio-out/) to a Cloudflare R2 bucket,
// through R2's S3 API with no extra package. Files already there are skipped, so it can run after every generation.
//
// Needs, in .env.local or the environment (R2 > Manage API tokens, "Object Read & Write" on the bucket):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//   node scripts/upload-audio.mjs          upload what is missing
//   node scripts/upload-audio.mjs --cors   also let the site read the bucket from the browser (once)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, createHmac } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'audio-out');

// .env.local, without overriding what the shell already set
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET (see the top of this file).');
  process.exit(1);
}
const HOST = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const ORIGINS = ['https://candela-biblia.vercel.app', 'http://localhost:4321', ...(process.env.AUDIO_CORS_ORIGINS || '').split(',').filter(Boolean)];
const JOBS = 8;

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

/** An S3 request signed with AWS Signature V4 (region "auto" for R2). */
async function s3(method, path, { body = Buffer.alloc(0), query = '', headers = {} } = {}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const all = { host: HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, ...headers };
  const names = Object.keys(all).map((k) => k.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonical = [method, path, query, names.map((k) => `${k}:${lower[k]}\n`).join(''), names.join(';'), payloadHash].join('\n');
  const scope = `${day}/auto/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, day), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`;
  return fetch(`https://${HOST}${path}${query ? `?${query}` : ''}`, {
    method,
    headers: { ...all, authorization },
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
}

async function setCors() {
  const rules = `<CORSConfiguration><CORSRule>${ORIGINS.map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join('')}` +
    `<AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader>` +
    `<MaxAgeSeconds>86400</MaxAgeSeconds></CORSRule></CORSConfiguration>`;
  const body = Buffer.from(rules);
  const res = await s3('PUT', `/${R2_BUCKET}`, {
    body,
    query: 'cors=',
    headers: { 'content-type': 'application/xml', 'content-md5': createHash('md5').update(body).digest('base64') },
  });
  console.log(res.ok ? `CORS set for ${ORIGINS.join(', ')}` : `CORS failed: ${res.status} ${await res.text()}`);
}

async function main() {
  if (process.argv.includes('--cors')) await setCors();
  const names = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8')).filter((n) => existsSync(join(OUT, n)));
  let sent = 0, skipped = 0, failed = 0, next = 0;
  const worker = async () => {
    while (next < names.length) {
      const name = names[next++];
      const path = `/${R2_BUCKET}/${name}`;
      try {
        const head = await s3('HEAD', path);
        if (head.ok) { skipped++; continue; }
        const res = await s3('PUT', path, {
          body: readFileSync(join(OUT, name)),
          // the name changes with the text: a file never changes, browsers and the CDN keep it for a year
          headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, immutable' },
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        sent++;
      } catch (err) {
        failed++;
        console.warn(`\n✗ ${name}: ${err?.message || err}`);
      }
      if ((sent + skipped + failed) % 50 === 0) process.stdout.write(`\r${sent} sent, ${skipped} already there, ${failed} failed / ${names.length}   `);
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  console.log(`\nDone: ${sent} sent, ${skipped} already there, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
}

main();
