// Spam checks of the form endpoint that look at the submission itself. BotID and the per-IP rate
// limit (Vercel Firewall) are in front of these; see src/pages/api/form.ts.
import { Resolver } from 'node:dns/promises';
import type { Submission } from './submission';

/** The hidden field people never see (any id ending in -website); bots fill it in. */
export const hasHoneypot = (fields: Record<string, unknown>) =>
  Object.entries(fields).some(([key, value]) => key.endsWith('-website') && value);

// Each lookup gets 1.5 s, tried twice, so a slow DNS server cannot hold the form for long.
const dns = new Resolver({ timeout: 1500, tries: 2 });

/**
 * Whether the email's domain accepts mail. False when the domain does not exist (a typo such as
 * gmail.con), has no MX record, or publishes a "null MX" (RFC 7505), which says it takes no mail.
 * A domain without MX could in theory receive mail at its own address, but real mailboxes publish
 * MX, and typo domains parked on a web server (hotmial.com) only have that address.
 * Any other DNS error lets the email through, so a person is never turned away for our problem.
 * MailerLite then never sends a confirmation that bounces, which hurts the sending reputation.
 */
export async function acceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  try {
    const records = await dns.resolveMx(domain);
    return records.some((r) => r.exchange !== '' && r.exchange !== '.');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') return false;
    console.warn(`[form] MX lookup for ${domain} failed (${code}), accepting the email`);
    return true;
  }
}

// Links in a contact message, counted the way spammers write them.
const linkCount = (text: string) => text.match(/https?:\/\/|www\./gi)?.length ?? 0;

/**
 * Why a contact message looks like spam, or null. A message is never dropped for its content,
 * because a real partner must not be lost: the reason only marks the team notification.
 * Real enquiries rarely carry more than a link or two, and never a link in the name.
 */
export function spamSign(s: Submission): string | null {
  if (s.form !== 'contact') return null;
  if (linkCount(s.name) || linkCount(s.organisation)) return 'a link in the name or organisation';
  const links = linkCount(s.message);
  if (links >= 3) return `${links} links in the message`;
  return null;
}
