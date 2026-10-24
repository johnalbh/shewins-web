import type { APIRoute } from 'astro';

// Receives the three site forms (same JSON as html/README.md §5) and hands them to Brevo:
//   waitlist → contact in the "Waitlist" list + notification email
//   contact  → notification email
//   letter   → newsletter double opt-in (Brevo sends the confirmation email)
export const prerender = false;

const env = (key: string) => import.meta.env[key] ?? process.env[key];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

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

async function brevo(path: string, body: unknown) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method: 'POST',
    headers: { 'api-key': env('BREVO_API_KEY'), 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  // 204 = contact updated, 400 "duplicate_parameter" = already subscribed: both fine for the visitor.
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    if (!text.includes('duplicate_parameter')) throw new Error(`Brevo ${path} ${res.status}: ${text}`);
  }
}

function notify(d: Payload, replyTo: string) {
  const rows = Object.entries(d)
    .filter(([k]) => !k.endsWith('-website'))
    .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(String(v))}</td></tr>`)
    .join('');
  return brevo('/smtp/email', {
    sender: { name: 'SheWins web', email: env('FORM_FROM') || 'web@shewins.es' },
    to: [{ email: env('FORM_TO') || 'agnieszka@shewins.es' }],
    replyTo: { email: replyTo },
    subject: `New ${d.form} form`,
    htmlContent: `<table>${rows}</table>`,
  });
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

  if (!env('BREVO_API_KEY')) {
    if (import.meta.env.DEV) {
      console.log('[form] (dev, not sent)', d);
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ ok: false }, { status: 503 });
  }

  try {
    if (d.form === 'waitlist') {
      const email = str(d['w-mail']);
      await brevo('/contacts', {
        email,
        listIds: [Number(env('BREVO_LIST_WAITLIST'))],
        updateEnabled: true,
        // Consent and time are kept as proof of consent (GDPR).
        attributes: { FIRSTNAME: str(d['w-name']), WHERE: str(d['w-where']), CONSENT: true, CONSENT_AT: str(d.sent), LANG: str(d.lang) },
      });
      await notify(d, email);
    } else if (d.form === 'contact') {
      await notify(d, str(d['c-mail']));
    } else {
      const lang = d.lang === 'es' ? 'es' : 'en';
      await brevo('/contacts/doubleOptinConfirmation', {
        email: str(d['em-letter']),
        includeListIds: [Number(env('BREVO_LIST_NEWSLETTER'))],
        templateId: Number(env('BREVO_DOI_TEMPLATE')),
        redirectionUrl: `https://www.shewins.es${lang === 'es' ? '/es' : '/'}`,
        attributes: { LANG: lang },
      });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[form]', err);
    return Response.json({ ok: false }, { status: 502 });
  }
};
