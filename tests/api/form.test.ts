// The form endpoint as the browser and the providers see it: the real POST handler, with BotID,
// DNS and the MailerLite / MailerSend APIs replaced by fakes that record every request.
import type { APIContext } from 'astro';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { checkBotId, resolveMx } = vi.hoisted(() => ({ checkBotId: vi.fn(), resolveMx: vi.fn() }));
vi.mock('botid/server', () => ({ checkBotId }));
vi.mock('node:dns/promises', () => ({
  Resolver: class {
    resolveMx = resolveMx;
  },
}));

const SITE = 'https://www.shewins.es';
const MAILERLITE = 'https://connect.mailerlite.com/api';
const MAILERSEND = 'https://api.mailersend.com/v1';

type Call = { method: string; url: string; body: Record<string, unknown> | undefined };
let calls: Call[];
/** Answers of the fake providers, by "METHOD url" prefix. */
let answers: Record<string, () => Response>;

function fakeFetch(url: string, init: RequestInit = {}) {
  const method = init.method ?? 'GET';
  calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined });
  const key = Object.keys(answers).find((k) => `${method} ${url}`.startsWith(k));
  return Promise.resolve(key ? answers[key]() : new Response('{}', { status: 200 }));
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** Loads the endpoint afresh, so it reads the environment of the test (testing or production). */
async function handler() {
  vi.resetModules();
  const { POST } = await import('../../src/pages/api/form');
  return (
    body: unknown,
    { origin = SITE, type = 'application/json', raw }: { origin?: string | null; type?: string; raw?: string } = {},
  ) => {
    const headers: Record<string, string> = { 'content-type': type };
    if (origin) headers.origin = origin;
    const request = new Request(`${SITE}/api/form`, { method: 'POST', headers, body: raw ?? JSON.stringify(body) });
    return POST({ request, url: new URL(request.url) } as unknown as APIContext) as Promise<Response>;
  };
}

const letter = {
  form: 'letter',
  lang: 'en',
  page: `${SITE}/`,
  'em-website': '',
  'em-letter': 'ana@example.com',
  'em-name': 'Ana',
  'em-lang': 'es',
};
const waitlist = {
  form: 'waitlist',
  lang: 'es',
  page: `${SITE}/es/membership`,
  'w-website': '',
  'w-mail': 'ana@example.com',
  'w-name': 'Ana',
  'w-lang': 'en',
  'w-where': 'Cambiando de carrera',
  'w-ok': true,
};
const contact = {
  form: 'contact',
  lang: 'en',
  page: `${SITE}/partners`,
  'c-website': '',
  'c-type': 'Partner',
  'c-name': 'Ana',
  'c-org': 'Acme',
  'c-mail': 'ana@example.com',
  'c-msg': 'Hello',
};

const KEYS = {
  MAILERLITE_API_KEY: 'ml-key',
  MAILERLITE_GROUP_NEWSLETTER: 'g-news',
  MAILERLITE_GROUP_WAITLIST: 'g-wait',
  MAILERLITE_GROUP_TEST: 'g-test',
  MAILERSEND_API_KEY: 'ms-key',
};
const setKeys = () => Object.entries(KEYS).forEach(([k, v]) => vi.stubEnv(k, v));
const production = () => vi.stubEnv('DEV', false);

beforeEach(() => {
  calls = [];
  answers = { [`GET ${MAILERLITE}/subscribers/`]: () => json({}, 404) };
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  checkBotId.mockResolvedValue({ isBot: false });
  resolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);
  for (const level of ['log', 'warn', 'error'] as const) vi.spyOn(console, level).mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('requests the endpoint turns away', () => {
  it('rejects a post from another site, or without an origin', async () => {
    const post = await handler();
    expect((await post(letter, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await post(letter, { origin: null })).status).toBe(403);
  });

  it('rejects a body that is not JSON', async () => {
    const post = await handler();
    expect((await post(letter, { type: 'text/plain' })).status).toBe(415);
    expect((await post(null, { raw: '{not json' })).status).toBe(400);
    expect((await post(null, { raw: '[1, 2]' })).status).toBe(400);
  });

  it('rejects a body over 16,000 characters', async () => {
    const post = await handler();
    expect((await post({ ...contact, 'c-msg': 'x'.repeat(16_001) })).status).toBe(413);
  });

  it('pretends a filled honeypot worked, and sends nothing', async () => {
    const post = await handler();
    const res = await post({ ...letter, 'em-website': 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(checkBotId).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('rejects a bot found by BotID, and lets the request through when the check itself fails', async () => {
    const post = await handler();
    checkBotId.mockResolvedValueOnce({ isBot: true });
    expect((await post(letter)).status).toBe(403);
    checkBotId.mockRejectedValueOnce(new Error('OIDC'));
    expect((await post(letter)).status).toBe(200);
  });

  it('names the first invalid field of each form', async () => {
    const post = await handler();
    const invalid = async (body: unknown) => (await (await post(body)).json()).invalid;
    expect(await invalid({ ...letter, 'em-letter': 'ana@' })).toBe('email');
    expect(await invalid({ ...letter, 'em-name': ' ' })).toBe('name');
    expect(await invalid({ ...letter, 'em-lang': 'fr' })).toBe('language');
    expect(await invalid({ ...waitlist, 'w-ok': 'true' })).toBe('consent');
    expect(await invalid({ ...contact, 'c-msg': '' })).toBe('message');
    expect(await invalid({ ...letter, form: 'other' })).toBe('form');
  });

  it('turns away an email whose domain takes no mail, and accepts it when DNS fails on our side', async () => {
    const post = await handler();
    resolveMx.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'ENOTFOUND' }));
    const res = await post({ ...letter, 'em-letter': 'ana@gmail.con' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, invalid: 'email' });
    // A "null MX" (RFC 7505) says the domain takes no mail.
    resolveMx.mockResolvedValueOnce([{ exchange: '', priority: 0 }]);
    expect((await post(letter)).status).toBe(400);
    resolveMx.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' }));
    expect((await post(letter)).status).toBe(200);
  });
});

describe('without API keys', () => {
  it('logs the submission and answers ok in development', async () => {
    const res = await (await handler())(letter);
    expect(await res.json()).toEqual({ ok: true, dev: true });
    expect(calls).toEqual([]);
  });

  it('answers 503 in production', async () => {
    production();
    expect((await (await handler())(letter)).status).toBe(503);
  });
});

describe('The She Wins Letter', () => {
  it('creates a new subscriber in the Newsletter group with name and language', async () => {
    production();
    setKeys();
    const res = await (await handler())(letter);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET ${MAILERLITE}/subscribers/ana%40example.com`,
      `POST ${MAILERLITE}/subscribers`,
    ]);
    expect(calls[1].body).toEqual({ email: 'ana@example.com', groups: ['g-news'], fields: { name: 'Ana', language: 'es' } });
  });

  it('only adds an existing subscriber to the group, without touching her fields', async () => {
    production();
    setKeys();
    answers[`GET ${MAILERLITE}/subscribers/`] = () => json({ data: {} });
    await (
      await handler()
    )(letter);
    expect(calls[1].body).toEqual({ email: 'ana@example.com', groups: ['g-news'] });
  });

  it('retries with the name only when MailerLite rejects a custom field', async () => {
    production();
    setKeys();
    let creates = 0;
    answers[`POST ${MAILERLITE}/subscribers`] = () => (++creates === 1 ? json({ message: 'unknown field' }, 422) : json({}));
    expect((await (await handler())(letter)).status).toBe(200);
    expect(calls[2].body).toEqual({ email: 'ana@example.com', groups: ['g-news'], fields: { name: 'Ana' } });
  });

  it('uses the Test group instead of the real ones in development', async () => {
    setKeys();
    await (
      await handler()
    )(letter);
    expect(calls[1].body).toMatchObject({ groups: ['g-test'] });
  });

  it('answers 502 when MailerLite fails', async () => {
    production();
    setKeys();
    answers[`POST ${MAILERLITE}/subscribers`] = () => json({}, 500);
    expect((await (await handler())(letter)).status).toBe(502);
  });
});

describe('the waitlist', () => {
  it('joins the Waitlist and Newsletter groups in one request, with consent time and stage, and tells the team', async () => {
    production();
    setKeys();
    await (
      await handler()
    )(waitlist);
    const create = calls.find((c) => c.method === 'POST' && c.url === `${MAILERLITE}/subscribers`)!;
    expect(create.body).toMatchObject({
      email: 'ana@example.com',
      groups: ['g-wait', 'g-news'],
      // The stage is stored in English whatever the page language.
      fields: { name: 'Ana', language: 'en', stage: 'Changing career' },
    });
    expect(create.body!.opted_in_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    const mail = calls.find((c) => c.url === `${MAILERSEND}/email`)!;
    expect(mail.body).toMatchObject({ subject: 'New waitlist form', reply_to: { email: 'ana@example.com' } });
  });

  it('keeps the email out of the Newsletter when an old page sends w-letter: false', async () => {
    production();
    setKeys();
    await (
      await handler()
    )({ ...waitlist, 'w-letter': false });
    expect(calls.find((c) => c.method === 'POST' && c.url === `${MAILERLITE}/subscribers`)!.body).toMatchObject({ groups: ['g-wait'] });
  });

  it('keeps the signup when the team notification fails', async () => {
    production();
    setKeys();
    answers[`POST ${MAILERSEND}/email`] = () => json({}, 500);
    expect((await (await handler())(waitlist)).status).toBe(200);
  });
});

describe('the contact form', () => {
  it('emails the team with every field, escaped, and replies to the sender', async () => {
    production();
    setKeys();
    await (
      await handler()
    )({ ...contact, 'c-msg': '<b>Hi</b>' });
    const mail = calls.find((c) => c.url === `${MAILERSEND}/email`)!;
    expect(mail.body).toMatchObject({
      from: { email: 'web@shewins.es', name: 'She Wins web' },
      to: [{ email: 'agnieszka@shewins.es' }],
      reply_to: { email: 'ana@example.com' },
      subject: 'New contact form',
    });
    expect(mail.body!.html).toContain('<tr><td><b>message</b></td><td>&lt;b&gt;Hi&lt;/b&gt;</td></tr>');
    expect(mail.body!.text).toContain('organisation: Acme');
  });

  it('marks link spam in the subject, and every test notification with [TEST]', async () => {
    setKeys();
    await (
      await handler()
    )({ ...contact, 'c-msg': 'http://a http://b www.c' });
    const mail = calls.find((c) => c.url === `${MAILERSEND}/email`)!;
    expect(mail.body!.subject).toBe('[TEST] [Possible spam] New contact form');
    expect(mail.body!.text).toContain('possible spam: 3 links in the message');
  });
});
