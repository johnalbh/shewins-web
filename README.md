# She Wins website

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
| `src/pages/api/form.ts` | Form endpoint: MailerLite (newsletter, waitlist) and MailerSend (team notifications) |
| `keystatic.config.ts` | Panel fields and labels |

Scripts:

- `node scripts/compare-with-html.mjs`: after a build, compares every page with the designer's original in `../html` (SEO head and visible text).
- `npm run audit:responsive -- --base http://localhost:4321 --out audit/run`: checks overflow, tap targets and input sizes at 18 widths, with screenshots (uses the installed Chrome).
- `scripts/migrate-from-html.mjs`: the one-off migration from `../html`, kept for reference.

## Deploy and services

1. **GitHub**: the repository belongs to the association's GitHub account.
2. **Vercel**: import the repository (framework preset Astro, Node 24). Add the domain (`www.shewins.es` main, `shewins.es` redirects to it).
3. **Keystatic Cloud** (free up to 3 users): project key `shewins-website/shewins-web` (it must match `cloud.project` in `keystatic.config.ts`), Primary URL `https://www.shewins.es`, connected to `johnalbh/shewins-web`. Invite the editors by email under Users.
4. **Forms**: in **MailerLite**, create the "Newsletter" and "Waitlist" groups, the custom fields "language" and "stage", turn on *Double opt-in for API and integrations*, edit the confirmation email and authenticate `shewins.es`. In **MailerSend**, verify `shewins.es` and create an API token with email access. Then set the variables from `.env.example` in Vercel (production and preview), with the API keys marked **Sensitive**. Use a MailerLite token created only for the website, and never commit it or paste it anywhere else. The group IDs are the numbers of the "Newsletter" and "Waitlist" groups (`GET https://connect.mailerlite.com/api/groups` lists them). The confirmation messages on the site ask people to confirm their email, so double opt-in must stay on. For tests, set `MAILERLITE_GROUP_TEST` (the "Test" group) locally and in the Preview environment: there every signup goes to that group. `docs/form-testing.md` has the full test plan.
5. **Form spam and rate limit**: `/api/form` checks the origin, the fields and the size of every request. It also has a honeypot, Vercel BotID, an MX check on the email and a spam mark on contact messages (see the comment at the top of `src/pages/api/form.ts`). BotID's basic check is free on every plan and needs the project's OIDC option, which is on by default. Only the Vercel Firewall can limit how many requests one IP sends. Add a custom rule for POST `/api/form` that allows 30 requests per IP every 10 minutes. The limit is generous because at an event many people sign up from the same venue Wi-Fi. Start it with the action `log`, check the Firewall traffic, then switch it to `rate_limit` (429).

   ```bash
   vercel firewall rules add "Rate limit forms" \
     --condition '{"type":"path","op":"eq","value":"/api/form"}' \
     --condition '{"type":"method","op":"eq","value":"POST"}' \
     --action rate_limit --rate-limit-window 600 --rate-limit-requests 30 \
     --rate-limit-keys ip --rate-limit-action log --yes
   vercel firewall publish --yes
   ```
6. **Daily rebuild**: create a Vercel Deploy Hook and save it as the `VERCEL_DEPLOY_HOOK` secret in GitHub (see `.github/workflows/daily-rebuild.yml`).
7. **Brand font**: Wonderful Branding (Din Studio) is a licensed font and is not in this repository. It lives in the project's Vercel Blob store, and `npm run build` downloads it from `BRAND_FONT_URL` (see `scripts/fetch-brand-font.mjs`). For local work, copy it into `public/fonts/` (it is git-ignored). The owners should confirm they hold a commercial licence for it.

Vercel's Hobby plan covers a non-commercial association site. It must move to Pro if the site takes payments (for example membership fees) or if the developer is paid for the work.
