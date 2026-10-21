import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import serviceWorker from './integrations/service-worker.mjs';

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact(), serviceWorker()],
  // pages are tiny: loading them when a link is touched makes the next page instant
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
