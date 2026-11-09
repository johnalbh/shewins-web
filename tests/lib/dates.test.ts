import { afterEach, describe, expect, it, vi } from 'vitest';
import { dateParts, todayInMadrid } from '../../src/lib/dates';

describe('dateParts', () => {
  it('gives the short labels of the site in English', () => {
    expect(dateParts('2026-10-29', 'en')).toEqual({ day: 29, month: 9, weekday: 'Thu', monthShort: 'Oct', monthName: 'October' });
  });

  it('gives the short labels of the site in Spanish', () => {
    expect(dateParts('2026-01-03', 'es')).toEqual({ day: 3, month: 0, weekday: 'Sáb', monthShort: 'Ene', monthName: 'Enero' });
  });
});

describe('todayInMadrid', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is the date in Spain, not in the timezone of the build', () => {
    // 23:30 UTC on 9 November is already 10 November in Madrid (UTC+1).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-09T23:30:00Z'));
    expect(todayInMadrid()).toBe('2026-11-10');
  });
});
