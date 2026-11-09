// MailerLite: the Newsletter and Waitlist groups. Double opt-in is the account setting "Double
// opt-in for API and integrations", so MailerLite sends the confirmation email itself.
import { apiCall } from './request';
import { MAILERLITE_API, env, setting } from './settings';

// "2026-10-24T10:00:00.000Z" → "2026-10-24 10:00:00", the format MailerLite expects.
const mailerLiteDate = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

/**
 * Adds an email to one or more MailerLite groups in a single request, so a waitlist signup that
 * also covers the Letter gets one confirmation email, not two.
 * - A new email is created with its fields and consent time. MailerLite then sends the
 *   double opt-in email.
 * - An existing email is only added to the groups. Its name, fields and status stay as they are,
 *   and an email that unsubscribed stays unsubscribed: nobody can change a subscriber's data by
 *   typing her email.
 */
export async function subscribe(email: string, groups: string[], fields: Record<string, string>, optedInAt?: Date) {
  const key = env('MAILERLITE_API_KEY')!;
  const found = await apiCall('GET', `${MAILERLITE_API}/subscribers/${encodeURIComponent(email)}`, key);
  if (found.ok) {
    const res = await apiCall('POST', `${MAILERLITE_API}/subscribers`, key, { email, groups });
    if (!res.ok) throw new Error(`MailerLite add to group ${res.status}: ${await res.text()}`);
    return;
  }
  if (found.status !== 404) throw new Error(`MailerLite lookup ${found.status}: ${await found.text()}`);

  const body = (withFields: Record<string, string>) => ({
    email,
    groups,
    fields: withFields,
    ...(optedInAt ? { opted_in_at: mailerLiteDate(optedInAt) } : {}),
  });
  let res = await apiCall('POST', `${MAILERLITE_API}/subscribers`, key, body(fields));
  // 422 can mean a custom field (language, stage) is not created in MailerLite yet. Keep the
  // signup anyway with the default name field, and log it so the field gets added.
  if (res.status === 422) {
    console.warn('[form] MailerLite rejected custom fields, retrying with name only:', await res.text());
    res = await apiCall('POST', `${MAILERLITE_API}/subscribers`, key, body(fields.name ? { name: fields.name } : {}));
  }
  if (!res.ok) throw new Error(`MailerLite create ${res.status}: ${await res.text()}`);
}

/**
 * The groups of a waitlist signup: Waitlist, and Newsletter when the consent covers the Letter.
 * A missing Newsletter group must not lose the waitlist signup; it is logged so it gets set.
 * In tests both are the Test group, which is listed once.
 */
export function waitlistGroups(withLetter: boolean): string[] {
  const groups = [setting('MAILERLITE_GROUP_WAITLIST')!];
  if (!withLetter) return groups;
  const newsletter = setting('MAILERLITE_GROUP_NEWSLETTER');
  if (!newsletter) console.error('[form] waitlist: MAILERLITE_GROUP_NEWSLETTER is missing, signup kept without the Letter');
  else if (!groups.includes(newsletter)) groups.push(newsletter);
  return groups;
}
