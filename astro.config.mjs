import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

function ttsDevPlugin() {
  const cache = new Map();
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
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.end(cache.get(cacheKey));
          }

          const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const { audioStream } = await tts.toStream(text);
          const chunks = [];
          audioStream.on('data', chunk => chunks.push(chunk));
          audioStream.on('end', () => {
            const buf = Buffer.concat(chunks);
            cache.set(cacheKey, buf);
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.end(buf);
            tts.close();
          });
          audioStream.on('error', err => {
            res.statusCode = 500;
            res.end(String(err));
            tts.close();
          });
        } catch (err) {
          res.statusCode = 500;
          res.end(String(err));
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
