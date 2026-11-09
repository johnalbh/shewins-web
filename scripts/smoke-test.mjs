// Smoke test of the site's browser behaviour: menu, language buttons, every form (validation
// messages, dialogs, the JSON sent, thank-you states, the email-domain error), the contact dialog,
// the sticky waitlist bar, event status pills, cookie banner, Letter invitation, share and the
// field arrow. It checks what a person sees and what the endpoint receives, so a refactor of
// src/scripts/ can be verified without reading the diff.
//
//   npm run dev                          # in another terminal
//   npm run test:smoke                   # or: node scripts/smoke-test.mjs --base http://localhost:4321
//
// /api/form is intercepted (nothing is sent to MailerLite), so it runs against `astro dev`, where
// BotID does nothing. Uses the installed Google Chrome, like the responsive audit.
import fs from 'node:fs';
import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:4321');
const POST_SLUG = fs.readdirSync('src/content/posts')[0];

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  (${detail})`}`);
}

const browser = await chromium.launch({ channel: 'chrome' });

const contexts = [];

/** A fresh browser context. `quiet` pre-answers the cookie banner and the Letter invitation. */
async function open(path, { quiet = true, motion = 'reduce', width = 1280, answer } = {}) {
  const context = await browser.newContext({ reducedMotion: motion, viewport: { width, height: 900 } });
  contexts.push(context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  await context.addInitScript((quietPage) => {
    try {
      if (quietPage) {
        localStorage.setItem('sw-consent', JSON.stringify({ an: false, mk: false, t: Date.now() }));
        localStorage.setItem('sw-letter', JSON.stringify({ s: 'closed', t: Date.now() }));
      }
    } catch {
      // about:blank has no storage; the page itself sets it again.
    }
    window.__sent = [];
    document.addEventListener('sw-form-sent', (e) => window.__sent.push(e.detail));
  }, quiet);
  const page = await context.newPage();
  const sent = [];
  await page.route('**/api/form', async (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    const reply = answer ? answer(body) : { status: 200, json: { ok: true } };
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.json) });
  });
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  return { page, sent };
}

/** Runs one scenario; an exception fails it without stopping the others. */
async function scenario(name, run) {
  try {
    await run();
  } catch (err) {
    check(`${name}: ran to the end`, false, err.message.split('\n')[0]);
  } finally {
    await Promise.all(contexts.splice(0).map((c) => c.close()));
  }
}

const visibleText = (page, selector) => page.locator(selector).first().innerText();
const isVisible = (page, selector) => page.locator(selector).first().isVisible();
const keysOf = (body) => Object.keys(body).sort().join(',');
/** Waits up to 3 s for a condition in the page (a dialog's close event arrives asynchronously). */
const until = (page, condition, arg) =>
  page.waitForFunction(condition, arg, { timeout: 3000 }).then(
    () => true,
    () => false,
  );
/** Hidden by its own attribute: some panels fade out after it is set. */
const isHidden = (page, selector) => until(page, (s) => document.querySelector(s).hidden, selector);

await scenario('Menu and language buttons', async () => {
  const { page } = await open('/about', { width: 390 });
  await page.click('.burger');
  check('menu opens', await isVisible(page, '#menu'));
  check('menu: burger says expanded', (await page.getAttribute('.burger', 'aria-expanded')) === 'true');
  check('menu: focus on its close button', await page.evaluate(() => document.activeElement?.matches('#menu .x')));
  await page.keyboard.press('Escape');
  check('menu closes on Escape', await isHidden(page, '#menu'));
  check('menu: focus back on the burger', await page.evaluate(() => document.activeElement?.matches('.burger')));
  await Promise.all([page.waitForURL('**/es/about'), page.click('.lang button[data-lang="es"]')]);
  check('ES button opens the Spanish page', page.url().endsWith('/es/about'));
  check('ES button remembers the language', (await page.evaluate(() => localStorage.getItem('sw-lang'))) === 'es');
});

await scenario('Placeholders in the page language', async () => {
  const { page } = await open('/es');
  check('ES placeholder on the Letter email', (await page.getAttribute('#em-letter', 'placeholder')) === 'Correo electrónico');
  const membership = await open('/es/membership');
  const options = await membership.page.$$eval('#w-where option[data-es]', (os) =>
    os.every((o) => o.textContent === o.getAttribute('data-es')),
  );
  check('ES option labels on the waitlist', options);
});

await scenario('The She Wins Letter (home)', async () => {
  const { page, sent } = await open('/');
  const form = 'form[data-form="letter"]';
  await page.click(`${form} .inline-form button[type="submit"]`);
  check('Letter: empty email is named', (await visibleText(page, '#em-letter-err')) === 'Enter your email.');
  check('Letter: field marked invalid', (await page.getAttribute('#em-letter', 'aria-invalid')) === 'true');
  check('Letter: field points to its message', (await page.getAttribute('#em-letter', 'aria-describedby')) === 'em-letter-err');
  await page.fill('#em-letter', 'ana@example');
  await page.click(`${form} .inline-form button[type="submit"]`);
  check('Letter: malformed email is named', (await visibleText(page, '#em-letter-err')) === 'Enter a valid email, like name@example.com.');
  await page.fill('#em-letter', 'ana@example.com');
  check('Letter: message goes once the email is right', !(await isVisible(page, '#em-letter-err')));
  await page.click(`${form} .inline-form button[type="submit"]`);
  check('Letter: dialog opens', await isVisible(page, `${form} dialog.ask[open]`));
  check('Letter: dialog shows the email', (await visibleText(page, `${form} [data-mail]`)) === 'ana@example.com');
  check('Letter: focus on the name', await page.evaluate(() => document.activeElement?.id === 'em-name'));
  await page.click(`${form} .ask-q button[type="submit"]`);
  check('Letter: empty name gets its own words', (await visibleText(page, '#em-name-err')) === 'Enter your name.');
  check('Letter: nothing sent while invalid', sent.length === 0);
  await page.fill('#em-name', 'Ana');
  await page.click(`${form} .ask-q button[type="submit"]`);
  await page.waitForSelector(`${form} .ask-end:not([hidden])`);
  const body = sent[0] ?? {};
  check('Letter: one request', sent.length === 1, `${sent.length}`);
  check('Letter: JSON keys', keysOf(body) === 'em-lang,em-letter,em-name,em-website,form,lang,page,sent', keysOf(body));
  check(
    'Letter: JSON values',
    body.form === 'letter' &&
      body.lang === 'en' &&
      body['em-letter'] === 'ana@example.com' &&
      body['em-name'] === 'Ana' &&
      body['em-lang'] === 'en' &&
      body['em-website'] === '',
    JSON.stringify(body),
  );
  check('Letter: thank-you in the dialog', (await visibleText(page, `${form} .ask-done`)).includes('Almost there.'));
  check('Letter: questions hidden', !(await isVisible(page, `${form} .ask-q`)));
  check('Letter: close button focused', await page.evaluate(() => document.activeElement?.matches('.ask-end button')));
  const events = await page.evaluate(() => window.__sent);
  check(
    'Letter: sw-form-sent announced',
    events.length === 1 && events[0].form === 'letter' && events[0].data['em-letter'] === 'ana@example.com',
  );
  await page.click(`${form} .ask-end button`);
  check(
    'Letter: form shows its done state after closing',
    await until(page, (s) => document.querySelector(s).classList.contains('done'), form),
  );
});

await scenario('Letter: email domain that takes no mail, and a server error', async () => {
  const answer = (body) =>
    body['em-letter'].endsWith('.con') ? { status: 400, json: { ok: false, invalid: 'email' } } : { status: 502, json: { ok: false } };
  const { page } = await open('/', { answer });
  const form = 'form[data-form="letter"]';
  await page.fill('#em-letter', 'ana@gmail.con');
  await page.click(`${form} .inline-form button[type="submit"]`);
  await page.fill('#em-name', 'Ana');
  await page.click(`${form} .ask-q button[type="submit"]`);
  await page.waitForFunction(() => !document.querySelector('form[data-form="letter"] dialog.ask').open);
  check('Bad domain: dialog closes', true);
  const line = await visibleText(page, `${form} ~ .ferr`);
  check('Bad domain: message under the form', line === 'That email address does not seem to exist. Please check it.', line);
  check(
    'Bad domain: email marked and focused',
    await page.evaluate(() => document.activeElement?.id === 'em-letter' && document.activeElement.getAttribute('aria-invalid') === 'true'),
  );

  await page.fill('#em-letter', 'ana@example.com');
  await page.click(`${form} .inline-form button[type="submit"]`);
  check('Retry: the old message goes', !(await isVisible(page, `${form} ~ .ferr`)));
  await page.click(`${form} .ask-q button[type="submit"]`);
  await page.waitForSelector(`${form} dialog .ferr:not([hidden])`);
  const error = await visibleText(page, `${form} dialog .ferr`);
  check('Server error: general message in the dialog', error === 'Something went wrong. Please try again or email us.', error);
  check('Server error: button enabled again', await page.locator(`${form} .ask-q button[type="submit"]`).isEnabled());
});

await scenario('Membership: sticky bar, waitlist dialog', async () => {
  const { page, sent } = await open('/membership');
  check('Sticky: hidden at the top', !(await page.locator('#sticky').evaluate((s) => s.classList.contains('show-it'))));
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(100);
  check('Sticky: shows after scrolling', await page.locator('#sticky').evaluate((s) => s.classList.contains('show-it')));
  await page.evaluate(() => document.getElementById('waitlist').scrollIntoView());
  await page.waitForTimeout(100);
  check('Sticky: hides over the waitlist', !(await page.locator('#sticky').evaluate((s) => s.classList.contains('show-it'))));
  await page.evaluate(() => window.scrollTo(0, 0));

  const form = 'form[data-form="waitlist"]';
  await page.click('.open button[data-scroll="waitlist"]');
  check('Waitlist: button opens the dialog', await isVisible(page, `${form} dialog.ask[open]`));
  check('Waitlist: dialog asks for the email', await isVisible(page, '#w-mail-ask'));
  check('Waitlist: "we will write to" hidden', !(await isVisible(page, `${form} .ask-to`)));
  check('Waitlist: focus on the email', await page.evaluate(() => document.activeElement?.id === 'w-mail-ask'));
  await page.click(`${form} .ask-q button[type="submit"]`);
  check('Waitlist: email named', (await visibleText(page, '#w-mail-ask-err')) === 'Enter your email.');
  check('Waitlist: name named', (await visibleText(page, '#w-name-err')) === 'Enter your name.');
  check('Waitlist: consent named', (await visibleText(page, '#w-ok-err')) === 'Tick the box to join the waitlist.');
  check('Waitlist: band email not marked', !(await page.locator('#w-mail-err').count()));
  await page.fill('#w-mail-ask', 'ana@example.com');
  check('Waitlist: dialog email copied to the form', (await page.inputValue('#w-mail')) === 'ana@example.com');
  await page.fill('#w-name', 'Ana');
  await page.selectOption('#w-where', { index: 1 });
  await page.check('#w-ok');
  check('Waitlist: consent message goes once ticked', !(await isVisible(page, '#w-ok-err')));
  await page.click(`${form} .ask-q button[type="submit"]`);
  await page.waitForSelector(`${form} .ask-end:not([hidden])`);
  const body = sent[0] ?? {};
  check('Waitlist: JSON keys', keysOf(body) === 'form,lang,page,sent,w-lang,w-mail,w-mail-ask,w-name,w-ok,w-website,w-where', keysOf(body));
  check(
    'Waitlist: JSON values',
    body.form === 'waitlist' &&
      body['w-mail'] === 'ana@example.com' &&
      body['w-ok'] === true &&
      body['w-lang'] === 'en' &&
      body['w-where'] !== '',
    JSON.stringify(body),
  );
  check('Waitlist: thank-you in the dialog', (await visibleText(page, `${form} .ask-done`)).length > 0);
  await page.click(`${form} .ask-end button`);
  check('Waitlist: done state after closing', await until(page, (s) => document.querySelector(s).classList.contains('done'), form));
});

await scenario('/membership#waitlist from another page', async () => {
  const { page } = await open('/membership#waitlist');
  check('#waitlist: dialog opens on arrival', await isVisible(page, 'form[data-form="waitlist"] dialog.ask[open]'));
  check('#waitlist: hash removed', (await page.evaluate(() => location.hash)) === '');
  check('#waitlist: page at the top', (await page.evaluate(() => window.scrollY)) === 0);
});

await scenario('Partners: contact form in a dialog', async () => {
  const { page, sent } = await open('/partners');
  await page.click('button[data-scroll="contact"]');
  check('Contact: dialog opens', await isVisible(page, 'dialog.ask-form[open]'));
  check('Contact: the form moved into the dialog', (await page.locator('dialog.ask-form form[data-form="contact"]').count()) === 1);
  check('Contact: focus on the first field', await page.evaluate(() => document.activeElement?.id === 'c-type'));
  await page.click('form[data-form="contact"] button[type="submit"]');
  check('Contact: name named', (await visibleText(page, '#c-name-err')) === 'Enter your name.');
  check('Contact: email named', (await visibleText(page, '#c-mail-err')) === 'Enter your email.');
  check('Contact: message named', (await visibleText(page, '#c-msg-err')) === 'Write your message.');
  await page.fill('#c-name', 'Ana');
  await page.fill('#c-mail', 'ana@example.com');
  await page.fill('#c-org', 'Acme');
  await page.fill('#c-msg', 'Hello');
  await page.click('form[data-form="contact"] button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('form[data-form="contact"]').classList.contains('done'));
  const body = sent[0] ?? {};
  check('Contact: JSON keys', keysOf(body) === 'c-mail,c-msg,c-name,c-org,c-type,c-website,form,lang,page,sent', keysOf(body));
  check('Contact: JSON values', body.form === 'contact' && body['c-msg'] === 'Hello' && body['c-org'] === 'Acme', JSON.stringify(body));
  check('Contact: focus on the dialog close button', await page.evaluate(() => document.activeElement?.matches('dialog.ask-form .x')));
  await page.click('dialog.ask-form .x');
  check('Contact: dialog closed', !(await isVisible(page, 'dialog.ask-form[open]')));
  check(
    'Contact: the form is back in its band',
    await until(
      page,
      () => !document.querySelector('dialog.ask-form form') && !!document.querySelector('#contact form[data-form="contact"]'),
    ),
  );
});

await scenario('Events: status pills', async () => {
  const { page } = await open('/events');
  const pills = await page.$$eval('.show[data-date]', (shows) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shows.map((s) => {
      const d = new Date(s.getAttribute('data-date') + 'T00:00:00');
      const expected = d < today ? 'Past' : d.getTime() === today.getTime() ? 'Today' : 'Upcoming';
      const status = s.querySelector('.status');
      return { expected, got: status.innerText, shown: !status.hidden };
    });
  });
  check(
    'Events: every pill says Past / Today / Upcoming',
    pills.every((p) => p.shown && p.got === p.expected),
    JSON.stringify(pills),
  );
});

await scenario('Cookie banner', async () => {
  const { page } = await open('/about', { quiet: false });
  check('Cookies: banner shows on a first visit', await isVisible(page, '#cb'));
  await page.click('[data-cb="cfg"]');
  check(
    'Cookies: settings open',
    (await isVisible(page, '.cb-set')) && (await isVisible(page, '[data-cb="save"]')) && !(await isVisible(page, '[data-cb="cfg"]')),
  );
  await page.check('#cb-an');
  await page.click('[data-cb="save"]');
  check('Cookies: banner closes', await isHidden(page, '#cb'));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sw-consent')));
  check('Cookies: choice stored', stored.an === true && stored.mk === false && typeof stored.t === 'number');
  check('Cookies: choice exposed', await page.evaluate(() => window.swConsent.analytics === true && window.swConsent.marketing === false));
  await page.click('[data-cookie-open]');
  check(
    'Cookies: footer link reopens with the choice',
    (await isVisible(page, '#cb')) && (await page.isChecked('#cb-an')) && !(await page.isChecked('#cb-mk')),
  );
});

await scenario('Letter invitation', async () => {
  const { page } = await open('/about', { quiet: false });
  await page.click('[data-cb="none"]');
  check('Invite: hidden before reading', !(await isVisible(page, '#letter-invite')));
  await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * 0.45));
  await page.waitForTimeout(150);
  check('Invite: shows after 40% of the page', await isVisible(page, '#letter-invite'));
  await page.click('#letter-invite [data-invite-close]');
  check('Invite: closes', await isHidden(page, '#letter-invite'));
  check('Invite: remembered as closed', (await page.evaluate(() => JSON.parse(localStorage.getItem('sw-letter')).s)) === 'closed');
});

await scenario('Share an article', async () => {
  const { page } = await open(`/blog/${POST_SLUG}`);
  await page.click('[data-copy]');
  await page.waitForTimeout(100);
  check('Share: label confirms the copy', (await visibleText(page, '[data-copy] span')) === 'Link copied');
  check('Share: announced to screen readers', (await page.locator('.share-status').textContent()) === 'Link copied');
  check(
    'Share: link in the clipboard',
    (await page.evaluate(() => navigator.clipboard.readText())) === (await page.getAttribute('[data-copy]', 'data-copy')),
  );
});

await scenario('Field arrow (with motion)', async () => {
  const { page } = await open('/', { motion: 'no-preference' });
  check(
    'Arrow: waits unwritten',
    await page
      .locator('.formband')
      .first()
      .evaluate((b) => b.classList.contains('arm') && !b.classList.contains('seen')),
  );
  await page.locator('.formband .inline-form').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  check(
    'Arrow: writes itself in on screen',
    await page
      .locator('.formband')
      .first()
      .evaluate((b) => b.classList.contains('seen')),
  );
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
