import { afterEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml } from '../../src/lib/html';
import { hasHoneypot, spamSign } from '../../src/lib/forms/spam';
import { parseSubmission, type Submission } from '../../src/lib/forms/submission';

describe('parseSubmission', () => {
  it('keeps only the fields of the form, trimmed and cut to their length', () => {
    const parsed = parseSubmission({
      form: 'contact',
      lang: 'xx',
      page: 'https://www.shewins.es/partners',
      'c-name': '  Ana  ',
      'c-mail': 'ana@example.com',
      'c-msg': 'x'.repeat(6000),
      'c-org': 42,
      extra: 'dropped',
    });
    expect(parsed).toEqual({
      form: 'contact',
      // An unknown page language falls back to English.
      lang: 'en',
      page: 'https://www.shewins.es/partners',
      email: 'ana@example.com',
      name: 'Ana',
      message: 'x'.repeat(5000),
      type: '',
      organisation: '',
    });
  });

  it('stores the waitlist stage in English, whatever the page language', () => {
    const parsed = parseSubmission({
      form: 'waitlist',
      'w-name': 'Ana',
      'w-mail': 'ana@example.com',
      'w-lang': 'es',
      'w-ok': true,
      'w-where': 'Buscando comunidad',
    });
    expect(parsed).toMatchObject({ stage: 'Looking for community', letter: true, language: 'es' });
    expect(
      parseSubmission({ form: 'waitlist', 'w-name': 'Ana', 'w-mail': 'ana@example.com', 'w-lang': 'es', 'w-ok': true, 'w-where': 'Other' }),
    ).toMatchObject({ stage: '' });
  });

  it('names the first invalid field', () => {
    expect(parseSubmission({ form: 'letter', 'em-letter': 'nope', 'em-name': '' })).toEqual({ invalid: 'email' });
    expect(parseSubmission({ form: 'nope' })).toEqual({ invalid: 'form' });
  });
});

describe('spam checks', () => {
  const contact = (fields: Partial<Extract<Submission, { form: 'contact' }>>): Submission => ({
    form: 'contact',
    lang: 'en',
    page: '',
    email: 'a@b.co',
    name: 'Ana',
    type: '',
    organisation: '',
    message: 'Hello',
    ...fields,
  });

  it('finds a filled honeypot of any form', () => {
    expect(hasHoneypot({ 'w-website': 'x' })).toBe(true);
    expect(hasHoneypot({ 'w-website': '' })).toBe(false);
  });

  it('marks links in the name or organisation, and three links or more in the message', () => {
    expect(spamSign(contact({}))).toBeNull();
    expect(spamSign(contact({ organisation: 'www.spam.example' }))).toBe('a link in the name or organisation');
    expect(spamSign(contact({ message: 'see https://a and https://b' }))).toBeNull();
    expect(spamSign(contact({ message: 'https://a http://b www.c' }))).toBe('3 links in the message');
  });
});

describe('waitlistGroups', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function groups(withLetter: boolean) {
    vi.resetModules();
    const { waitlistGroups } = await import('../../src/lib/forms/mailerlite');
    return waitlistGroups(withLetter);
  }

  it('adds the Newsletter group only when the consent covers the Letter', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MAILERLITE_GROUP_WAITLIST', 'wait');
    vi.stubEnv('MAILERLITE_GROUP_NEWSLETTER', 'news');
    expect(await groups(true)).toEqual(['wait', 'news']);
    expect(await groups(false)).toEqual(['wait']);
  });

  it('keeps the signup without the Letter when the Newsletter group is missing', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('MAILERLITE_GROUP_WAITLIST', 'wait');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await groups(true)).toEqual(['wait']);
  });

  it('lists the Test group once while testing', async () => {
    vi.stubEnv('MAILERLITE_GROUP_TEST', 'test');
    vi.stubEnv('MAILERLITE_GROUP_WAITLIST', 'wait');
    vi.stubEnv('MAILERLITE_GROUP_NEWSLETTER', 'news');
    expect(await groups(true)).toEqual(['test']);
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that matter in HTML and XML text and attributes', () => {
    expect(escapeHtml('<a href="x">Tom & Jerry</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;');
  });
});
