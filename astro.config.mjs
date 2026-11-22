import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lumost.id',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'auto' },
});
