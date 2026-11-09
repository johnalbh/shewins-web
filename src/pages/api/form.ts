import type { APIRoute } from 'astro';
import { checkBotId } from 'botid/server';
import { deliver } from '../../lib/forms/deliver';
import { missingSettings } from '../../lib/forms/settings';
import { acceptsMail, hasHoneypot, spamSign } from '../../lib/forms/spam';
import { parseSubmission } from '../../lib/forms/submission';

// Receives the three site forms (letter, waitlist, contact), posted as JSON by
// src/scripts/forms.js. What each one does is in src/lib/forms/deliver.ts.
//
// The endpoint is public, so it trusts nothing the browser sends:
//   - it accepts only JSON from a page of this same site, up to MAX_BODY;
//   - each form keeps only its own fields, cut to a maximum length (lib/forms/submission.ts);
//   - the consent time is the server's clock, not the browser's;
//   - an email that is already in MailerLite is only added to the group. Its name and fields are
//     never overwritten, so nobody can change a subscriber's data by typing her email.
//
// Against spam, in the order the checks run:
//   - a honeypot field (any id ending in -website) catches bots that fill in the page's form;
//   - Vercel BotID catches scripts that post straight to this endpoint: src/scripts/botid.js
//     makes the browser solve an invisible challenge, and checkBotId() verifies it;
//   - the email's domain must accept mail (MX record, lib/forms/spam.ts);
//   - contact messages that look like link spam still reach the team, marked in the subject.
// The number of requests per IP is limited by a Vercel Firewall rule on /api/form (see README).
export const prerender = false;

// The longest form is contact, with a message of up to 5,000 characters.
const MAX_BODY = 16_000;

const fail = (status: number, extra: Record<string, unknown> = {}) => Response.json({ ok: false, ...extra }, { status });

/**
 * Only the site's own pages may post. Browsers always send Origin on a POST, and a JSON body from
 * another site needs a CORS preflight, which this endpoint never grants. The host is compared
 * rather than the full origin, so the check does not depend on the proxy's scheme.
 */
function isSameOrigin(request: Request, url: URL) {
  try {
    return new URL(request.headers.get('origin') ?? '').host === url.host;
  } catch {
    return false;
  }
}

const isJson = (request: Request) => request.headers.get('content-type')?.toLowerCase().startsWith('application/json') ?? false;

/** The body as a JSON object, or the status that turns it away. */
async function readJsonObject(request: Request): Promise<{ fields: Record<string, unknown> } | { status: number }> {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return { status: 413 };
  try {
    const fields = JSON.parse(raw);
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) return { fields };
  } catch {
    // Not JSON: turned away below.
  }
  return { status: 400 };
}

/**
 * BotID: a request without the solved browser challenge comes from a script, not from the site's
 * pages. It gets a plain 403, which also shows the error line to a person in the rare case of a
 * false positive. In `npm run dev` checkBotId() always answers human (set here from Astro rather
 * than from NODE_ENV, which the check reads by default).
 * If the check itself fails (Vercel API, OIDC token), the request goes on: the other checks and
 * the rate limit still apply, and a fault on our side never loses a signup.
 */
async function isBot(form: unknown) {
  try {
    const verdict = await checkBotId({ developmentOptions: { isDevelopment: import.meta.env.DEV } });
    if (verdict.isBot) console.warn(`[form] BotID: bot rejected (${form})`);
    return verdict.isBot;
  } catch (err) {
    console.error('[form] BotID check failed, request accepted', err);
    return false;
  }
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!isSameOrigin(request, url)) return fail(403);
  if (!isJson(request)) return fail(415);
  const body = await readJsonObject(request);
  if ('status' in body) return fail(body.status);
  // A filled honeypot: pretend it worked.
  if (hasHoneypot(body.fields)) return Response.json({ ok: true });
  if (await isBot(body.fields.form)) return fail(403);

  const submission = parseSubmission(body.fields);
  if ('invalid' in submission) return fail(400, { invalid: submission.invalid });
  if (!(await acceptsMail(submission.email))) return fail(400, { invalid: 'email' });

  // Without API keys, dev only logs the submission (see .env.example).
  const missing = missingSettings(submission.form);
  if (missing.length) {
    if (import.meta.env.DEV) {
      console.log('[form] (dev, not sent)', submission, spamSign(submission) ?? '');
      return Response.json({ ok: true, dev: true });
    }
    console.error(`[form] ${submission.form}: missing ${missing.join(', ')}`);
    return fail(503);
  }

  try {
    await deliver(submission);
    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[form] ${submission.form}`, err);
    return fail(502);
  }
};
