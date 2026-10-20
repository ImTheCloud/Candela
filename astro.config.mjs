import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import serviceWorker from './integrations/service-worker.mjs';

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact(), serviceWorker()],
});
