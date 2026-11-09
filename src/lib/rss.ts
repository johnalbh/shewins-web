// RSS feed of the blog, one per language (/rss.xml and /es/rss.xml), linked from every page's
// <head>. Feed readers, Bing and the AI crawlers pick up new articles from it without waiting for
// a crawl. Built from the same posts as the blog pages, newest first.
import seo from '../data/seo.json';
import { SITE, localize, type Lang } from '../i18n';
import { getPosts, type Post } from './content';
import { escapeHtml } from './html';
import { LOGO_URL, pageName } from './seo';

/** Publish dates are days; the feed gives them 9:00 Spanish time. */
const pubDate = (day: string) => new Date(`${day}T09:00:00+01:00`).toUTCString();

function itemXml(post: Post, lang: Lang) {
  const { L, u } = localize(lang);
  const link = `${SITE}${u(`/blog/${post.slug}`)}`;
  return [
    '<item>',
    `<title>${escapeHtml(L(post.title, post.titleEs))}</title>`,
    `<link>${link}</link>`,
    `<guid isPermaLink="true">${link}</guid>`,
    post.publishedAt ? `<pubDate>${pubDate(post.publishedAt)}</pubDate>` : '',
    `<description>${escapeHtml(L(post.excerptEn, post.excerptEs))}</description>`,
    post.authorEntry ? `<dc:creator>${escapeHtml(post.authorEntry.name)}</dc:creator>` : '',
    '</item>',
  ].join('');
}

export async function rssFeed(lang: Lang) {
  const { u } = localize(lang);
  const posts = await getPosts();
  const blog = seo.blog[lang];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
<title>${escapeHtml(pageName(blog.title))}</title>
<link>${SITE}${u('/blog')}</link>
<description>${escapeHtml(blog.description)}</description>
<language>${lang}</language>
<atom:link href="${SITE}${u('/rss.xml')}" rel="self" type="application/rss+xml"/>
<image><url>${LOGO_URL}</url><title>She Wins</title><link>${SITE}${u('/')}</link></image>
${posts.map((post) => itemXml(post, lang)).join('\n')}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
