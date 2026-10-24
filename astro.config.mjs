import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';

// Pages are static HTML. Only the Keystatic panel (/keystatic) and the form endpoint (/api/form)
// run on demand, as Vercel functions.
export default defineConfig({
  site: 'https://www.shewins.es',
  // Same URLs as the original site: /about, /es/blog/screw-theory… (no .html, no trailing slash).
  trailingSlash: 'never',
  build: { format: 'file' },
  // Keep the whitespace of the original markup as it is (inline spacing in the designer's HTML).
  compressHTML: false,
  integrations: [react(), keystatic()],
  adapter: vercel(),
});
