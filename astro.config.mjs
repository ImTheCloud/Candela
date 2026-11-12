import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { handleTts } from './api/_tts-core.mjs';

// in dev, /api/tts is served by the same code as the Vercel function
function ttsDevPlugin() {
  return {
    name: 'candela-tts-dev',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        await handleTts(req, res, { text: url.searchParams.get('text'), voice: url.searchParams.get('voice'), marks: url.searchParams.get('marks'), fresh: url.searchParams.get('fresh') });
      });
    },
  };
}

// in dev, /api/admin-delete-account is served via ssrLoadModule
function adminDevPlugin() {
  return {
    name: 'candela-admin-dev',
    configureServer(server) {
      server.middlewares.use('/api/admin-delete-account', async (req, res) => {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
          } catch {
            req.body = {};
          }
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };
          try {
            const mod = await server.ssrLoadModule('./api/admin-delete-account.ts');
            await mod.default(req, res);
          } catch (err) {
            console.error('Error in dev /api/admin-delete-account:', err);
            res.status(500).json({ error: 'internal_error', message: err?.message });
          }
        });
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
    plugins: [ttsDevPlugin(), adminDevPlugin()],
  },
  // pages are tiny: loading them when a link is touched makes the next page instant
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
