import seo from '../data/seo.json';
import { SITE, localize, type Lang } from '../i18n';
import { getPosts } from './content';

// RSS feed of the blog, one per language (/rss.xml and /es/rss.xml), linked from every page's
// <head>. Feed readers, Bing and the AI crawlers pick up new articles from it without waiting for
// a crawl. Built from the same posts as the blog pages, newest first.
export async function rssFeed(lang: Lang) {
  const { L, u } = localize(lang);
  const posts = await getPosts();
  const self = `${SITE}${u('/rss.xml')}`;
  const items = posts.map((p) => {
    const link = `${SITE}${u(`/blog/${p.slug}`)}`;
    const date = p.publishedAt ? `<pubDate>${new Date(`${p.publishedAt}T09:00:00+01:00`).toUTCString()}</pubDate>` : '';
    return `<item><title>${esc(L(p.title, p.titleEs))}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>${date}<description>${esc(L(p.excerptEn, p.excerptEs))}</description>${p.authorEntry ? `<dc:creator>${esc(p.authorEntry.name)}</dc:creator>` : ''}</item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${esc(seo.blog[lang].title.split(' | ')[0])}</title>
<link>${SITE}${u('/blog')}</link>
<description>${esc(seo.blog[lang].description)}</description>
<language>${lang}</language>
<atom:link href="${self}" rel="self" type="application/rss+xml"/>
<image><url>${SITE}/assets/logo-red.png</url><title>She Wins</title><link>${SITE}${u('/')}</link></image>
${items.join('\n')}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
