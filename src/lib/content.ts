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
  /** Where the event came from. Keystatic-only events have no Meetup data. */
  source?: 'keystatic' | 'meetup' | 'both';
  meetup?: MeetupEvent;
  /** False for paid events; unknown (undefined) for Keystatic-only events, which count as free. */
  free?: boolean;
};

/**
 * Events split around today (Madrid time). Past events are newest first.
 * With `meetup`, the Keystatic events are merged with the group's Meetup events (lab page only for now).
 */
export async function getEventsByTime({ meetup = false } = {}) {
  const today = todayInMadrid();
  const events: Event[] = meetup ? await getEventsWithMeetup() : await getEvents();
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
 * Meetup is the source of the facts (date, times, place, price), so a change there reaches the site
 * on the next build. Keystatic adds what Meetup has no field for: the poster title, the bilingual
 * topic, the speaker's role, the language and the poster. An event that is only on Meetup still
 * shows, with its title cleaned and its language guessed.
 */
async function getEventsWithMeetup(): Promise<Event[]> {
  const [local, settings] = await Promise.all([getEvents(), getSettings()]);
  const remote = await getMeetupEvents(settings.meetup);
  if (!remote) return local;

  const byId = new Map(remote.map((m) => [m.id, m]));
  const used = new Set<string>();
  // A Keystatic event matches by the Meetup event id in its link, or else by being the only Meetup event that day.
  const matchOf = (e: KeystaticEvent) => {
    const id = e.meetupUrl?.match(/\/events\/(\d+)/)?.[1];
    if (id && byId.has(id)) return byId.get(id);
    const sameDay = remote.filter((m) => m.date === e.date);
    return sameDay.length === 1 ? sameDay[0] : undefined;
  };

  const merged: Event[] = local.map((e) => {
    const m = matchOf(e);
    if (!m || used.has(m.id)) return { ...e, source: 'keystatic' };
    used.add(m.id);
    return {
      ...e,
      date: m.date,
      startTime: m.startTime,
      endTime: m.endTime,
      venue: m.venue,
      host: e.host || m.speaker,
      topicEn: e.topicEn || m.subtitle,
      topicEs: e.topicEs || m.subtitle,
      meetupUrl: m.url,
      source: 'both',
      meetup: m,
      free: !m.fee,
    };
  });

  for (const m of remote) {
    if (used.has(m.id)) continue;
    merged.push({
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
      source: 'meetup',
      meetup: m,
      free: !m.fee,
    });
  }
  return merged.sort((a, b) => `${a.date} ${a.startTime.padStart(5, '0')}`.localeCompare(`${b.date} ${b.startTime.padStart(5, '0')}`));
}

// About 200 words a minute, the pace the original reading times were based on.
function readingTime(node: { walk(): Iterable<{ type: string; attributes: Record<string, unknown> }> }) {
  let words = 0;
  for (const child of node.walk()) {
    if (child.type === 'text') words += String(child.attributes.content ?? '').split(/\s+/).filter(Boolean).length;
  }
  return Math.max(1, Math.round(words / 200));
}
