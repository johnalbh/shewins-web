// Checks the build against the designer's static site: for each of the 34 original pages,
// compares the SEO head tags and the visible text of <main>. Run after `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const ORIGINAL = path.resolve('../html');
const BUILT = path.resolve('.vercel/output/static');
const builtFile = (rel) => {
  const base = rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1');
  return path.join(BUILT, base === '' ? 'index.html' : base.endsWith('/') ? `${base}index.html` : `${base}/index.html`);
};

const pages = ['', 'es/']
  .flatMap((dir) => [
    ...['index', 'about', 'events', 'membership', 'partners', 'blog', 'privacy', 'legal', 'cookies'].map((p) => `${dir}${p}.html`),
    ...fs.readdirSync(path.join(ORIGINAL, `${dir}blog`)).map((f) => `${dir}blog/${f}`),
  ]);

// The head is compared on what fixes the site's URL structure: canonical, language twins, og:url
// and type, <html lang> and the body route. Titles, descriptions and the JSON-LD were rewritten
// on purpose in the SEO work of November 2026 (src/data/seo.json, src/lib/seo.ts), so they are
// not expected to match the original files any more.
const head = ($) => ({
  canonical: $('link[rel=canonical]').attr('href'),
  hreflang: $('link[rel=alternate][hreflang]').map((_, l) => `${l.attribs.hreflang}=${l.attribs.href}`).get().join(' '),
  og: $('meta[property="og:url"], meta[property="og:type"]').map((_, m) => `${m.attribs.property}=${m.attribs.content}`).get().join(' | '),
  lang: $('html').attr('lang'),
  route: $('body').attr('data-route'),
});
// Visible text; block boundaries count as a space (line breaks between </p><p> do not render),
// inline spacing is compared as it is.
const BLOCKS = 'p,li,h1,h2,h3,h4,h5,h6,div,section,article,aside,blockquote,ul,ol,figure,figcaption,header,footer,nav,br,small';
const text = ($, sel) => {
  const el = $(sel).clone();
  el.find(BLOCKS).each((_, b) => {
    $(b).before(' ').after(' ');
  });
  // The original used the characters → and × as icons; they are drawn SVG now (DESIGN.md).
  return el.text().replace(/[→×]/g, '').replace(/\s+/g, ' ').trim();
};

let problems = 0;
for (const rel of pages) {
  const a = cheerio.load(fs.readFileSync(path.join(ORIGINAL, rel), 'utf8'));
  const file = builtFile(rel);
  if (!fs.existsSync(file)) {
    console.log(`✗ ${rel}: missing ${path.relative(BUILT, file)}`);
    problems++;
    continue;
  }
  const b = cheerio.load(fs.readFileSync(file, 'utf8'));
  const ha = head(a);
  const hb = head(b);
  const diffs = Object.keys(ha).filter((k) => ha[k] !== hb[k]);
  for (const sel of ['main', 'header.hdr', '#menu', 'footer']) if (text(a, sel) !== text(b, sel)) diffs.push(sel);
  if (diffs.length) {
    problems++;
    console.log(`✗ ${rel}`);
    for (const k of diffs) {
      const [x, y] = k in ha ? [ha[k], hb[k]] : [text(a, k), text(b, k)];
      let i = 0;
      while (i < x.length && x[i] === y[i]) i++;
      console.log(`    ${k}: original «…${x.slice(Math.max(0, i - 40), i + 80)}»\n    ${' '.repeat(k.length)}  built    «…${y.slice(Math.max(0, i - 40), i + 80)}»`);
    }
  } else console.log(`✓ ${rel}`);
}
console.log(problems ? `\n${problems} page(s) differ` : '\nAll pages match');
process.exit(problems ? 1 : 0);
