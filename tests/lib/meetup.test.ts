import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanTitle } from '../../src/lib/meetup';

describe('cleanTitle', () => {
  it('splits a shouted name from its subtitle at a double space', () => {
    expect(cleanTitle('BUILD WITHOUT BURNOUT   Energy, focus and rest')).toEqual({
      title: 'Build without burnout',
      subtitle: 'Energy, focus and rest',
    });
  });

  it('splits at a colon', () => {
    expect(cleanTitle('CLARIDAD BAJO PRESIÓN: Conversaciones sobre liderazgo')).toEqual({
      title: 'Claridad bajo presión',
      subtitle: 'Conversaciones sobre liderazgo',
    });
  });

  it('splits leading words in capitals from ordinary text', () => {
    expect(cleanTitle('I LOVE SELLING! How to shift your mindset')).toEqual({
      title: 'I love selling!',
      subtitle: 'How to shift your mindset',
    });
  });

  it('keeps a title already in sentence case, and writes the brand as "She Wins"', () => {
    expect(cleanTitle('Coffee & Coworking with shewins')).toEqual({ title: 'Coffee & Coworking with She Wins', subtitle: '' });
  });
});

/** A Meetup event as the GraphQL endpoint returns it. */
function rawEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    title: 'BUILD WITHOUT BURNOUT   Energy and rest',
    description: 'Una sesión para la comunidad, \\*con\\* [enlace](https://example.com) y más.',
    dateTime: '2026-11-20T09:30:00+01:00',
    endTime: '2026-11-20T11:00:00+01:00',
    eventType: 'PHYSICAL',
    eventUrl: 'https://www.meetup.com/she-wins/events/1/',
    venues: [
      {
        name: ' The Hub ',
        address: 'Calle Puerto, 14, Quinta planta',
        city: 'Málaga',
        postalCode: 'meetup6',
        country: 'es',
        lat: 36.7,
        lon: -4.4,
      },
    ],
    featuredEventPhoto: { highResUrl: 'https://secure.meetupstatic.com/photos/1.jpeg' },
    feeSettings: { amount: 0, currency: 'EUR' },
    speakerDetails: { name: ' Ana López ' },
    ...overrides,
  };
}

function meetupAnswer(upcoming: unknown[], past: unknown[] = []) {
  const edges = (events: unknown[]) => ({ edges: events.map((node) => ({ node })) });
  return new Response(JSON.stringify({ data: { groupByUrlname: { upcoming: edges(upcoming), past: edges(past) } } }), { status: 200 });
}

describe('getMeetupEvents', () => {
  beforeEach(() => {
    // The module keeps the events of a build in memory; each test loads it afresh.
    vi.resetModules();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function load() {
    const { getMeetupEvents } = await import('../../src/lib/meetup');
    return getMeetupEvents('https://www.meetup.com/she-wins/events/');
  }

  it('turns a Meetup event into the site event', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => meetupAnswer([rawEvent()]));
    vi.stubGlobal('fetch', fetch);
    const [event] = (await load())!;
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).variables).toEqual({ urlname: 'she-wins' });
    expect(event).toMatchObject({
      title: 'Build without burnout',
      subtitle: 'Energy and rest',
      date: '2026-11-20',
      startTime: '9:30',
      endTime: '11:00',
      online: false,
      venueName: 'The Hub',
      venue: 'The Hub, Calle Puerto 14',
      // Meetup's placeholder postal code is dropped and the country code upper-cased.
      address: { street: 'Calle Puerto 14', city: 'Málaga', postalCode: '', country: 'ES', lat: 36.7, lon: -4.4 },
      // A fee of 0 is a free event.
      fee: null,
      speaker: 'Ana López',
      language: 'es',
      description: 'Una sesión para la comunidad, con enlace y más.',
    });
  });

  it('marks events without a venue as online, keeps prices and sorts oldest first', async () => {
    const online = rawEvent({
      id: '2',
      title: 'Online circle',
      dateTime: '2026-11-25T18:00:00+01:00',
      endTime: null,
      venues: null,
      feeSettings: { amount: 15, currency: 'EUR' },
      speakerDetails: null,
      description: 'How to grow your network with the community.',
    });
    const past = rawEvent({ id: '0', dateTime: '2026-10-01T18:00:00+02:00' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => meetupAnswer([online, rawEvent()], [past])),
    );
    const events = (await load())!;
    expect(events.map((e) => e.id)).toEqual(['0', '1', '2']);
    expect(events[2]).toMatchObject({
      online: true,
      venue: 'Online',
      address: null,
      endTime: '',
      fee: { amount: 15, currency: 'EUR' },
      speaker: '',
      language: 'en',
    });
  });

  it('tries three times, then gives up with null so the build goes on', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => new Response('busy', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const result = load();
    await vi.runAllTimersAsync();
    expect(await result).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('answers null without a request for a link that is not a Meetup group', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { getMeetupEvents } = await import('../../src/lib/meetup');
    expect(await getMeetupEvents('https://example.com/')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
