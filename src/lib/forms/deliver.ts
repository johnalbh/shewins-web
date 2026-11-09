// What happens to each accepted form:
//   letter   → MailerLite group "Newsletter"
//   waitlist → MailerLite groups "Waitlist" and "Newsletter" (its consent box covers both)
//              + a notification to the team
//   contact  → a notification to the team, reply-to the sender
import { notifyTeam } from './mailersend';
import { subscribe, waitlistGroups } from './mailerlite';
import { env, setting } from './settings';
import type { Submission } from './submission';

export async function deliver(s: Submission) {
  switch (s.form) {
    case 'letter':
      await subscribe(s.email, [setting('MAILERLITE_GROUP_NEWSLETTER')!], { name: s.name, language: s.language });
      return;
    case 'waitlist':
      // opted_in_at records when the consent box was ticked, as proof of consent (GDPR).
      await subscribe(s.email, waitlistGroups(s.letter), { name: s.name, language: s.language, stage: s.stage }, new Date());
      // The signup is stored; the team notification is best effort and must not fail it.
      if (env('MAILERSEND_API_KEY')) await notifyTeam(s).catch((err) => console.error('[form] notification', err));
      return;
    case 'contact':
      await notifyTeam(s);
  }
}
