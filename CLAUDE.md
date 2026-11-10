# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bilingual (EN / ES) site for Asociación She Wins, Málaga (www.shewins.es): Astro 7 + Keystatic, deployed on Vercel. It is a migration of the designer's static HTML site, which lives in `../html` and is still the reference for markup, copy and SEO.

## Commands

Requires Node 24.

```bash
npm run dev       # http://localhost:4321; Keystatic panel at /keystatic in local mode (edits files on disk)
npm run build     # fetches the brand font, then astro build → .vercel/output
npm run check     # format:check + lint + typecheck + test, what CI runs before the build
npm run format    # Prettier (TS, JS, CSS, JSON, YAML; not .astro, see Conventions)
npm run lint      # ESLint (lint:fix to fix)
npm run typecheck # astro check (TypeScript in .ts and .astro)
npm test          # Vitest, tests/ (test:watch while working)
npm run test:smoke                   # Playwright against a running npm run dev (--base to change it)
node scripts/compare-with-html.mjs   # after a build: SEO head + visible text of every page vs ../html
npm run audit:responsive -- --base http://localhost:4321 --out audit/run [--pages /about,/es/about]
sh scripts/visual-diff.sh audit/<run-a> audit/<run-b>   # pixel diff of two audit runs (ImageMagick)
```

**Checks.**
- `npm test` runs the unit tests in `tests/` (never in `src/pages/`, where Astro would make them routes). `tests/api/form.test.ts` runs the real `/api/form` handler with BotID, DNS and the MailerLite / MailerSend APIs faked: use it, not a live request, to check the endpoint.
- `npm run test:smoke` (`scripts/smoke-test.mjs`) checks the browser behaviour of `src/scripts/` in Chrome: menu, language buttons, every form's messages, dialogs and JSON, the contact dialog, sticky bar, event pills, cookie banner, Letter invitation, share, field arrow. It intercepts `/api/form`, so nothing is sent.
- `npm run build` is also the content check (Keystatic's reader fails on invalid content). Astro build does not check types; `npm run typecheck` does.
- The responsive audit (Playwright with the installed Chrome) and `visual-diff.sh` are how layout changes are verified. `--pages` limits the audit to some URLs.
- A pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on the staged files, and `.github/workflows/ci.yml` runs `npm run check` and the build on every push to main. Commits from the Keystatic panel skip the hook, not CI.
- With the real keys in `.env.local`, a valid form sent to the dev server really subscribes the address (to the Test group) and sends emails. Check the endpoint with `npm test` instead.

## Architecture

**Rendering.** Every page is static HTML generated at build time. Only `/keystatic` and `src/pages/api/form.ts` (`prerender = false`) run as Vercel functions. `trailingSlash: 'never'`, `build.format: 'file'` and `compressHTML: false` keep the URLs and whitespace of the original site. Do not change them.

**Bilingual pages.**
- Each page has one template in `src/views/` that takes `lang`.
- `src/pages/x.astro` and `src/pages/es/x.astro` are one-line wrappers that pass `lang="en"` or `lang="es"`.
- In a view, `const { L, u } = localize(lang)` (`src/i18n`): `L("English", "Español")` picks the text and `u("/events")` localizes a path.
- Translated text is wrapped in `<span class={lang}>`. `public/style.css` hides `.en`/`.es` according to `<html lang>`, and the scripts inject markup with both spans (`forms.js`, `event-status.js`), so keep the wrapper.
- English is at the root and Spanish under `/es` with identical paths. There is no redirect by browser language.

**Adding a fixed page** touches several places:
- a view;
- two page wrappers (EN and ES);
- an entry in `src/data/seo.json` (title, description, `ogType`, optional schema.org `pageType`);
- the sitemap priority map in `src/pages/sitemap.xml.ts`;
- `src/pages/llms.txt.ts` if it is a main page.
- the page list in `scripts/responsive-audit.mjs`, or `--pages` cannot reach it.

The `seo.json` key is the `route` prop of `Base.astro`. It is also the `body[data-route]` that the scripts read. `Base.astro` builds the whole `<head>` from it: canonical, hreflang, OG, the RSS link and JSON-LD. Blog posts pass `seo`, `path` and `crumbs` overrides instead.

**SEO rules.**
- The JSON-LD is built by `src/lib/seo.ts`, not written by hand: every page gets `Organization` (links and email from Keystatic settings), `WebSite`, `WebPage` and `BreadcrumbList`; a view adds its own nodes through the `jsonLd` prop of `Base.astro` (`blogPosting` on articles, `eventNode` for the upcoming Meetup events a page shows: the next free event on the home, that plus this month's on Events). Mark up only events visible on the page.
- Titles stay under about 60 characters; article titles get the short suffix `| She Wins`.
- The 404 (`src/views/NotFound.astro`, `route="404"`) is one file for every missing URL, so each text carries both languages as `.en`/`.es` spans and an inline script switches the chapter (`data-lang`) and the links to Spanish under `/es`; the chrome stays English. It is `noindex` and has no canonical or hreflang. `robots.txt` and the `X-Robots-Tag` headers in `vercel.json` keep `/keystatic` and `/api/` out of the index. `vercel.json` also redirects `/index.html`, `/es/index.html` and the `shewins-web.vercel.app` alias to the real URLs.
- The sitemap gives `lastmod` only to articles (their publish date). Never put the build date there.
- `/rss.xml` and `/es/rss.xml` (`src/lib/rss.ts`) list the articles for feed readers and crawlers.
- `scripts/compare-with-html.mjs` compares the head only on URL structure (canonical, hreflang, og:url, lang, route): titles, descriptions and structured data differ from `../html` on purpose.

**Content (Keystatic).** `keystatic.config.ts` defines the panel and `src/content/` holds the files. The storage is `local` in dev and `cloud` in production, where every save in the panel is a commit and Vercel rebuilds. `src/lib/content.ts` reads the content at build time with `createReader` (`getSettings`, `getPosts`), and only that:
- A post keeps both languages in one entry: `index.yaml` plus `bodyEn.mdoc` and `bodyEs.mdoc`.
- The post slug is shared by `/blog/…` and `/es/blog/…`.
- Reading time is computed from the English body.

**Markdoc.** `src/lib/markdoc.ts` renders article bodies to the designer's markup:
- blockquote becomes `.pull`;
- external links get `target=_blank`;
- the custom tags `callout`, `checklist` and `sources` map to brand components.

The tags must match the `articleBlocks` in `keystatic.config.ts`. `@markdoc/markdoc` is pinned to the version Keystatic parses with, so the node trees match.

**Images and icons.** Fixed-page images are plain files in `public/assets/`. Event images come from Meetup (below). Every icon (arrow, back, down, close, tick, Meetup, Instagram) is defined once in `src/lib/markup.ts` and placed with `<Icon name="arrow" />` (`src/components/Icon.astro`); a button's arrow goes in its cell, `<span class="ar"><Icon name="arrow" /></span>`. Never paste an SVG copy into a view.

**Events come from Meetup.**
- The team publishes its events on the She Wins group on Meetup; Keystatic holds no events (team decision, November 2026). `src/lib/meetup.ts` reads the group's events at build time from Meetup's public GraphQL endpoint (no key; Meetup only documents its API for Pro, so it may stop). A failed request gets 3 tries; after that the build goes on with no events and each section shows its empty state.
- Meetup has no language field and no speaker role: the language is guessed from the text, and the title is cleaned ("BUILD WITHOUT BURNOUT   Energy…" → "Build without burnout", the rest becomes the subtitle). The speaker comes from Meetup's speaker field, the price from its payment settings.
- `getEventsByTime()` (`src/lib/events.ts`, with `timeRange`, `posterAlt` and `formatFee`) splits the events around today in Europe/Madrid. "Next free event" (`NextEvent`, home and events) takes the first upcoming event without a price, with Meetup's image under the date. "This month" (`ThisMonth`, events) shows the month's events, except the one in the Next free event frame above it (listed too, it read as two events; team request, November 2026), as colour-block tiles framing Meetup's poster (the nearest upcoming tile red, the others cream, with a gap between them), with the day numeral, status pill, title (the link, stretched over the tile), host, place and pills; team request, November 2026: images, not text rows. "Recent events" / "Past events" (`PastEvents`) show the last three, each with Meetup's 16:9 image (never cropped, it has text on it) and two small red squares to Meetup and Instagram.
- `.github/workflows/daily-rebuild.yml` calls a Vercel deploy hook every night, so new Meetup events appear and past ones move on. `event-status.js` also sets the event status pills on the client.
- `astro.config.mjs` allows `secure.meetupstatic.com` images, so `astro:assets` downloads and optimises them; a running dev server must be restarted after a change there.

**CSS layers.** `public/style.css` is the designer's original (Messin Virginia) and is never edited. Changes go in `src/styles/`, imported by `Base.astro` in this order:
1. `fixes.css`: bugs and accessibility in the original markup;
2. `responsive.css`: one numbered block per audit finding;
3. `controls.css`: square buttons;
4. `motion.css`.

`article.css` is imported by the blog post view. Each block starts with a comment saying why it exists. Follow that pattern.

**Forms.**
- `src/scripts/forms.js` validates each `form[data-form]` and POSTs JSON to the URL set in `window.SW_FORMS` (`public/config.js`). Field ids become the JSON keys.
- Every required field in every form is checked the same way (`problemOf()` and `showProblem()` in `forms.js`; the email pattern is the one `src/lib/forms/submission.ts` uses). A `.fmsg` line under the field says what is missing and goes as soon as the field is right. `data-err-en` / `data-err-es` on a field give it its own words; the other fields get the words for their type. Never disable a submit button instead.
- `src/pages/api/form.ts` is only the request handler, a list of named checks; the rest is in `src/lib/forms/`: `submission.ts` (allowlist and validation), `spam.ts` (honeypot, MX, link spam), `settings.ts` (environment, testing mode), `mailerlite.ts`, `mailersend.ts`, and `deliver.ts`, which sends `letter` and `waitlist` to MailerLite groups (double opt-in) and a team notification through MailerSend for `contact` and `waitlist`.
- The endpoint is public and trusts nothing from the browser. It accepts only same-origin JSON up to 16 KB. `parseSubmission()` keeps an allowlist of fields per form (one parser per form), so a new form field must be added there. The consent time comes from the server clock. An email already in MailerLite is only added to the group, and its fields are never overwritten. Keep these properties when changing the endpoint.
- The newsletter and waitlist forms show only the email at first. In `forms.js`, a form that contains a `dialog.ask` opens that dialog on its first submit instead of sending. Validation skips fields inside a closed dialog. The form is then sent from the dialog, and the thank-you (`.sent`, copied in) shows there. The form switches to `.done` only when the dialog closes, because a `display: none` form would also hide its open dialog. A radio group is sent as `{name: checked value}`, and every other field as `{id: value}`.
- The waitlist dialog has one consent box, `w-ok`: "I agree to receive emails from She Wins". It starts unticked and is required: without it nobody joins the waitlist (team decision, November 2026). It covers both the membership news and The She Wins Letter, so `waitlistGroups()` (`mailerlite.ts`) adds the email to the Waitlist and Newsletter groups in the same MailerLite request, and there is a single confirmation email. The separate Letter box `w-letter` is gone; an explicit `w-letter: false` from a page loaded before the change still keeps the email out of the Newsletter group.
- "Join the waitlist" buttons (the Membership opener, the sticky bar, the header) open the waitlist dialog directly instead of scrolling to the form; from another page, `/membership#waitlist` opens it on arrival. Opened this way, the dialog asks for the email itself (`w-mail-ask`, copied into `w-mail`).
- "Start a conversation" on Partners opens the contact form in a dialog (`dialog.ask-form`) instead of scrolling to it. `forms.js` moves the form's column into the dialog and back when it closes, so there is still one form with the same ids.
- Both signup forms ask for the name and the language of the emails (`em-lang`, `w-lang`). That chosen language, not the page language, is what goes to the MailerLite `language` field.
- A field whose id ends in `-website` is a honeypot.
- Spam checks of the endpoint, besides the honeypot:
  - Vercel BotID. `src/scripts/botid.js` (the one module script) makes every POST to `/api/form` carry a solved invisible challenge, and `checkBotId()` rejects requests without it with 403. A failed check lets the request through. In dev it always answers human. On Vercel, a `curl` to the endpoint gets 403, and so does a form sent from `astro preview`.
  - The email domain must have an MX record. Otherwise the endpoint answers `{invalid: 'email'}` and `forms.js` asks the person to fix the address.
  - A contact message with a link in the name or organisation, or 3 links or more, still reaches the team, with `[Possible spam]` in the subject.
  - A Vercel Firewall rule limits POST `/api/form` per IP (README).
- The Letter form is one component, `src/components/forms/LetterSignup.astro`. Use it at most once per page: the endpoint reads the fixed ids `em-letter`, `em-name` and `em-lang`. Other places link to `/letter` instead.
- `forms.js` fires `sw-form-sent` (`detail.form`, and `detail.data` with the fields sent) after a successful send. `src/scripts/letter-invite.js` listens for it, so the Letter invitation card (`LetterInvite.astro`) stops showing after a Letter or waitlist signup. The card skips the routes listed in its component and keeps its state in localStorage `sw-letter`.
- With no API keys, dev logs the submission and returns ok. See `.env.example`.
- `MAILERLITE_GROUP_TEST` (the MailerLite group "Test") replaces every group in `npm run dev` and on Vercel preview deployments, so tests never reach the real lists, which have real subscribers. Production ignores it, and a missing `VERCEL_ENV` counts as production. `docs/form-testing.md` lists every form and email check.
- To test against fake APIs by hand, point `MAILERLITE_API_URL` and `MAILERSEND_API_URL` at a local mock server; `tests/api/form.test.ts` already covers the endpoint that way. If a dev server is already running, Astro 7 refuses to start a second one unless you pass `astro dev --port <n> --ignore-lock`.

**Brand font.** Wonderful Branding is licensed and must never be committed (it is gitignored). `scripts/fetch-brand-font.mjs` downloads it from `BRAND_FONT_URL` (Vercel Blob) at build time. For local work, copy it into `public/fonts/`.

**Scripts.** `src/scripts/*.js` are plain ES5-style IIFEs (`var`, `function`) ported from the original inline scripts, one concern per file, with named functions. `site.js` is the entry that `Base.astro` loads: it imports, in order, `navigation.js` (menu, EN / ES buttons), `field-language.js`, `forms.js`, `event-status.js`, `sticky-cta.js` and `field-arrow.js`, and Vite bundles them into one file. No part imports another; what they share goes through the DOM and events (`sw-form-sent`, `sw-consent`). `consent.js`, `letter-invite.js` and `share.js` are loaded on their own; `botid.js` is the one real module.

## Design and product rules

`DESIGN.md` (the design system "The Chapter Book", with `.impeccable/design.json` as its sidecar) and `PRODUCT.md` (users, purpose, constraints) are binding. Read them before any UI or copy change. The rules that are easiest to break:
- Text only on the approved colour pairs. Never pink text on cream. No new small cream text on the gradient.
- Hairline rows, not cards. Square controls; only tags are round pills. Flat colour blocks; the brand gradient is the only gradient.
- One script phrase per chapter, never clipped.
- Never invent member or attendance numbers, press, case studies or testimonials.
- Membership has no price or date ("opening soon").

Fixed page copy (home, about, membership, partners, legal) is edited in the views. Blog posts, authors and contact links are edited in Keystatic; events are published on Meetup (`docs/editor-guide.md` is the guide for the non-technical editors).

## Conventions

- Commits: gitmoji + Conventional Commits, in English, with a scope, for example `✨ feat(forms): …`, `💄 style(article): …`, `🐛 fix(motion): …`.
- Code comments explain the why in plain English sentences, and often refer to the original HTML or the audit.
- Pin exact dependency versions in `package.json`; there are no `^` ranges.
- Formatting: Prettier for TS, JS, CSS, JSON and YAML (`.prettierrc.json`, 140 columns, single quotes). `.astro` files are formatted by hand: with `compressHTML: false` their whitespace reaches the HTML, and prettier-plugin-astro ignores `htmlWhitespaceSensitivity`, so it added visible spaces next to links and punctuation. Indent block elements one per line; keep an inline element on one line with its content (`<a …><span>…</span></a>`), and keep a run of inline elements that touch text or punctuation on one line (`…<a>Messin Virginia</a>.`).
- Keep functions small and named for what they do; a file does one thing. Shared logic lives once in `src/lib/` (dates, i18n, events, SEO, HTML escaping, icons), never copied into views.
