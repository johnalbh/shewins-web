// MailerSend: the email that tells the team about a waitlist signup or a contact message.
import { escapeHtml } from '../html';
import { apiCall } from './request';
import { MAILERSEND_API, TESTING, env } from './settings';
import { spamSign } from './spam';
import type { Submission } from './submission';

/** Emails the form contents to the team, with replies going to the sender. */
export async function notifyTeam(s: Submission) {
  const spam = spamSign(s);
  // Every value as text: the waitlist's letter flag is a boolean.
  const rows = Object.entries(s).map(([key, value]) => [key, String(value)]);
  if (spam) rows.push(['possible spam', spam]);
  const res = await apiCall('POST', `${MAILERSEND_API}/email`, env('MAILERSEND_API_KEY')!, {
    from: { email: env('FORM_FROM') || 'web@shewins.es', name: 'She Wins web' },
    to: [{ email: env('FORM_TO') || 'agnieszka@shewins.es' }],
    reply_to: { email: s.email },
    // A fixed tag the team can filter on in the inbox.
    subject: `${TESTING ? '[TEST] ' : ''}${spam ? '[Possible spam] ' : ''}New ${s.form} form`,
    html: `<table>${rows.map(([key, value]) => `<tr><td><b>${escapeHtml(key)}</b></td><td>${escapeHtml(value)}</td></tr>`).join('')}</table>`,
    text: rows.map(([key, value]) => `${key}: ${value}`).join('\n'),
  });
  if (!res.ok) throw new Error(`MailerSend ${res.status}: ${await res.text()}`);
}
