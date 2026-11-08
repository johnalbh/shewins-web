// Events of the She Wins group on Meetup, read at build time.
// Meetup's GraphQL endpoint answers public group data without a key. Meetup only documents its
// API for Pro customers, so this may stop working: every failure returns null and the page shows
// no events. The build never fails because of Meetup. The group's public iCal feed is no fallback:
// it has no place, image, price or past events.

const ENDPOINT = 'https://api.meetup.com/gql-ext';
const TIMEOUT_MS = 8000;

const QUERY = `query ($urlname: String!) {
  groupByUrlname(urlname: $urlname) {
    upcoming: events(first: 12, status: ACTIVE, sort: ASC) { edges { node { ...ev } } }
    past: events(first: 12, status: PAST, sort: DESC) { edges { node { ...ev } } }
  }
}
fragment ev on Event {
  id title description dateTime endTime eventType eventUrl
  venues { name address city postalCode country lat lon }
  featuredEventPhoto { highResUrl }
  feeSettings { amount currency }
  speakerDetails { name }
}`;

interface RawEvent {
  id: string;
  title: string;
  description: string | null;
  dateTime: string;
  endTime: string | null;
  eventType: 'PHYSICAL' | 'ONLINE' | 'HYBRID' | string;
  eventUrl: string;
  venues: { name: string; address: string; city: string; postalCode: string | null; country: string | null; lat: number; lon: number }[] | null;
  featuredEventPhoto: { highResUrl: string } | null;
  feeSettings: { amount: number; currency: string } | null;
  speakerDetails: { name: string } | null;
}

export interface MeetupEvent {
  id: string;
  url: string;
  /** Title as written on Meetup. */
  rawTitle: string;
  /** Title in the site's form ("Build without burnout"), see cleanTitle(). */
  title: string;
  /** What followed the title on Meetup, used as the one-line topic. */
  subtitle: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Full ISO times with the Madrid offset, for the Event JSON-LD. */
  startISO: string;
  endISO: string | null;
  online: boolean;
  venueName: string;
  venue: string;
  address: { street: string; city: string; postalCode: string; country: string; lat: number; lon: number } | null;
  photo: string | null;
  fee: { amount: number; currency: string } | null;
  speaker: string;
  /** Guessed from the title and description: Meetup has no language field. */
  language: 'es' | 'en';
  description: string;
}

let cache: Promise<MeetupEvent[] | null> | undefined;

/** All upcoming and recent past events of the group, oldest first, or null if Meetup did not answer. */
export function getMeetupEvents(groupUrl: string): Promise<MeetupEvent[] | null> {
  cache ??= load(groupUrl);
  return cache;
}

// With the events taken from Meetup alone, a failed request leaves the page without events until
// the next build, so a passing error (a timeout, a 5xx) gets two more tries a few seconds apart.
const ATTEMPTS = 3;
const RETRY_MS = 3000;

async function load(groupUrl: string) {
  const urlname = groupUrl.match(/meetup\.com\/([^/?#]+)/)?.[1];
  if (!urlname) return null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: QUERY, variables: { urlname } }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const json = await res.json();
      const group = json?.data?.groupByUrlname;
      if (!res.ok || !group) throw new Error(json?.errors?.[0]?.message ?? `HTTP ${res.status}`);
      const nodes: RawEvent[] = [...group.past.edges, ...group.upcoming.edges].map((e: { node: RawEvent }) => e.node);
      return nodes.map(normalise).sort((a, b) => a.startISO.localeCompare(b.startISO));
    } catch (err) {
      console.warn(`[meetup] attempt ${attempt} of ${ATTEMPTS} failed: ${(err as Error).message}`);
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
  console.warn('[meetup] events not loaded: the event sections show their empty states');
  return null;
}

function normalise(e: RawEvent): MeetupEvent {
  const { title, subtitle } = cleanTitle(e.title);
  const v = e.venues?.[0];
  const online = e.eventType === 'ONLINE' || !v;
  const street = v ? streetOf(v.address) : '';
  return {
    id: e.id,
    url: e.eventUrl,
    rawTitle: e.title.trim(),
    title,
    subtitle,
    // Meetup gives local Madrid times with their offset, so the date and clock time are the first characters.
    date: e.dateTime.slice(0, 10),
    startTime: clock(e.dateTime),
    endTime: e.endTime ? clock(e.endTime) : '',
    startISO: e.dateTime,
    endISO: e.endTime,
    online,
    venueName: online ? 'Online' : v.name.trim(),
    venue: online ? 'Online' : [v.name.trim(), street].filter(Boolean).join(', '),
    // Meetup's postal code is sometimes a placeholder ("meetup6") and its country code lower case.
    address: v && !online ? { street, city: v.city, postalCode: /^\d{4,6}$/.test(v.postalCode ?? '') ? v.postalCode! : '', country: (v.country ?? 'ES').toUpperCase(), lat: v.lat, lon: v.lon } : null,
    photo: e.featuredEventPhoto?.highResUrl ?? null,
    fee: e.feeSettings && e.feeSettings.amount > 0 ? e.feeSettings : null,
    speaker: e.speakerDetails?.name.trim() ?? '',
    language: guessLanguage(`${e.title} ${e.description ?? ''}`),
    description: plain(e.description ?? ''),
  };
}

// "18:00" → "18:00", "09:30" → "9:30", the form of the original site's times.
function clock(iso: string) {
  return iso.slice(11, 16).replace(/^0/, '');
}

// "Calle Puerto, 14, Quinta planta…" → "Calle Puerto 14". Meetup addresses put the number in their own segment.
function streetOf(address: string) {
  const [first = '', second = ''] = address.split(',').map((s) => s.trim());
  return /^\d+\w?$/.test(second) ? `${first} ${second}` : first;
}

/**
 * Meetup titles carry a shouted name and a subtitle in one line ("BUILD WITHOUT BURNOUT   Energy, …",
 * "CLARIDAD BAJO PRESIÓN: Conversaciones…", "I LOVE SELLING! How to shift…"). The site shows the name in
 * sentence case, as on the posters, and uses the rest as the topic line.
 */
export function cleanTitle(raw: string) {
  const text = raw.trim().replace(/\s+/g, ' ');
  let head = text;
  let rest = '';
  const colon = text.indexOf(': ');
  const gap = raw.trim().search(/\s{2,}/);
  if (colon > 0) {
    head = text.slice(0, colon);
    rest = text.slice(colon + 2);
  } else if (gap > 0) {
    head = raw.trim().slice(0, gap).trim();
    rest = raw.trim().slice(gap).trim().replace(/\s+/g, ' ');
  } else {
    // Leading words in capitals ("I LOVE SELLING!") followed by ordinary text.
    const words = text.split(' ');
    const n = words.findIndex((w) => /\p{Ll}/u.test(w));
    if (n >= 2) {
      head = words.slice(0, n).join(' ');
      rest = words.slice(n).join(' ');
    }
  }
  const brand = (s: string) => s.replace(/\bshe\s*wins\b/giu, 'She Wins');
  return { title: brand(shoutToSentence(head)), subtitle: brand(shoutToSentence(rest)) };
}

function shoutToSentence(s: string) {
  if (!s || /\p{Ll}/u.test(s)) return s;
  const lower = s.toLocaleLowerCase('es');
  return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
}

const ES_WORDS = /\b(el|la|los|las|de|del|que|para|con|una|por|sin|tu|tus|nuestra|nuestro|cómo|qué|es|en|y)\b/giu;
const EN_WORDS = /\b(the|and|of|to|for|with|your|you|how|what|is|in|on|our|a|an)\b/giu;

function guessLanguage(text: string): 'es' | 'en' {
  const es = text.match(ES_WORDS)?.length ?? 0;
  const en = text.match(EN_WORDS)?.length ?? 0;
  return es > en ? 'es' : 'en';
}

// Meetup descriptions are Markdown with escaped punctuation. JSON-LD wants plain text.
function plain(md: string) {
  return md
    .replace(/\\([\\`*_{}[\]()#+\-.!,])/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
