import { SITE } from '../i18n';
import type { Event } from './content';

// schema.org Event entries, so Google can list the events in search ("events in Málaga").
// Only events with Meetup data get one: Meetup gives the exact start and end with the Madrid
// offset, the full address and the price that Google asks for.
export function eventJsonLd(ev: Event) {
  const m = ev.meetup;
  if (!m) return null;
  const lang = { es: 'es', en: 'en', both: ['en', 'es'] }[ev.language];
  return {
    '@type': 'Event',
    name: ev.title,
    description: (ev.topicEn || m.description).slice(0, 300),
    startDate: m.startISO,
    ...(m.endISO && { endDate: m.endISO }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: m.online ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: m.address
      ? {
          '@type': 'Place',
          name: m.venueName,
          address: {
            '@type': 'PostalAddress',
            streetAddress: m.address.street,
            addressLocality: m.address.city,
            ...(m.address.postalCode && { postalCode: m.address.postalCode }),
            addressCountry: m.address.country.toUpperCase(),
          },
          geo: { '@type': 'GeoCoordinates', latitude: m.address.lat, longitude: m.address.lon },
        }
      : { '@type': 'VirtualLocation', url: m.url },
    ...(m.photo && { image: [m.photo] }),
    organizer: { '@id': `${SITE}/#org` },
    ...(ev.host && { performer: { '@type': 'Person', name: ev.host } }),
    isAccessibleForFree: !m.fee,
    offers: {
      '@type': 'Offer',
      url: m.url,
      price: m.fee?.amount ?? 0,
      priceCurrency: m.fee?.currency ?? 'EUR',
      availability: 'https://schema.org/InStock',
    },
    inLanguage: lang,
    url: m.url,
  };
}
