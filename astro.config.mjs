import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact()],
  redirects: {
    '/1-samuel/examene': '/1-samuel',
    '/2-samuel/examene': '/2-samuel',
  },
  // pages are tiny: loading them when a link is touched makes the next page instant
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
