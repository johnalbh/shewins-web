import { describe, expect, it } from 'vitest';
import { alternatesFor, localePath, localize } from '../src/i18n';

describe('localePath', () => {
  it('keeps English paths at the root', () => {
    expect(localePath('/about', 'en')).toBe('/about');
    expect(localePath('/', 'en')).toBe('/');
  });

  it('puts Spanish paths under /es, without a trailing slash for the home', () => {
    expect(localePath('/about', 'es')).toBe('/es/about');
    expect(localePath('/', 'es')).toBe('/es');
  });
});

describe('alternatesFor', () => {
  it('gives the same page in both languages', () => {
    expect(alternatesFor('/blog/some-post')).toEqual({ en: '/blog/some-post', es: '/es/blog/some-post' });
  });
});

describe('localize', () => {
  it('picks the text and the path of the page language', () => {
    const en = localize('en');
    const es = localize('es');
    expect(en.L('Events', 'Eventos')).toBe('Events');
    expect(es.L('Events', 'Eventos')).toBe('Eventos');
    expect(en.u('/events')).toBe('/events');
    expect(es.u('/events')).toBe('/es/events');
  });
});
