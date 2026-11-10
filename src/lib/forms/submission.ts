// What each form may send. The browser's JSON (field ids as keys, src/scripts/forms.js) is read
// against an allowlist: each form keeps only its own fields, cut to a maximum length, and a
// missing or malformed required field is named, so the page can say which one.
import type { Lang } from '../../i18n';

/** Same pattern as the browser check in src/scripts/forms.js. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// lang is the language of the page the form was sent from; language is the one the person chose
// for the emails, and the one stored in MailerLite.
type Common = { lang: Lang; page: string; email: string };
export type Submission =
  | (Common & { form: 'letter'; name: string; language: Lang })
  | (Common & { form: 'waitlist'; name: string; language: Lang; stage: string; letter: boolean })
  | (Common & { form: 'contact'; name: string; type: string; organisation: string; message: string });
export type FormKind = Submission['form'];
type Invalid = { invalid: string };
type Fields = Record<string, unknown>;

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const language = (value: unknown): Lang | null => (value === 'en' || value === 'es' ? value : null);

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

function parseLetter(d: Fields, common: Omit<Common, 'email'>): Submission | Invalid {
  const name = text(d['em-name'], 80);
  const email = text(d['em-letter'], 254);
  const chosen = language(d['em-lang']);
  if (!EMAIL.test(email)) return { invalid: 'email' };
  if (!name) return { invalid: 'name' };
  if (!chosen) return { invalid: 'language' };
  return { form: 'letter', ...common, email, name, language: chosen };
}

function parseWaitlist(d: Fields, common: Omit<Common, 'email'>): Submission | Invalid {
  const name = text(d['w-name'], 80);
  const email = text(d['w-mail'], 254);
  const chosen = language(d['w-lang']);
  if (!name) return { invalid: 'name' };
  if (!EMAIL.test(email)) return { invalid: 'email' };
  if (!chosen) return { invalid: 'language' };
  if (d['w-ok'] !== true) return { invalid: 'consent' };
  // The single consent box covers "emails from She Wins": the membership news and The She Wins
  // Letter (team decision, November 2026). A page loaded before that change still has the
  // separate Letter box, and an unticked one arrives as false and is respected.
  const letter = d['w-letter'] !== false;
  const stage = STAGES.get(text(d['w-where'], 80)) ?? '';
  return { form: 'waitlist', ...common, email, name, language: chosen, stage, letter };
}

function parseContact(d: Fields, common: Omit<Common, 'email'>): Submission | Invalid {
  const name = text(d['c-name'], 120);
  const email = text(d['c-mail'], 254);
  const message = text(d['c-msg'], 5000);
  if (!name) return { invalid: 'name' };
  if (!EMAIL.test(email)) return { invalid: 'email' };
  if (!message) return { invalid: 'message' };
  return { form: 'contact', ...common, email, name, message, type: text(d['c-type'], 80), organisation: text(d['c-org'], 160) };
}

/** Keeps only the fields of the form that was sent, or names the first invalid one. */
export function parseSubmission(d: Fields): Submission | Invalid {
  const common = { lang: language(d.lang) ?? 'en', page: text(d.page, 300) };
  switch (d.form) {
    case 'letter':
      return parseLetter(d, common);
    case 'waitlist':
      return parseWaitlist(d, common);
    case 'contact':
      return parseContact(d, common);
    default:
      return { invalid: 'form' };
  }
}
