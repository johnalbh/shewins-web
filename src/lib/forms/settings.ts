// Configuration of the form endpoint, from the environment (see .env.example).
import type { FormKind } from './submission';

/** A variable from Astro's env (.env files in dev) or from the process (Vercel functions). */
export const env = (key: string): string | undefined => import.meta.env[key] || process.env[key];

export const MAILERLITE_API = env('MAILERLITE_API_URL') || 'https://connect.mailerlite.com/api';
export const MAILERSEND_API = env('MAILERSEND_API_URL') || 'https://api.mailersend.com/v1';

// Tests never touch the real lists. In local dev and on Vercel preview deployments, a set
// MAILERLITE_GROUP_TEST takes the place of every group. Production always uses the real groups,
// even when the variable is set there, and a missing VERCEL_ENV counts as production.
export const TESTING = import.meta.env.DEV || env('VERCEL_ENV') === 'preview';

/** A setting, with every MailerLite group replaced by the Test group while testing. */
export const setting = (key: string) => (TESTING && key.startsWith('MAILERLITE_GROUP_') && env('MAILERLITE_GROUP_TEST')) || env(key);

const NEEDS: Record<FormKind, string[]> = {
  letter: ['MAILERLITE_API_KEY', 'MAILERLITE_GROUP_NEWSLETTER'],
  waitlist: ['MAILERLITE_API_KEY', 'MAILERLITE_GROUP_WAITLIST'],
  contact: ['MAILERSEND_API_KEY'],
};

/** The settings a form needs that are not set. */
export const missingSettings = (form: FormKind) => NEEDS[form].filter((key) => !setting(key));
