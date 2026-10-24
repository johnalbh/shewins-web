import type { APIRoute } from 'astro';

// Receives the three site forms (same JSON as html/README.md §5):
//   letter   → MailerLite group "Newsletter" (double opt-in: MailerLite sends the confirmation)
//   waitlist → MailerLite group "Waitlist" + a notification to the team (MailerSend)
//   contact  → a notification to the team (MailerSend), reply-to the sender
// Double opt-in is the MailerLite account setting "Double opt-in for API and integrations".
export const prerender = false;

const env = (key: string) => import.meta.env[key] ?? process.env[key];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const MAILERLITE = env('MAILERLITE_API_URL') || 'https://connect.mailerlite.com/api';
const MAILERSEND = env('MAILERSEND_API_URL') || 'https://api.mailersend.com/v1';

type Payload = Record<string, unknown>;

function validate(d: Payload): string | null {
  switch (d.form) {
    case 'waitlist':
      if (!str(d['w-name'])) return 'name';
      if (!EMAIL.test(str(d['w-mail']))) return 'email';
      if (d['w-ok'] !== true) return 'consent';
      return null;
    case 'contact':
      if (!str(d['c-name'])) return 'name';
      if (!EMAIL.test(str(d['c-mail']))) return 'email';
      if (!str(d['c-msg'], 5000)) return 'message';
      return null;
    case 'letter':
      return EMAIL.test(str(d['em-letter'])) ? null : 'email';
    default:
      return 'form';
  }
}

async function post(url: string, token: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
}

// "2026-10-24T10:00:00.000Z" → "2026-10-24 10:00:00", the format MailerLite expects.
const mlDate = (iso: string) => (iso ? new Date(iso).toISOString().slice(0, 19).replace('T', ' ') : undefined);

/** Adds or updates a subscriber in a MailerLite group (an upsert: an existing email is fine). */
async function subscribe(email: string, group: string, fields: Record<string, string>, optedInAt?: string) {
  const body = (f: Record<string, string>) => ({ email, groups: [group], fields: f, ...(optedInAt ? { opted_in_at: optedInAt } : {}) });
  let res = await post(`${MAILERLITE}/subscribers`, env('MAILERLITE_API_KEY'), body(fields));
  // 422 can mean a custom field (language, stage) is not created in MailerLite yet. Keep the
  // signup anyway with the default name field, and log it so the field gets added.
  if (res.status === 422) {
    console.warn('[form] MailerLite rejected custom fields, retrying with name only:', await res.text());
    res = await post(`${MAILERLITE}/subscribers`, env('MAILERLITE_API_KEY'), body(fields.name ? { name: fields.name } : {}));
  }
  if (!res.ok) throw new Error(`MailerLite ${res.status}: ${await res.text()}`);
}

/** Emails the form contents to the team through MailerSend. */
async function notify(d: Payload, replyTo: string) {
  const rows = Object.entries(d)
    .filter(([k]) => !k.endsWith('-website'))
    .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(String(v))}</td></tr>`)
    .join('');
  const text = Object.entries(d)
    .filter(([k]) => !k.endsWith('-website'))
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join('\n');
  const res = await post(`${MAILERSEND}/email`, env('MAILERSEND_API_KEY'), {
    from: { email: env('FORM_FROM') || 'web@shewins.es', name: 'SheWins web' },
    to: [{ email: env('FORM_TO') || 'agnieszka@shewins.es' }],
    reply_to: { email: replyTo },
    subject: `New ${d.form} form`,
    html: `<table>${rows}</table>`,
    text,
  });
  if (res.status !== 202 && !res.ok) throw new Error(`MailerSend ${res.status}: ${await res.text()}`);
}

export const POST: APIRoute = async ({ request }) => {
  let d: Payload;
  try {
    d = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  // Honeypot: a hidden field people never see. Bots fill it; pretend it worked.
  if (Object.entries(d).some(([k, v]) => k.endsWith('-website') && v)) return Response.json({ ok: true });

  const invalid = validate(d);
  if (invalid) return Response.json({ ok: false, invalid }, { status: 400 });

  const needs = { letter: ['MAILERLITE_API_KEY'], waitlist: ['MAILERLITE_API_KEY'], contact: ['MAILERSEND_API_KEY'] }[d.form as string]!;
  if (needs.some((k) => !env(k))) {
    if (import.meta.env.DEV) {
      console.log('[form] (dev, not sent)', d);
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ ok: false }, { status: 503 });
  }

  const language = d.lang === 'es' ? 'es' : 'en';
  try {
    if (d.form === 'letter') {
      await subscribe(str(d['em-letter']), env('MAILERLITE_GROUP_NEWSLETTER'), { language });
    } else if (d.form === 'waitlist') {
      const email = str(d['w-mail']);
      // opted_in_at keeps the time of the consent box as proof of consent (GDPR).
      await subscribe(email, env('MAILERLITE_GROUP_WAITLIST'), { name: str(d['w-name']), language, stage: str(d['w-where']) }, mlDate(str(d.sent)));
      // The signup is stored; the team notification is best effort and must not fail it.
      if (env('MAILERSEND_API_KEY')) await notify(d, email).catch((err) => console.error('[form] notification', err));
    } else {
      await notify(d, str(d['c-mail']));
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[form]', err);
    return Response.json({ ok: false }, { status: 502 });
  }
};
