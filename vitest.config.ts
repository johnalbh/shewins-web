/// <reference types="vitest/config" />
// Unit tests. getViteConfig() gives the tests the same Vite setup as the site (import.meta.env,
// astro:* modules), so a module is tested exactly as the build runs it. Tests live in tests/,
// never in src/pages/, where Astro would turn them into routes.
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
