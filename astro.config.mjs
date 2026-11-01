import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

function ttsDevPlugin() {
  const cache = new Map();
  const inflight = new Map();

  let sharedTtsInstance = null;
  let sharedTtsPromise = null;

  async function getSharedTts(voice) {
    if (sharedTtsInstance) return sharedTtsInstance;
    if (sharedTtsPromise) return sharedTtsPromise;

    sharedTtsPromise = (async () => {
      const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      sharedTtsInstance = tts;
      sharedTtsPromise = null;
      return tts;
    })().catch((err) => {
      sharedTtsInstance = null;
      sharedTtsPromise = null;
      throw err;
    });

    return sharedTtsPromise;
  }

  function resetSharedTts() {
    if (sharedTtsInstance) {
      try { sharedTtsInstance.close(); } catch {}
      sharedTtsInstance = null;
    }
    sharedTtsPromise = null;
  }

  class InflightStream {
    constructor() {
      this.chunks = [];
      this.subscribers = new Set();
      this.ended = false;
      this.error = null;
    }
    subscribe(res, req) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Transfer-Encoding', 'chunked');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      for (const chunk of this.chunks) {
        if (!res.writableEnded) {
          res.write(chunk);
        }
      }

      if (this.ended) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (this.error) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end(String(this.error));
        } else if (!res.writableEnded) {
          res.end();
        }
        return;
      }

      this.subscribers.add(res);
      req.on('close', () => {
        this.subscribers.delete(res);
      });
    }
    write(chunk) {
      this.chunks.push(chunk);
      for (const res of this.subscribers) {
        if (!res.writableEnded) {
          try { res.write(chunk); } catch {}
        }
      }
    }
    end() {
      this.ended = true;
      for (const res of this.subscribers) {
        if (!res.writableEnded) {
          try { res.end(); } catch {}
        }
      }
      this.subscribers.clear();
    }
    destroy(err) {
      this.error = err;
      for (const res of this.subscribers) {
        if (!res.headersSent) {
          try { res.statusCode = 500; res.end(String(err)); } catch {}
        } else if (!res.writableEnded) {
          try { res.end(); } catch {}
        }
      }
      this.subscribers.clear();
    }
  }

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

          // 1. Instant response from memory cache (2ms)
          if (cache.has(cacheKey)) {
            const buf = cache.get(cacheKey);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Length', buf.length);
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            res.setHeader('Accept-Ranges', 'bytes');
            return res.end(buf);
          }

          // 2. Active in-flight stream: broadcast chunks immediately to concurrent subscriber
          if (inflight.has(cacheKey)) {
            const stream = inflight.get(cacheKey);
            stream.subscribe(res, req);
            return;
          }

          // 3. New synthesis request: create InflightStream and pipe from persistent warm TTS
          const stream = new InflightStream();
          inflight.set(cacheKey, stream);
          stream.subscribe(res, req);

          try {
            const tts = await getSharedTts(voice);
            const { audioStream } = tts.toStream(text);

            audioStream.on('data', (chunk) => {
              stream.write(chunk);
            });
            audioStream.on('end', () => {
              const fullBuf = Buffer.concat(stream.chunks);
              cache.set(cacheKey, fullBuf);
              inflight.delete(cacheKey);
              stream.end();
            });
            audioStream.on('error', (err) => {
              inflight.delete(cacheKey);
              stream.destroy(err);
              resetSharedTts();
            });
          } catch (err) {
            inflight.delete(cacheKey);
            stream.destroy(err);
            resetSharedTts();
          }
        } catch (err) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(String(err));
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      });
    },
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
