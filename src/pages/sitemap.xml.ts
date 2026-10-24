import type { APIRoute } from 'astro';
import seo from '../data/seo.json';
import { SITE, alternatesFor } from '../i18n';
import { getPosts } from '../lib/content';

// Same shape as the original sitemap.xml: one <url> per page and language, with hreflang alternates.
const PRIORITY: Record<string, string> = { home: '1.0', about: '0.8', events: '0.8', membership: '0.8', blog: '0.8', partners: '0.6', privacy: '0.5', legal: '0.5', cookies: '0.5' };

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const buildDate = new Date().toISOString().slice(0, 10);
  const pages = [
    ...Object.entries(seo)
      .filter(([route]) => route in PRIORITY)
      .map(([route, page]) => ({ path: page.path, priority: PRIORITY[route], lastmod: buildDate })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, priority: '0.6', lastmod: p.publishedAt ?? buildDate })),
  ];

  const urls = pages.flatMap(({ path, priority, lastmod }) => {
    const alt = alternatesFor(path);
    const links = [
      `<xhtml:link rel="alternate" hreflang="en" href="${SITE}${alt.en}"/>`,
      `<xhtml:link rel="alternate" hreflang="es" href="${SITE}${alt.es}"/>`,
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alt.en}"/>`,
    ].join('');
    return [alt.en, alt.es].map((p) => `<url><loc>${SITE}${p}</loc><lastmod>${lastmod}</lastmod><priority>${priority}</priority>${links}</url>`);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
