import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

function ttsDevPlugin() {
  const cache = new Map();
  const inflight = new Map();
  return {
    name: 'candela-tts-dev',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const text = (url.searchParams.get('text') || '').trim();
          const voice = url.searchParams.get('voice') || 'ro-RO-AlinaNeural';
          if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end('Missing text parameter');
          }

          const cacheKey = `${voice}:${text}`;
          if (cache.has(cacheKey)) {
            const buf = cache.get(cacheKey);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', buf.length);
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            res.setHeader('Accept-Ranges', 'bytes');
            return res.end(buf);
          }

          // If an identical request is already fetching from Microsoft, wait for it instead of opening duplicate WebSockets
          if (inflight.has(cacheKey)) {
            try {
              const buf = await inflight.get(cacheKey);
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Content-Length', buf.length);
              res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
              res.setHeader('Accept-Ranges', 'bytes');
              return res.end(buf);
            } catch {
              // fallback to fresh attempt if in-flight failed
            }
          }

          let resolveInflight;
          let rejectInflight;
          const inflightPromise = new Promise((resolve, reject) => {
            resolveInflight = resolve;
            rejectInflight = reject;
          });
          inflight.set(cacheKey, inflightPromise);

          const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const { audioStream } = tts.toStream(text);

          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          res.setHeader('Transfer-Encoding', 'chunked');
          if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
          }

          let closed = false;
          req.on('close', () => {
            closed = true;
            try { tts.close(); } catch {}
          });

          const chunks = [];
          audioStream.on('data', (chunk) => {
            if (!closed && !res.writableEnded) {
              res.write(chunk);
              chunks.push(chunk);
            }
          });
          audioStream.on('end', () => {
            const buf = Buffer.concat(chunks);
            cache.set(cacheKey, buf);
            inflight.delete(cacheKey);
            resolveInflight(buf);
            if (!closed) {
              res.end();
            }
            try { tts.close(); } catch {}
          });
          audioStream.on('error', (err) => {
            inflight.delete(cacheKey);
            rejectInflight(err);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end(String(err));
            } else {
              res.end();
            }
            try { tts.close(); } catch {}
          });
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(String(err));
          } else {
            res.end();
          }
        }
      });
    }
  };
}

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact()],
  redirects: {
    '/1-samuel/examene': '/1-samuel',
    '/2-samuel/examene': '/2-samuel',
  },
  vite: {
    plugins: [ttsDevPlugin()],
  },
  // pages are tiny: loading them when a link is touched makes the next page instant
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
