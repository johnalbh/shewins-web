// Lint rules for the whole repository. Formatting is Prettier's job (eslint-config-prettier turns
// off the rules that would fight it); ESLint looks for mistakes: unused code, undefined names,
// unsafe patterns.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['.astro/', '.vercel/', 'dist/', 'audit/', 'node_modules/', 'public/', 'src/content/'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    // Build scripts, configuration and tests run in Node.
    files: ['scripts/**', '*.{js,mjs,ts}', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
  {
    // The Playwright scripts pass functions that run inside the page.
    files: ['scripts/responsive-audit.mjs', 'scripts/smoke-test.mjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // Server code in src (endpoints, lib, frontmatter) reads process.env alongside import.meta.env.
    files: ['src/**/*.ts', 'src/**/*.astro'],
    languageOptions: { globals: globals.node },
  },
  {
    // Browser scripts: plain ES5-style IIFEs ported from the original pages, bundled by Astro,
    // and the <script is:inline> blocks of the .astro files, which stay ES5 too.
    files: ['src/scripts/**', '**/*.astro/*.{js,ts}'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-var': 'off' },
  },
  prettier,
);
