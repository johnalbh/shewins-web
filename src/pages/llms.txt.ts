import type { APIRoute } from 'astro';
import seo from '../data/seo.json';
import { SITE, localePath } from '../i18n';
import { getPosts, getSettings } from '../lib/content';

// Plain summary for AI assistants, built from the same data as the pages (was html/llms.txt).
const MAIN = ['home', 'about', 'events', 'membership', 'blog', 'partners'] as const;
const LEGAL = ['privacy', 'legal', 'cookies'] as const;

export const GET: APIRoute = async () => {
  const [posts, settings] = await Promise.all([getPosts(), getSettings()]);
  const url = (path: string) => `${SITE}${path}`;
  const name = (title: string) => title.split(' | ')[0];

  const main = MAIN.map((r) => {
    const page = seo[r];
    return `- [${name(page.en.title)}](${url(page.path)}): ${page.en.description}  (ES: ${url(localePath(page.path, 'es'))})`;
  });
  const articles = posts.map((p) => `- [${p.title}](${url(`/blog/${p.slug}`)}): ${p.excerptEn}  (ES: ${url(`/es/blog/${p.slug}`)})`);
  const legal = LEGAL.map((r) => `- [${name(seo[r].en.title)}](${url(seo[r].path)})`);
  const contacts = [settings.email, settings.emailSecondary].filter(Boolean).join(', ');

  const txt = `# SheWins

> ${seo.home.en.description} Run by Asociación She Wins, Málaga, Spain. Content available in English and Spanish (Spanish under /es).

SheWins offers a free in-person event every month, workshops, and a membership (waitlist open). Contact: ${contacts}. Instagram: ${settings.instagram}

## Main pages
${main.join('\n')}

## Blog articles
${articles.join('\n')}

## Legal
${legal.join('\n')}
`;
  return new Response(txt, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
