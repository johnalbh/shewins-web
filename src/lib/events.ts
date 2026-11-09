// The She Wins events as the pages show them. They come from the group on Meetup, where the team
// publishes them (src/lib/meetup.ts); Keystatic holds no events (November 2026).
import { localize, type Lang } from '../i18n';
import { getSettings } from './content';
import { todayInMadrid } from './dates';
import { getMeetupEvents, type MeetupEvent } from './meetup';

export type Event = MeetupEvent;

/**
 * The events split around today (Madrid time). Past events are newest first. If Meetup did not
 * answer during the build, every list is empty and each event section shows its own "new dates
 * coming" state.
 */
export async function getEventsByTime() {
  const today = todayInMadrid();
  const events = (await getMeetupEvents((await getSettings()).meetup)) ?? [];
  const upcoming = events.filter((e) => e.date >= today);
  return {
    today,
    upcoming,
    // The event of the "Next free event" frame (home and events). The frame says "free", so paid
    // events are skipped. This month leaves it out of its tiles, so the one place to work it out.
    nextFree: upcoming.find((e) => !e.fee),
    past: events.filter((e) => e.date < today).reverse(),
    fromMonthStart: events.filter((e) => e.date >= `${today.slice(0, 7)}-01`),
  };
}

/** "18:00–20:00", or the start alone when Meetup has no end time. */
export const timeRange = (ev: Event) => [ev.startTime, ev.endTime].filter(Boolean).join('–');

/** Alt text of an event's Meetup image: the poster, with the speaker when there is one. */
export function posterAlt(ev: Event, lang: Lang) {
  const { L } = localize(lang);
  const what = ev.speaker ? L(`${ev.title} with ${ev.speaker}`, `${ev.title} con ${ev.speaker}`) : ev.title;
  return L(`Event poster: ${what}`, `Póster del evento: ${what}`);
}

/** The price of a paid event in the page's number format ("15 €", "€15"); empty when free. */
export function formatFee(ev: Event, lang: Lang) {
  if (!ev.fee) return '';
  const format = new Intl.NumberFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    style: 'currency',
    currency: ev.fee.currency,
    maximumFractionDigits: 0,
  });
  return format.format(ev.fee.amount);
}
