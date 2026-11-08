import type { APIRoute } from 'astro';

// Receives the three site forms, posted as JSON by src/scripts/site.js:
//   letter   → MailerLite group "Newsletter" (double opt-in: MailerLite sends the confirmation)
//   waitlist → MailerLite group "Waitlist" + a notification to the team (MailerSend), and also
//              the group "Newsletter" when the Letter box (w-letter) is left ticked
//   contact  → a notification to the team (MailerSend), reply-to the sender
// Double opt-in is the MailerLite account setting "Double opt-in for API and integrations".
//
// The endpoint is public, so it trusts nothing the browser sends:
//   - it accepts only JSON from a page of this same site, up to MAX_BODY;
//   - each form keeps only its own fields, cut to a maximum length;
//   - the consent time is the server's clock, not the browser's;
//   - an email that is already in MailerLite is only added to the group. Its name and fields are
//     never overwritten, so nobody can change a subscriber's data by typing her email.
// The number of requests per IP is limited by a Vercel Firewall rule on /api/form (see README).
export const prerender = false;

const env = (key: string): string | undefined => import.meta.env[key] || process.env[key];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The longest form is contact, with a message of up to 5,000 characters.
const MAX_BODY = 16_000;
// A slow MailerLite or MailerSend must not hold the function open.
const TIMEOUT_MS = 8_000;

const MAILERLITE = env('MAILERLITE_API_URL') || 'https://connect.mailerlite.com/api';
const MAILERSEND = env('MAILERSEND_API_URL') || 'https://api.mailersend.com/v1';

// Tests never touch the real lists. In local dev and on Vercel preview deployments, a set
// MAILERLITE_GROUP_TEST takes the place of every group. Production always uses the real groups,
// even when the variable is set there, and a missing VERCEL_ENV counts as production.
const TESTING = import.meta.env.DEV || env('VERCEL_ENV') === 'preview';
const setting = (key: string) => (TESTING && key.startsWith('MAILERLITE_GROUP_') && env('MAILERLITE_GROUP_TEST')) || env(key);

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// "Where are you right now?" on the waitlist form. The browser sends the label in the page's
// language; MailerLite always stores the English one, so one segment covers both languages.
const STAGES = new Map(
  [
    ['Starting something', 'Empezando algo'],
    ['Changing career', 'Cambiando de carrera'],
    ['Growing a business', 'Haciendo crecer un negocio'],
    ['Looking for opportunities', 'Buscando oportunidades'],
    ['Looking for community', 'Buscando comunidad'],
    ['Exploring what is next', 'Explorando qué viene'],
  ].flatMap(([en, es]) => [
    [en, en],
    [es, en],
  ]),
);

type Lang = 'en' | 'es';
// lang is the language of the page the form was sent from; language is the one the person chose
// for the emails, and the one stored in MailerLite.
type Base = { lang: Lang; page: string; email: string };
type Submission =
  | (Base & { form: 'letter'; name: string; language: Lang })
  | (Base & { form: 'waitlist'; name: string; language: Lang; stage: string; letter: boolean })
  | (Base & { form: 'contact'; name: string; type: string; organisation: string; message: string });

const language = (v: unknown): Lang | null => (v === 'en' || v === 'es' ? v : null);

/** Keeps only the fields of the form that was sent, or names the first invalid one. */
function parse(d: Record<string, unknown>): Submission | { invalid: string } {
  const base = { lang: language(d.lang) ?? 'en', page: str(d.page, 300) };
  switch (d.form) {
    case 'letter': {
      const name = str(d['em-name'], 80);
      const email = str(d['em-letter'], 254);
      const lang = language(d['em-lang']);
      if (!EMAIL.test(email)) return { invalid: 'email' };
      if (!name) return { invalid: 'name' };
      if (!lang) return { invalid: 'language' };
      return { form: 'letter', ...base, email, name, language: lang };
    }
    case 'waitlist': {
      const name = str(d['w-name'], 80);
      const email = str(d['w-mail'], 254);
      const lang = language(d['w-lang']);
      if (!name) return { invalid: 'name' };
      if (!EMAIL.test(email)) return { invalid: 'email' };
      if (!lang) return { invalid: 'language' };
      if (d['w-ok'] !== true) return { invalid: 'consent' };
      // The Letter box is ticked by default (team decision, November 2026) and can be unticked:
      // only an explicit true counts. "yes" comes from pages cached with the earlier yes / no question.
      const letter = d['w-letter'] === true || d['w-letter'] === 'yes';
      return { form: 'waitlist', ...base, email, name, language: lang, stage: STAGES.get(str(d['w-where'], 80)) ?? '', letter };
    }
    case 'contact': {
      const name = str(d['c-name'], 120);
      const email = str(d['c-mail'], 254);
      const message = str(d['c-msg'], 5000);
      if (!name) return { invalid: 'name' };
      if (!EMAIL.test(email)) return { invalid: 'email' };
      if (!message) return { invalid: 'message' };
      return { form: 'contact', ...base, email, name, message, type: str(d['c-type'], 80), organisation: str(d['c-org'], 160) };
    }
    default:
      return { invalid: 'form' };
  }
}

async function call(method: 'GET' | 'POST', url: string, token: string, body?: unknown) {
  return fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

// "2026-10-24T10:00:00.000Z" → "2026-10-24 10:00:00", the format MailerLite expects.
const mlDate = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

/**
 * Adds an email to one or more MailerLite groups in a single request, so a waitlist signup that
 * also asks for the Letter gets one confirmation email, not two.
 * - A new email is created with its fields and consent time. MailerLite then sends the
 *   double opt-in email.
 * - An existing email is only added to the groups. Its name, fields and status stay as they are,
 *   and an email that unsubscribed stays unsubscribed.
 */
async function subscribe(email: string, groups: string[], fields: Record<string, string>, optedInAt?: Date) {
  const key = env('MAILERLITE_API_KEY')!;
  const found = await call('GET', `${MAILERLITE}/subscribers/${encodeURIComponent(email)}`, key);
  if (found.ok) {
    const res = await call('POST', `${MAILERLITE}/subscribers`, key, { email, groups });
    if (!res.ok) throw new Error(`MailerLite add to group ${res.status}: ${await res.text()}`);
    return;
  }
  if (found.status !== 404) throw new Error(`MailerLite lookup ${found.status}: ${await found.text()}`);

  const body = (f: Record<string, string>) => ({ email, groups, fields: f, ...(optedInAt ? { opted_in_at: mlDate(optedInAt) } : {}) });
  let res = await call('POST', `${MAILERLITE}/subscribers`, key, body(fields));
  // 422 can mean a custom field (language, stage) is not created in MailerLite yet. Keep the
  // signup anyway with the default name field, and log it so the field gets added.
  if (res.status === 422) {
    console.warn('[form] MailerLite rejected custom fields, retrying with name only:', await res.text());
    res = await call('POST', `${MAILERLITE}/subscribers`, key, body(fields.name ? { name: fields.name } : {}));
  }
  if (!res.ok) throw new Error(`MailerLite create ${res.status}: ${await res.text()}`);
}

/** Emails the form contents to the team through MailerSend. */
async function notify(s: Submission) {
  // Every value as text: the waitlist's letter flag is a boolean.
  const rows = Object.entries(s).map(([k, v]) => [k, String(v)]);
  const res = await call('POST', `${MAILERSEND}/email`, env('MAILERSEND_API_KEY')!, {
    from: { email: env('FORM_FROM') || 'web@shewins.es', name: 'SheWins web' },
    to: [{ email: env('FORM_TO') || 'agnieszka@shewins.es' }],
    reply_to: { email: s.email },
    subject: `${TESTING ? '[TEST] ' : ''}New ${s.form} form`,
    html: `<table>${rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</table>`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
  });
  if (!res.ok) throw new Error(`MailerSend ${res.status}: ${await res.text()}`);
}

const NEEDS = {
  letter: ['MAILERLITE_API_KEY', 'MAILERLITE_GROUP_NEWSLETTER'],
  waitlist: ['MAILERLITE_API_KEY', 'MAILERLITE_GROUP_WAITLIST'],
  contact: ['MAILERSEND_API_KEY'],
};

const fail = (status: number, extra: Record<string, unknown> = {}) => Response.json({ ok: false, ...extra }, { status });

export const POST: APIRoute = async ({ request, url }) => {
  // Only the site's own pages may post. Browsers always send Origin on a POST, and a JSON body
  // from another site needs a CORS preflight, which this endpoint never grants. The host is
  // compared rather than the full origin, so the check does not depend on the proxy's scheme.
  const origin = request.headers.get('origin');
  let originHost = '';
  try {
    originHost = origin ? new URL(origin).host : '';
  } catch {}
  if (originHost !== url.host) return fail(403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return fail(415);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail(413);
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('not an object');
  } catch {
    return fail(400);
  }

  // Honeypot: a hidden field people never see. Bots fill it; pretend it worked.
  if (Object.entries(d).some(([k, v]) => k.endsWith('-website') && v)) return Response.json({ ok: true });

  const s = parse(d);
  if ('invalid' in s) return fail(400, { invalid: s.invalid });

  if (NEEDS[s.form].some((k) => !setting(k))) {
    if (import.meta.env.DEV) {
      console.log('[form] (dev, not sent)', s);
      return Response.json({ ok: true, dev: true });
    }
    console.error(`[form] ${s.form}: missing ${NEEDS[s.form].filter((k) => !setting(k)).join(', ')}`);
    return fail(503);
  }

  try {
    if (s.form === 'letter') {
      await subscribe(s.email, [setting('MAILERLITE_GROUP_NEWSLETTER')!], { name: s.name, language: s.language });
    } else if (s.form === 'waitlist') {
      const groups = [setting('MAILERLITE_GROUP_WAITLIST')!];
      if (s.letter) {
        const newsletter = setting('MAILERLITE_GROUP_NEWSLETTER');
        // A missing newsletter group must not lose the waitlist signup; log it so it gets set.
        // In tests both are the Test group, which is sent once.
        if (newsletter) {
          if (!groups.includes(newsletter)) groups.push(newsletter);
        } else console.error('[form] waitlist: Letter box ticked but MAILERLITE_GROUP_NEWSLETTER is missing');
      }
      // opted_in_at records when the consent box was ticked, as proof of consent (GDPR).
      await subscribe(s.email, groups, { name: s.name, language: s.language, stage: s.stage }, new Date());
      // The signup is stored; the team notification is best effort and must not fail it.
      if (env('MAILERSEND_API_KEY')) await notify(s).catch((err) => console.error('[form] notification', err));
    } else {
      await notify(s);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[form] ${s.form}`, err);
    return fail(502);
  }
};
