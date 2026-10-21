import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact()],
  // pages are tiny: loading them when a link is touched makes the next page instant
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
