import { describe, expect, it } from 'vitest';
import type { Event } from '../../src/lib/content';
import { blogPosting, breadcrumb, eventNode, organization, webPage, website } from '../../src/lib/seo';

const settings = {
  email: 'hola@shewins.es',
  instagram: 'https://www.instagram.com/shewins.es/',
  linkedin: 'https://www.linkedin.com/company/shewins/',
  meetup: 'https://www.meetup.com/she-wins/events/',
  luma: 'https://lu.ma/shewins',
};

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: '1',
    url: 'https://www.meetup.com/she-wins/events/1/',
    rawTitle: 'BUILD WITHOUT BURNOUT   Energy and rest',
    title: 'Build without burnout',
    subtitle: 'Energy and rest',
    date: '2026-11-20',
    startTime: '9:30',
    endTime: '11:00',
    startISO: '2026-11-20T09:30:00+01:00',
    endISO: '2026-11-20T11:00:00+01:00',
    online: false,
    venueName: 'The Hub',
    venue: 'The Hub, Calle Puerto 14',
    address: { street: 'Calle Puerto 14', city: 'Málaga', postalCode: '29001', country: 'ES', lat: 36.7, lon: -4.4 },
    photo: 'https://secure.meetupstatic.com/photos/1.jpeg',
    fee: null,
    speaker: 'Ana López',
    language: 'es',
    description: 'A session for the community.',
    ...overrides,
  };
}

describe('organization', () => {
  it('describes the association with the links from the settings', () => {
    const org = organization(settings, 'A business community for women');
    expect(org).toMatchObject({
      '@type': 'Organization',
      '@id': 'https://www.shewins.es/#org',
      email: 'hola@shewins.es',
      description: 'A business community for women',
    });
    // The Meetup profile is the group, not its events list.
    expect(org.sameAs).toEqual([settings.instagram, settings.linkedin, 'https://www.meetup.com/she-wins/', settings.luma]);
  });
});

describe('website, webPage and breadcrumb', () => {
  it('link the page to the site and the organisation', () => {
    expect(website()).toMatchObject({ '@id': 'https://www.shewins.es/#site', publisher: { '@id': 'https://www.shewins.es/#org' } });
    const page = webPage({ url: 'https://www.shewins.es/about', title: 'About', description: 'd', lang: 'en', breadcrumbId: 'b' });
    expect(page).toMatchObject({ '@type': 'WebPage', isPartOf: { '@id': 'https://www.shewins.es/#site' }, breadcrumb: { '@id': 'b' } });
    expect(webPage({ url: 'u', title: 't', description: 'd', lang: 'es', type: 'AboutPage' })).not.toHaveProperty('breadcrumb');
  });

  it('numbers the crumbs from one', () => {
    const list = breadcrumb('id', [
      { name: 'She Wins', url: 'https://www.shewins.es/' },
      { name: 'Blog', url: 'https://www.shewins.es/blog' },
    ]);
    expect(list.itemListElement.map((c) => c.position)).toEqual([1, 2]);
  });
});

describe('blogPosting', () => {
  it('leaves out the date and job title when there are none', () => {
    const post = blogPosting({
      url: 'https://www.shewins.es/blog/a',
      title: 'A',
      description: 'd',
      lang: 'en',
      datePublished: null,
      author: { name: 'Ana' },
    });
    expect(post).not.toHaveProperty('datePublished');
    expect(post.author).not.toHaveProperty('jobTitle');
    expect(post.publisher.logo.url).toBe('https://www.shewins.es/assets/logo-red.png');
  });
});

describe('eventNode', () => {
  it('marks up an in-person free event with its place and speaker', () => {
    const node = eventNode(event());
    expect(node).toMatchObject({
      name: 'Build without burnout: Energy and rest',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: {
        '@type': 'Place',
        name: 'The Hub',
        address: { streetAddress: 'Calle Puerto 14', postalCode: '29001', addressCountry: 'ES' },
      },
      isAccessibleForFree: true,
      offers: { price: 0, priceCurrency: 'EUR' },
      performer: { name: 'Ana López' },
      image: ['https://secure.meetupstatic.com/photos/1.jpeg'],
    });
  });

  it('marks up an online paid event without a speaker', () => {
    const node = eventNode(
      event({ online: true, address: null, fee: { amount: 15, currency: 'EUR' }, speaker: '', title: 'Ready?', photo: null }),
    );
    expect(node.name).toBe('Ready? Energy and rest');
    expect(node.location).toEqual({ '@type': 'VirtualLocation', url: 'https://www.meetup.com/she-wins/events/1/' });
    expect(node).toMatchObject({ isAccessibleForFree: false, offers: { price: 15 } });
    expect(node).not.toHaveProperty('performer');
    expect(node).not.toHaveProperty('image');
  });

  it('cuts a long description at a word', () => {
    const description = eventNode(event({ description: 'word '.repeat(200) })).description;
    expect(description.length).toBeLessThanOrEqual(601);
    expect(description.endsWith('word…')).toBe(true);
  });
});
