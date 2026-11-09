import { describe, expect, it } from 'vitest';
import { getPosts } from '../../src/lib/content';
import { rssFeed } from '../../src/lib/rss';

describe('rssFeed', () => {
  it('lists every article of the blog in the language of the feed', async () => {
    const [posts, response] = await Promise.all([getPosts(), rssFeed('es')]);
    const xml = await response.text();
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    expect(xml).toContain('<link>https://www.shewins.es/es/blog</link>');
    expect(xml).toContain('<atom:link href="https://www.shewins.es/es/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml.match(/<item>/g)).toHaveLength(posts.length);
    const first = posts[0];
    expect(xml).toContain(`<link>https://www.shewins.es/es/blog/${first.slug}</link>`);
    // The channel title is the blog page's name, without the "| She Wins" suffix.
    expect(xml).toMatch(/<channel>\n<title>[^<|]+<\/title>/);
  });
});
