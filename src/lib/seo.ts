// Structured data (JSON-LD) for every page, built in one place so each page tells search engines
// the same thing about She Wins. Base.astro assembles the graph: the organisation, the website,
// the page itself, its breadcrumb and whatever the view adds (an article, the events on the page).
// Before November 2026 each page in src/data/seo.json carried its own hand-written copy of the
// organisation, so the inner pages described it with less detail than the home.
import { SITE, type Lang } from '../i18n';
import type { Settings } from './content';
import type { Event } from './events';

const ORG_ID = `${SITE}/#org`;
const SITE_ID = `${SITE}/#site`;
export const LOGO_URL = `${SITE}/assets/logo-red.png`;
const LOGO = { '@type': 'ImageObject', url: LOGO_URL, width: 142, height: 160 };
/** The social card image (1200×630) of every page. */
export const OG_IMAGE = `${SITE}/assets/og-image.jpg`;

/** A page's own name: its title without the "| She Wins" suffix. */
export const pageName = (title: string) => title.split(' | ')[0];

export interface Crumb {
  name: string;
  url: string;
}

/** Asociación She Wins. The contact and social links come from Keystatic (Contact and links). */
export function organization(settings: Pick<Settings, 'email' | 'instagram' | 'linkedin' | 'meetup' | 'luma'>, description: string) {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'She Wins',
    legalName: 'Asociación She Wins',
    // People also write the name as one word, and search for it with the city.
    alternateName: ['SheWins', 'She Wins Málaga'],
    url: `${SITE}/`,
    logo: LOGO,
    image: OG_IMAGE,
    description,
    email: settings.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'C/ Ancha del Carmen 32',
      postalCode: '29002',
      addressLocality: 'Málaga',
      addressRegion: 'Andalucía',
      addressCountry: 'ES',
    },
    areaServed: { '@type': 'City', name: 'Málaga' },
    knowsLanguage: ['en', 'es'],
    // The Meetup link in the settings points at the group's events list; the profile is the group.
    sameAs: [settings.instagram, settings.linkedin, settings.meetup.replace(/events\/?$/, ''), settings.luma],
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    name: 'She Wins',
    url: `${SITE}/`,
    inLanguage: ['en', 'es'],
    publisher: { '@id': ORG_ID },
  };
}

export function webPage(opts: { url: string; title: string; description: string; lang: Lang; type?: string; breadcrumbId?: string }) {
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': opts.url,
    url: opts.url,
    name: opts.title,
    description: opts.description,
    inLanguage: opts.lang,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    ...(opts.breadcrumbId && { breadcrumb: { '@id': opts.breadcrumbId } }),
  };
}

export function breadcrumb(id: string, crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': id,
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
  };
}

/** A blog article. The publisher repeats name and logo inline so the article validates on its own. */
export function blogPosting(opts: {
  url: string;
  title: string;
  description: string;
  lang: Lang;
  datePublished?: string | null;
  author: { name: string; jobTitle?: string | null };
}) {
  return {
    '@type': 'BlogPosting',
    '@id': `${opts.url}#article`,
    headline: opts.title,
    description: opts.description,
    inLanguage: opts.lang,
    url: opts.url,
    mainEntityOfPage: { '@id': opts.url },
    image: OG_IMAGE,
    ...(opts.datePublished && { datePublished: opts.datePublished }),
    author: {
      '@type': 'Person',
      name: opts.author.name,
      ...(opts.author.jobTitle && { jobTitle: opts.author.jobTitle }),
      worksFor: { '@id': ORG_ID },
    },
    publisher: {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'She Wins',
      logo: LOGO,
    },
    isAccessibleForFree: true,
  };
}

/**
 * One She Wins event as shown on the page, for Google's event results. Only events that the page
 * actually shows are marked up (Google's rule), so the views pass the same events their sections
 * render. Meetup gives the times with the Madrid offset, the venue and the price; the organiser
 * is the association, and the speaker, when Meetup names one, is the performer.
 */
export function eventNode(ev: Event) {
  const a = ev.address;
  return {
    '@type': 'Event',
    '@id': ev.url,
    name: ev.subtitle ? `${ev.title}${/[.!?]$/.test(ev.title) ? '' : ':'} ${ev.subtitle}` : ev.title,
    description: shorten(ev.description || ev.subtitle || ev.title),
    url: ev.url,
    startDate: ev.startISO,
    ...(ev.endISO && { endDate: ev.endISO }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: ev.online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location:
      ev.online || !a
        ? { '@type': 'VirtualLocation', url: ev.url }
        : {
            '@type': 'Place',
            name: ev.venueName,
            address: {
              '@type': 'PostalAddress',
              ...(a.street && { streetAddress: a.street }),
              addressLocality: a.city,
              ...(a.postalCode && { postalCode: a.postalCode }),
              addressCountry: a.country,
            },
            ...(a.lat && a.lon && { geo: { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lon } }),
          },
    ...(ev.photo && { image: [ev.photo] }),
    inLanguage: ev.language,
    isAccessibleForFree: !ev.fee,
    offers: {
      '@type': 'Offer',
      url: ev.url,
      price: ev.fee?.amount ?? 0,
      priceCurrency: ev.fee?.currency ?? 'EUR',
      availability: 'https://schema.org/InStock',
    },
    organizer: { '@type': 'Organization', '@id': ORG_ID, name: 'She Wins', url: `${SITE}/` },
    ...(ev.speaker && { performer: { '@type': 'Person', name: ev.speaker } }),
  };
}

// Meetup descriptions can run long; the markup keeps the start, cut at a word.
function shorten(text: string, max = 600) {
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/**
 * The JSON-LD of a page: the organisation and the website on every page, then this page, its
 * breadcrumb and what the view adds. A page that is not indexed (the 404) describes only the
 * organisation and the website: a page node would point search engines at a missing URL.
 */
export function pageGraph(opts: {
  settings: Parameters<typeof organization>[0];
  /** The organisation is described with the home's description on every page. */
  orgDescription: string;
  indexed: boolean;
  page: Omit<Parameters<typeof webPage>[0], 'breadcrumbId'>;
  /** She Wins > … > this page; empty on the home. */
  crumbs: Crumb[];
  extra?: unknown[];
}) {
  const shared = [organization(opts.settings, opts.orgDescription), website()];
  if (!opts.indexed) return { '@context': 'https://schema.org', '@graph': shared };
  const breadcrumbId = opts.crumbs.length ? `${opts.page.url}#breadcrumb` : undefined;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...shared,
      webPage({ ...opts.page, breadcrumbId }),
      ...(breadcrumbId ? [breadcrumb(breadcrumbId, opts.crumbs)] : []),
      ...(opts.extra ?? []),
    ],
  };
}
