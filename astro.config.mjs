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
        await handleTts(req, res, { text: url.searchParams.get('text'), voice: url.searchParams.get('voice') });
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
