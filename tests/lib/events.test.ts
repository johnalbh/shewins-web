import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeetupEvent } from '../../src/lib/meetup';

const { getMeetupEvents } = vi.hoisted(() => ({ getMeetupEvents: vi.fn() }));
vi.mock('../../src/lib/meetup', () => ({ getMeetupEvents }));

const { formatFee, getEventsByTime, posterAlt, timeRange } = await import('../../src/lib/events');

function event(date: string, overrides: Partial<MeetupEvent> = {}) {
  return {
    id: date,
    date,
    title: 'Build without burnout',
    speaker: '',
    startTime: '18:00',
    endTime: '20:00',
    fee: null,
    ...overrides,
  } as MeetupEvent;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('getEventsByTime', () => {
  it('splits the events around today in Madrid', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-09T12:00:00Z'));
    const october = event('2026-10-20');
    const earlyNovember = event('2026-11-02');
    const today = event('2026-11-09', { fee: { amount: 15, currency: 'EUR' } });
    const freeLater = event('2026-11-20');
    const december = event('2026-12-03');
    getMeetupEvents.mockResolvedValue([october, earlyNovember, today, freeLater, december]);
    const split = await getEventsByTime();
    expect(split.today).toBe('2026-11-09');
    expect(split.upcoming).toEqual([today, freeLater, december]);
    // The next free event skips the paid one today.
    expect(split.nextFree).toBe(freeLater);
    expect(split.past).toEqual([earlyNovember, october]);
    expect(split.fromMonthStart).toEqual([earlyNovember, today, freeLater, december]);
  });

  it('gives empty lists when Meetup did not answer', async () => {
    getMeetupEvents.mockResolvedValue(null);
    const split = await getEventsByTime();
    expect(split).toMatchObject({ upcoming: [], past: [], fromMonthStart: [], nextFree: undefined });
  });
});

describe('event labels', () => {
  it('joins start and end time, or gives the start alone', () => {
    expect(timeRange(event('2026-11-20'))).toBe('18:00–20:00');
    expect(timeRange(event('2026-11-20', { endTime: '' }))).toBe('18:00');
  });

  it('describes the poster with the speaker when Meetup names one', () => {
    expect(posterAlt(event('2026-11-20', { speaker: 'Ana' }), 'en')).toBe('Event poster: Build without burnout with Ana');
    expect(posterAlt(event('2026-11-20', { speaker: 'Ana' }), 'es')).toBe('Póster del evento: Build without burnout con Ana');
    expect(posterAlt(event('2026-11-20'), 'en')).toBe('Event poster: Build without burnout');
  });

  it('formats a price in the page language, and nothing for a free event', () => {
    const paid = event('2026-11-20', { fee: { amount: 15, currency: 'EUR' } });
    expect(formatFee(paid, 'en')).toBe('€15');
    expect(formatFee(paid, 'es')).toBe('15 €');
    expect(formatFee(event('2026-11-20'), 'en')).toBe('');
  });
});
