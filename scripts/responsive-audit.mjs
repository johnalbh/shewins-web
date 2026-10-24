// Responsive audit: opens every page at a range of widths and reports
//   - horizontal overflow (elements past the viewport edge; body{overflow-x:hidden} hides it visually)
//   - text overflowing its own box
//   - tap targets smaller than 24×24 (fail, WCAG 2.5.8) or 44×44 (warn, Apple/Android guidance)
//   - form fields with font-size < 16px (iOS zooms in on focus)
// and saves full-page screenshots at the key widths, plus report.json and report.html.
//
//   node scripts/responsive-audit.mjs --base http://localhost:4400 --out audit/baseline
//
// Uses the installed Google Chrome (no browser download). Reduced motion is emulated so
// scroll-reveal animations do not hide content in the screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:4321');
const OUT = path.resolve(arg('out', 'audit/run'));
const ONLY = arg('pages', '');

const SLUGS = fs.readdirSync(path.resolve('src/content/posts'));
const PAGES = ['/', '/about', '/events', '/membership', '/partners', '/blog', '/privacy', '/legal', '/cookies', ...SLUGS.map((s) => `/blog/${s}`)]
  .flatMap((p) => [p, p === '/' ? '/es' : `/es${p}`])
  .filter((p) => !ONLY || ONLY.split(',').includes(p));

const VIEWPORTS = [
  ...[320, 360, 375, 390, 430, 759, 760, 768, 820, 859, 860, 999, 1000, 1024, 1280, 1440, 1920].map((w) => ({ width: w, height: 900 })),
  { width: 844, height: 390, label: '844x390' },
];
const SHOT_WIDTHS = new Set([320, 390, 768, 1024, 1440]);

// Runs inside the page.
function inspect() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Intentionally off-screen: skip link, honeypot fields, closed menu/sticky/cookie layers.
  const ignored = (el) => el.closest('.skip, [aria-hidden="true"], #menu[hidden], .sticky-cta:not(.show-it), #cb[hidden], [hidden]');
  const label = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    if (el.classList.length) s += `.${[...el.classList].join('.')}`;
    const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ');
    return text ? `${s} «${text.slice(0, 50)}»` : s;
  };
  const all = [...document.body.querySelectorAll('*')].filter((el) => !ignored(el) && visible(el));

  // Partly past an edge. Elements placed entirely off-screen on purpose (screen-reader-only
  // labels at left:-999px and similar) are not layout overflow.
  const overflow = all
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return (r.right > vw + 1 && r.left < vw) || (r.left < -1 && r.right > 0);
    })
    // Report the outermost offender only.
    .filter((el, _, list) => !list.includes(el.parentElement))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el: label(el), left: Math.round(r.left), right: Math.round(r.right) };
    });

  const textOverflow = all
    .filter((el) => /^(H1|H2|H3|H4|P|A|SPAN|LI|BUTTON|LABEL|FIGCAPTION|B|SMALL)$/.test(el.tagName))
    .filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== 'inline' && s.overflowX === 'visible' && el.scrollWidth > el.clientWidth + 1;
    })
    .filter((el, _, list) => !list.includes(el.parentElement))
    .map((el) => ({ el: label(el), box: el.clientWidth, content: el.scrollWidth }));

  // Links inside running text are exempt from target size (WCAG 2.5.8 "inline" exception).
  const inline = (el) => el.tagName === 'A' && getComputedStyle(el).display === 'inline' && /^(P|LI|TD|SPAN|SMALL)$/.test(el.parentElement.tagName);
  const targets = all
    .filter((el) => el.matches('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]') && !inline(el))
    .map((el) => {
      // A label wrapping a checkbox counts as its target.
      const box = (el.type === 'checkbox' && el.closest('label')) || el;
      const r = box.getBoundingClientRect();
      return { el: label(el), w: Math.round(r.width), h: Math.round(r.height) };
    });
  const small = targets.filter((t) => t.w < 24 || t.h < 24);
  const tight = targets.filter((t) => !(t.w < 24 || t.h < 24) && (t.w < 44 || t.h < 44));

  const smallFont = all
    .filter((el) => el.matches('input:not([type=checkbox]):not([type=radio]), select, textarea'))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
    .map((el) => ({ el: label(el), size: getComputedStyle(el).fontSize }));

  return { scrollWidth: document.documentElement.scrollWidth, vw, overflow, textOverflow, small, tight, smallFont };
}

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 1 });
// Hide the cookie banner (its own check is below) so it does not cover the pages.
await context.addInitScript(() => {
  try {
    localStorage.setItem('sw-consent', JSON.stringify({ an: false, mk: false, t: Date.now() }));
  } catch {}
});
const page = await context.newPage();
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const results = [];
for (const vp of VIEWPORTS) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  const vpLabel = vp.label ?? String(vp.width);
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    const r = await page.evaluate(inspect);
    let shot;
    if (SHOT_WIDTHS.has(vp.width) && !vp.label) {
      shot = `shots/${vpLabel}${p === '/' ? '/index' : p}.png`;
      fs.mkdirSync(path.dirname(path.join(OUT, shot)), { recursive: true });
      await page.screenshot({ path: path.join(OUT, shot), fullPage: true });
    }
    results.push({ page: p, viewport: vpLabel, shot, ...r });
  }
  process.stdout.write(`${vpLabel} `);
}

// Cookie banner + mobile menu, checked on the home page at phone width.
const extra = [];
for (const lang of ['/', '/es']) {
  // New context each time: no stored cookie choice, so the banner shows.
  const fresh = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 375, height: 700 } });
  const p2 = await fresh.newPage();
  await p2.goto(BASE + lang, { waitUntil: 'networkidle' });
  const banner = await p2.evaluate(() => {
    const cb = document.getElementById('cb');
    const r = cb.getBoundingClientRect();
    return { visible: !cb.hidden, height: Math.round(r.height), viewport: innerHeight };
  });
  await p2.screenshot({ path: path.join(OUT, `shots/cookie-banner${lang === '/' ? '-en' : '-es'}.png`) });
  await p2.click('#cb [data-cb=none]');
  await p2.click('.burger');
  const menu = await p2.evaluate(() => {
    const m = document.getElementById('menu');
    return { open: !m.hidden, bodyLocked: document.body.style.overflow === 'hidden', scrollable: m.scrollHeight >= m.clientHeight };
  });
  await p2.screenshot({ path: path.join(OUT, `shots/menu${lang === '/' ? '-en' : '-es'}.png`) });
  extra.push({ page: lang, banner, menu });
  await fresh.close();
}
await browser.close();

const issues = results.filter((r) => r.overflow.length || r.textOverflow.length || r.small.length || r.smallFont.length);
const summary = {
  base: BASE,
  checked: results.length,
  pagesWithIssues: issues.length,
  overflow: results.reduce((n, r) => n + r.overflow.length, 0),
  textOverflow: results.reduce((n, r) => n + r.textOverflow.length, 0),
  smallTargets: results.reduce((n, r) => n + r.small.length, 0),
  tightTargets: results.reduce((n, r) => n + r.tight.length, 0),
  smallFontInputs: results.reduce((n, r) => n + r.smallFont.length, 0),
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ summary, extra, results }, null, 2));

// Distinct problems across pages/widths, so the report reads as a to-do list.
const distinct = (key) => {
  const map = new Map();
  for (const r of results)
    for (const item of r[key]) {
      const k = item.el.replace(/«.*»/, '').trim() + (key === 'small' || key === 'tight' ? ` ${item.w}×${item.h}` : '');
      const e = map.get(k) ?? { item, where: new Set() };
      e.where.add(`${r.page}@${r.viewport}`);
      map.set(k, e);
    }
  return [...map.entries()].sort((a, b) => b[1].where.size - a[1].where.size);
};
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const table = (title, key, fmt) => {
  const rows = distinct(key);
  return `<h2>${title} <small>(${rows.length})</small></h2>${
    rows.length
      ? `<table><tr><th>Element</th><th>Detail</th><th>Where (${'page@width'})</th></tr>${rows
          .map(([, e]) => `<tr><td>${esc(e.item.el)}</td><td>${esc(fmt(e.item))}</td><td>${[...e.where].slice(0, 12).join(', ')}${e.where.size > 12 ? ` … +${e.where.size - 12}` : ''}</td></tr>`)
          .join('')}</table>`
      : '<p>None.</p>'
  }`;
};
const shots = results.filter((r) => r.shot);
fs.writeFileSync(
  path.join(OUT, 'report.html'),
  `<!doctype html><meta charset="utf-8"><title>Responsive audit</title>
<style>body{font:14px system-ui;margin:24px;max-width:1400px}table{border-collapse:collapse;width:100%;margin-bottom:24px}td,th{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}th{background:#f6f6f6}.g{display:flex;flex-wrap:wrap;gap:12px}.g a{font-size:11px;width:150px}.g img{width:150px;height:240px;object-fit:cover;object-position:top;border:1px solid #ccc}</style>
<h1>Responsive audit</h1><p>${esc(BASE)} · ${summary.checked} page×width checks · ${new Date().toISOString()}</p>
<pre>${esc(JSON.stringify(summary, null, 2))}</pre>
${table('Horizontal overflow', 'overflow', (i) => `left ${i.left}, right ${i.right}`)}
${table('Text overflowing its box', 'textOverflow', (i) => `box ${i.box}px, content ${i.content}px`)}
${table('Tap targets under 24×24 (fail)', 'small', (i) => `${i.w}×${i.h}`)}
${table('Tap targets under 44×44 (warning)', 'tight', (i) => `${i.w}×${i.h}`)}
${table('Inputs under 16px', 'smallFont', (i) => i.size)}
<h2>Cookie banner and menu (375×700)</h2><pre>${esc(JSON.stringify(extra, null, 2))}</pre>
<h2>Screenshots</h2><div class="g">${shots.map((r) => `<a href="${r.shot}"><img src="${r.shot}" loading="lazy">${r.viewport} ${r.page}</a>`).join('')}</div>`,
);
console.log(`\n${JSON.stringify(summary)}\nReport: ${path.join(OUT, 'report.html')}`);
