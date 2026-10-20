import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://candela-biblia.vercel.app',
  integrations: [preact()],
});
