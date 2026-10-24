import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';
import { todayInMadrid } from './dates';

// Content is read from the repository files at build time.
const reader = createReader(process.cwd(), keystaticConfig);

export async function getSettings() {
  const settings = await reader.singletons.settings.readOrThrow();
  return settings;
}

export async function getAuthors() {
  const authors = await reader.collections.authors.all();
  return new Map(authors.map(({ slug, entry }) => [slug, entry]));
}

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

export async function getEvents() {
  const events = await reader.collections.events.all();
  return events.map(({ slug, entry }) => ({ slug, ...entry })).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

export type Event = Awaited<ReturnType<typeof getEvents>>[number];

/** Events split around today (Madrid time). Past events are newest first. */
export async function getEventsByTime() {
  const today = todayInMadrid();
  const events = await getEvents();
  return {
    today,
    upcoming: events.filter((e) => e.date && e.date >= today),
    past: events.filter((e) => e.date && e.date < today).reverse(),
    fromMonthStart: events.filter((e) => e.date && e.date >= `${today.slice(0, 7)}-01`),
  };
}

// About 200 words a minute, the pace the original reading times were based on.
function readingTime(node: { walk(): Iterable<{ type: string; attributes: Record<string, unknown> }> }) {
  let words = 0;
  for (const child of node.walk()) {
    if (child.type === 'text') words += String(child.attributes.content ?? '').split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200));
}
