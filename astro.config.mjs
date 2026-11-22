import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://lumost.id',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto' },
  adapter: cloudflare(),
});