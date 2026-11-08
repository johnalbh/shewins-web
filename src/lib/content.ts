import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';
import { todayInMadrid } from './dates';
import { getMeetupEvents, type MeetupEvent } from './meetup';

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

type KeystaticEvent = Awaited<ReturnType<typeof getEvents>>[number];

export type Event = KeystaticEvent & {
  /** "meetup" for the events read from Meetup (lab page); unset for the Keystatic events. */
  source?: 'meetup';
  meetup?: MeetupEvent;
  /** False for paid events; unknown (undefined) for Keystatic events, which count as free. */
  free?: boolean;
};

/**
 * Events split around today (Madrid time). Past events are newest first.
 * With `meetup` (lab page only for now), the events come from Meetup alone and Keystatic's are not read.
 */
export async function getEventsByTime({ meetup = false } = {}) {
  const today = todayInMadrid();
  const events: Event[] = meetup ? await getMeetupOnlyEvents() : await getEvents();
  return {
    today,
    upcoming: events.filter((e) => e.date && e.date >= today),
    past: events.filter((e) => e.date && e.date < today).reverse(),
    fromMonthStart: events.filter((e) => e.date && e.date >= `${today.slice(0, 7)}-01`),
    /** Null when Meetup was not asked, false when it did not answer. */
    meetupLoaded: meetup ? (await getMeetupEvents((await getSettings()).meetup)) !== null : null,
  };
}

/**
 * The team publishes its events on Meetup and does not want to enter them again in Keystatic
 * (November 2026), so with Meetup on, every event comes from there. What Meetup has no field for
 * is worked out or left out: the title is cleaned, the language guessed from the text, and the
 * speaker's role, the second-language topic and the Luma and Instagram links are not shown.
 * If Meetup does not answer, there are no events: the page shows its "new date coming soon" state.
 */
async function getMeetupOnlyEvents(): Promise<Event[]> {
  const remote = await getMeetupEvents((await getSettings()).meetup);
  return (remote ?? []).map((m) => ({
    slug: `meetup-${m.id}`,
    title: m.title,
    date: m.date,
    startTime: m.startTime,
    endTime: m.endTime,
    language: m.language,
    venue: m.venue,
    host: m.speaker,
    hostRoleEn: '',
    hostRoleEs: '',
    topicEn: m.subtitle,
    topicEs: m.subtitle,
    meetupUrl: m.url,
    lumaUrl: null,
    poster: null,
    posterAlt: '',
    instagramUrl: null,
    source: 'meetup' as const,
    meetup: m,
    free: !m.fee,
  }));
}

// About 200 words a minute, the pace the original reading times were based on.
function readingTime(node: { walk(): Iterable<{ type: string; attributes: Record<string, unknown> }> }) {
  let words = 0;
  for (const child of node.walk()) {
    if (child.type === 'text') words += String(child.attributes.content ?? '').split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200));
}
