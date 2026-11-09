import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

// Content edited in Keystatic (keystatic.config.ts), read from the repository files at build time.
const reader = createReader(process.cwd(), keystaticConfig);

/** Contact and links (Keystatic singleton "settings"). */
export function getSettings() {
  return reader.singletons.settings.readOrThrow();
}

export type Settings = Awaited<ReturnType<typeof getSettings>>;

async function getAuthors() {
  const authors = await reader.collections.authors.all();
  return new Map(authors.map(({ slug, entry }) => [slug, entry]));
}

/** The blog articles, newest first, with their author and reading time. */
export async function getPosts() {
  const [posts, authors] = await Promise.all([reader.collections.posts.all({ resolveLinkedFiles: true }), getAuthors()]);
  return posts
    .map(({ slug, entry }) => ({
      slug,
      ...entry,
      authorEntry: entry.author ? authors.get(entry.author) : undefined,
      // Taken from the English text and shown in both languages, as on the original site.
      readingTime: readingTime(entry.bodyEn.node),
    }))
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

export type Post = Awaited<ReturnType<typeof getPosts>>[number];

// The pace the original reading times were based on.
const WORDS_PER_MINUTE = 200;
const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Minutes to read an article body (a Markdoc tree), at least one. */
function readingTime(node: { walk(): Iterable<{ type: string; attributes: Record<string, unknown> }> }) {
  let words = 0;
  for (const child of node.walk()) {
    if (child.type === 'text') words += countWords(String(child.attributes.content ?? ''));
  }
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
