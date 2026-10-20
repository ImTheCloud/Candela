import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://candela.vercel.app',
  integrations: [preact()],
});
