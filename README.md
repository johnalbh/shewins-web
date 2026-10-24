# SheWins website

Source of **www.shewins.es**: the bilingual (EN / ES) site of Asociación She Wins, Málaga.

- **Astro** builds static HTML for every page. Only the editing panel and the form endpoint run as Vercel functions.
- **Keystatic** is the editing panel at `/keystatic`. Blog articles, events, authors and contact links are stored as files in this repository (`src/content/`). Every save in the panel is a commit, and Vercel rebuilds the site.
- The design is the designer's original `public/style.css` (Messin Virginia), unchanged. Motion lives in `src/styles/motion.css` and responsive fixes in `src/styles/responsive.css`.

Editors: see [docs/editor-guide.md](docs/editor-guide.md).

## Develop

Requires Node 24.

```bash
npm install
npm run dev          # http://localhost:4321, panel at /keystatic (local mode: edits files on disk)
npm run build        # output in .vercel/output
```

| Path | What it is |
|---|---|
| `src/views/` | One template per page, with both languages: `L("English", "Español")` |
| `src/pages/` | One line per URL (`about.astro`, `es/about.astro`…), same URLs as the original site |
| `src/components/chrome/` | Header, menu, footer, cookie banner, sticky CTA |
| `src/components/events/`, `blog/` | Sections built from content: next event, this month, past posters, blog list |
| `src/content/` | Content edited in Keystatic (YAML + Markdoc) |
| `src/data/seo.json` | Title, description and JSON-LD of each fixed page |
| `src/lib/` | Content reader, Markdoc rendering, dates, images |
| `src/scripts/` | Site behaviour (menu, forms, event status) and cookie consent, ported from the original |
| `src/pages/api/form.ts` | Form endpoint (Brevo) |
| `keystatic.config.ts` | Panel fields and labels |

Scripts:

- `node scripts/compare-with-html.mjs`: after a build, compares every page with the designer's original in `../html` (SEO head and visible text).
- `npm run audit:responsive -- --base http://localhost:4321 --out audit/run`: checks overflow, tap targets and input sizes at 18 widths, with screenshots (uses the installed Chrome).
- `scripts/migrate-from-html.mjs`: the one-off migration from `../html`, kept for reference.

## Deploy and services

1. **GitHub**: the repository belongs to the association's GitHub account.
2. **Vercel**: import the repository (framework preset Astro, Node 24). Add the domain (`www.shewins.es` main, `shewins.es` redirects to it).
3. **Keystatic Cloud** (free up to 3 users): project key `shewins-website/shewins-web` (it must match `cloud.project` in `keystatic.config.ts`), Primary URL `https://www.shewins.es`, connected to `johnalbh/shewins-web`. Invite the editors by email under Users.
4. **Brevo** (forms and newsletter): authenticate `shewins.es` (DKIM/SPF), create the "Waitlist" and "Newsletter" lists and a double opt-in template, and set the variables from `.env.example` in Vercel.
5. **Daily rebuild**: create a Vercel Deploy Hook and save it as the `VERCEL_DEPLOY_HOOK` secret in GitHub (see `.github/workflows/daily-rebuild.yml`).
6. **Brand font**: Wonderful Branding (Din Studio) is a licensed font and is not in this repository. It lives in the project's Vercel Blob store, and `npm run build` downloads it from `BRAND_FONT_URL` (see `scripts/fetch-brand-font.mjs`). For local work, copy it into `public/fonts/` (it is git-ignored). The owners should confirm they hold a commercial licence for it.

Vercel's Hobby plan covers a non-commercial association site. It must move to Pro if the site takes payments (for example membership fees) or if the developer is paid for the work.
