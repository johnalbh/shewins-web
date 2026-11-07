# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bilingual (EN / ES) site for Asociación She Wins, Málaga (www.shewins.es): Astro 7 + Keystatic, deployed on Vercel. It is a migration of the designer's static HTML site, which lives in `../html` and is still the reference for markup, copy and SEO.

## Commands

Requires Node 24.

```bash
npm run dev       # http://localhost:4321; Keystatic panel at /keystatic in local mode (edits files on disk)
npm run build     # fetches the brand font, then astro build → .vercel/output
node scripts/compare-with-html.mjs   # after a build: SEO head + visible text of every page vs ../html
npm run audit:responsive -- --base http://localhost:4321 --out audit/run [--pages /about,/es/about]
sh scripts/visual-diff.sh audit/<run-a> audit/<run-b>   # pixel diff of two audit runs (ImageMagick)
```

There is no test suite and no linter. `npm run build` is the type and content check (Keystatic's reader fails on invalid content). The responsive audit (Playwright with the installed Chrome) is how layout changes are verified. `--pages` limits it to some URLs.

## Architecture

**Rendering.** Every page is static HTML generated at build time. Only `/keystatic` and `src/pages/api/form.ts` (`prerender = false`) run as Vercel functions. `trailingSlash: 'never'`, `build.format: 'file'` and `compressHTML: false` keep the URLs and whitespace of the original site. Do not change them.

**Bilingual pages.**
- Each page has one template in `src/views/` that takes `lang`.
- `src/pages/x.astro` and `src/pages/es/x.astro` are one-line wrappers that pass `lang="en"` or `lang="es"`.
- In a view, `const { L, u } = localize(lang)` (`src/i18n`): `L("English", "Español")` picks the text and `u("/events")` localizes a path.
- Translated text is wrapped in `<span class={lang}>`. `public/style.css` hides `.en`/`.es` according to `<html lang>`, and `src/scripts/site.js` injects markup with both spans, so keep the wrapper.
- English is at the root and Spanish under `/es` with identical paths. There is no redirect by browser language.

**Adding a fixed page** touches several places:
- a view;
- two page wrappers (EN and ES);
- an entry in `src/data/seo.json`;
- the sitemap priority map in `src/pages/sitemap.xml.ts`;
- `src/pages/llms.txt.ts` if it is a main page.
- the page list in `scripts/responsive-audit.mjs`, or `--pages` cannot reach it.

The `seo.json` key is the `route` prop of `Base.astro`. It is also the `body[data-route]` that the scripts read. `Base.astro` builds the whole `<head>` from it: canonical, hreflang, OG and JSON-LD. Blog posts pass `seo` and `path` overrides instead.

**Content (Keystatic).** `keystatic.config.ts` defines the panel and `src/content/` holds the files. The storage is `local` in dev and `cloud` in production, where every save in the panel is a commit and Vercel rebuilds. `src/lib/content.ts` reads the content at build time with `createReader`:
- A post keeps both languages in one entry: `index.yaml` plus `bodyEn.mdoc` and `bodyEs.mdoc`.
- The post slug is shared by `/blog/…` and `/es/blog/…`.
- Reading time is computed from the English body.

**Markdoc.** `src/lib/markdoc.ts` renders article bodies to the designer's markup:
- blockquote becomes `.pull`;
- external links get `target=_blank`;
- the custom tags `callout`, `checklist` and `sources` map to brand components.

The tags must match the `articleBlocks` in `keystatic.config.ts`. `@markdoc/markdoc` is pinned to the version Keystatic parses with, so the node trees match.

**Images.** Keystatic image fields store `/src/assets/…` paths. `src/lib/images.ts` resolves them through `import.meta.glob` so that `astro:assets` can optimise them. Fixed-page images are plain files in `public/assets/`.

**Events depend on the date.**
- `getEventsByTime()` splits events around today in Europe/Madrid at build time. This drives "Next free event", "This month" and "Past events".
- `.github/workflows/daily-rebuild.yml` calls a Vercel deploy hook every night so that past events move on.
- `site.js` also sets the event status pills on the client.

**CSS layers.** `public/style.css` is the designer's original (Messin Virginia) and is never edited. Changes go in `src/styles/`, imported by `Base.astro` in this order:
1. `fixes.css`: bugs and accessibility in the original markup;
2. `responsive.css`: one numbered block per audit finding;
3. `controls.css`: square buttons;
4. `motion.css`.

`article.css` is imported by the blog post view. Each block starts with a comment saying why it exists. Follow that pattern.

**Forms.**
- `site.js` validates each `form[data-form]` and POSTs JSON to the URL set in `window.SW_FORMS` (`public/config.js`). Field ids become the JSON keys.
- `api/form.ts` sends `letter` and `waitlist` to MailerLite groups (double opt-in) and sends a team notification through MailerSend for `contact` and `waitlist`.
- The endpoint is public and trusts nothing from the browser. It accepts only same-origin JSON up to 16 KB. `parse()` keeps an allowlist of fields per form, so a new form field must be added there. The consent time comes from the server clock. An email already in MailerLite is only added to the group, and its fields are never overwritten. Keep these properties when changing the endpoint.
- The newsletter and waitlist forms show only the email at first. In `site.js`, a form that contains a `dialog.ask` opens that dialog on its first submit instead of sending. Validation skips fields inside a closed dialog. The form is then sent from the dialog, and the thank-you (`.sent`, copied in) shows there. The form switches to `.done` only when the dialog closes, because a `display: none` form would also hide its open dialog. A radio group is sent as `{name: checked value}`, and every other field as `{id: value}`.
- Both signup forms ask for the name and the language of the emails (`em-lang`, `w-lang`). That chosen language, not the page language, is what goes to the MailerLite `language` field.
- A field whose id ends in `-website` is a honeypot.
- The Letter form is one component, `src/components/forms/LetterSignup.astro`. Use it at most once per page: `api/form.ts` reads the fixed ids `em-letter`, `em-name` and `em-lang`. Other places link to `/letter` instead.
- `site.js` fires `sw-form-sent` (`detail.form`) after a successful send. `src/scripts/letter-invite.js` listens for it, so the Letter invitation card (`LetterInvite.astro`) stops showing after a signup. The card skips the routes listed in its component and keeps its state in localStorage `sw-letter`.
- With no API keys, dev logs the submission and returns ok. See `.env.example`.
- To test against fake APIs, point `MAILERLITE_API_URL` and `MAILERSEND_API_URL` at a local mock server. If a dev server is already running, Astro 7 refuses to start a second one unless you pass `astro dev --port <n> --ignore-lock`.

**Brand font.** Wonderful Branding is licensed and must never be committed (it is gitignored). `scripts/fetch-brand-font.mjs` downloads it from `BRAND_FONT_URL` (Vercel Blob) at build time. For local work, copy it into `public/fonts/`.

**Scripts.** `src/scripts/*.js` are plain ES5-style IIFEs ported from the original inline scripts. They are not modules with imports.

## Design and product rules

`DESIGN.md` (the design system "The Chapter Book", with `.impeccable/design.json` as its sidecar) and `PRODUCT.md` (users, purpose, constraints) are binding. Read them before any UI or copy change. The rules that are easiest to break:
- Text only on the approved colour pairs. Never pink text on cream. No new small cream text on the gradient.
- Hairline rows, not cards. Square controls; only tags are round pills. Flat colour blocks; the brand gradient is the only gradient.
- One script phrase per chapter, never clipped.
- Never invent member or attendance numbers, press, case studies or testimonials.
- Membership has no price or date ("opening soon").

Fixed page copy (home, about, membership, partners, legal) is edited in the views. Blog posts, events, authors and contact links are edited in Keystatic (`docs/editor-guide.md` is the guide for the non-technical editors).

## Conventions

- Commits: gitmoji + Conventional Commits, in English, with a scope, for example `✨ feat(forms): …`, `💄 style(article): …`, `🐛 fix(motion): …`.
- Code comments explain the why in plain English sentences, and often refer to the original HTML or the audit.
- Pin exact dependency versions in `package.json`; there are no `^` ranges.
