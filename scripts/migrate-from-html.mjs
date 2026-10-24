// One-off migration: turns the designer's static site (../html, 34 files in EN + ES) into
// Astro views and Keystatic content. Each EN/ES pair has the same markup and differs only in
// text, the en/es spans and a few attributes, so both files are walked side by side and merged
// into a single template where differing text becomes L("en", "es").
//
// Views and chrome components are only written when missing (they get hand edits afterwards);
// pass --force to regenerate them. Content and SEO data are always rewritten.
import fs from 'node:fs';
import path from 'node:path';
import Markdoc from '@markdoc/markdoc';
import * as cheerio from 'cheerio';
import yamlLib from 'js-yaml';
import TurndownService from 'turndown';

const HTML = path.resolve('../html');
const SRC = path.resolve('src');
const FORCE = process.argv.includes('--force');

const read = (f) => cheerio.load(fs.readFileSync(path.join(HTML, f), 'utf8'));
const write = (f, s, { always = true } = {}) => {
  const p = path.join(SRC, f);
  if (!always && !FORCE && fs.existsSync(p)) return console.log('skip  ', f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
  console.log('write ', f);
};
const copy = (from, to) => {
  const p = path.join(SRC, to);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.copyFileSync(path.join(HTML, from), p);
};

/* ---------- EN/ES merge ---------- */

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const J = JSON.stringify;
const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const isLocalTwin = (en, es) => es === (en === '/' ? '/es' : `/es${en}`) || es === `/es${en}`;

function mergeAttrs(a, b) {
  let out = '';
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[n];
    const y = b[n];
    if (x === y) out += x === '' ? ` ${n}` : ` ${n}="${escAttr(x)}"`;
    else if (n === 'class' && x === 'en' && y === 'es') out += ' class={lang}';
    else if ((n === 'href' || n === 'data-href') && x && y && isLocalTwin(x, y)) out += ` ${n}={u(${J(x)})}`;
    else if (n === 'lang' && x === 'en' && y === 'es') out += ' lang={lang}';
    else out += ` ${n}={L(${J(x ?? '')}, ${J(y ?? '')})}`;
  }
  return out;
}

function mergeNode(a, b, ctx) {
  if (a.type !== b.type) return null;
  if (a.type === 'text') return a.data === b.data ? escText(a.data) : `{L(${J(a.data)}, ${J(b.data)})}`;
  if (a.name !== b.name) return null;
  const hook = ctx.replace?.(a, b);
  if (hook != null) return hook;
  const open = `<${a.name}${mergeAttrs(a.attribs, b.attribs)}`;
  if (VOID.has(a.name)) return `${open} />`;
  if (a.type === 'script' || a.type === 'style') return `${open} is:inline>${cheerio.load('').html(a.children)}</${a.name}>`;
  return `${open}>${mergeChildren(a.children, b.children, ctx)}</${a.name}>`;
}

function mergeChildren(as, bs, ctx) {
  const A = as.filter((n) => n.type !== 'comment');
  const B = bs.filter((n) => n.type !== 'comment');
  if (A.length === B.length) {
    const parts = A.map((n, i) => mergeNode(n, B[i], ctx));
    if (parts.every((p) => p !== null)) return parts.join('');
  }
  const $ = cheerio.load('');
  ctx.fallbacks = (ctx.fallbacks || 0) + 1;
  return `<Fragment set:html={L(${J($.html(A))}, ${J($.html(B))})} />`;
}

/* ---------- views ---------- */

const PAGES = [
  { route: 'home', file: 'index.html', view: 'Home', path: '/' },
  { route: 'about', file: 'about.html', view: 'About', path: '/about' },
  { route: 'events', file: 'events.html', view: 'Events', path: '/events' },
  { route: 'membership', file: 'membership.html', view: 'Membership', path: '/membership' },
  { route: 'partners', file: 'partners.html', view: 'Partners', path: '/partners' },
  { route: 'blog', file: 'blog.html', view: 'Blog', path: '/blog' },
  { route: 'privacy', file: 'privacy.html', view: 'Privacy', path: '/privacy' },
  { route: 'legal', file: 'legal.html', view: 'Legal', path: '/legal' },
  { route: 'cookies', file: 'cookies.html', view: 'Cookies', path: '/cookies' },
];

// Sections fed by Keystatic content are swapped for components.
function dynamicSections($) {
  return (a) => {
    const el = $(a);
    if (el.is('div.frame')) return '<NextEvent lang={lang} />';
    if (el.is('div.posters.three')) return '<PastEvents lang={lang} />';
    if (el.is('div.plist')) return '<PostList lang={lang} />';
    if (el.is('section') && el.find('article.ev').length) return '<ThisMonth lang={lang} />';
    return null;
  };
}

const COMPONENTS = {
  NextEvent: "import NextEvent from '../components/events/NextEvent.astro';",
  PastEvents: "import PastEvents from '../components/events/PastEvents.astro';",
  ThisMonth: "import ThisMonth from '../components/events/ThisMonth.astro';",
  PostList: "import PostList from '../components/blog/PostList.astro';",
};

function viewFile({ file, route }, body) {
  const imports = Object.entries(COMPONENTS)
    .filter(([name]) => body.includes(`<${name} `))
    .map(([, line]) => line);
  return `---
// Generated from html/${file} + html/es/${file} by scripts/migrate-from-html.mjs.
import Base from '../layouts/Base.astro';
${imports.join('\n')}${imports.length ? '\n' : ''}import { localize, type Lang } from '../i18n';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const { L, u } = localize(lang);
---

<Base lang={lang} route="${route}">
${body.trim()}
</Base>
`;
}

const seo = {};

for (const page of PAGES) {
  const en = read(page.file);
  const es = read(`es/${page.file}`);
  const ctx = { replace: dynamicSections(en) };
  const body = mergeChildren(en('main').get(0).children, es('main').get(0).children, ctx);
  if (ctx.fallbacks) console.warn(`  ${page.file}: ${ctx.fallbacks} block(s) kept as per-language HTML`);
  write(`views/${page.view}.astro`, viewFile(page, body), { always: false });
  seo[page.route] = { path: page.path, en: headSeo(en), es: headSeo(es) };
}

const notFound = read('404.html');
seo['404'] = { path: '/', en: headSeo(notFound), es: headSeo(notFound) };
write('data/seo.json', `${JSON.stringify(seo, null, 2)}\n`);

function headSeo($) {
  return {
    title: $('title').text(),
    description: $('meta[name=description]').attr('content'),
    ogType: $('meta[property="og:type"]').attr('content'),
    jsonLd: JSON.parse($('script[type="application/ld+json"]').html()),
  };
}

/* ---------- chrome: header, menu, footer, cookie banner, sticky CTA ---------- */

{
  const en = read('index.html');
  const es = read('es/index.html');
  const piece = (sel) => mergeNode(en(sel).get(0), es(sel).get(0), {});
  const component = (name, markup) => `---
// Generated from html/index.html + html/es/index.html by scripts/migrate-from-html.mjs.
import { localize, type Lang } from '../../i18n';

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const { L, u } = localize(lang);
---

${markup}
`;
  write('components/chrome/Header.astro', component('Header', [piece('a.skip'), piece('header.hdr'), piece('#menu')].join('\n')), { always: false });
  write('components/chrome/Footer.astro', component('Footer', piece('footer')), { always: false });
  write('components/chrome/CookieBanner.astro', component('CookieBanner', piece('#cb')), { always: false });
  write('components/chrome/StickyCta.astro', component('StickyCta', piece('#sticky')), { always: false });
}

/* ---------- content: authors ---------- */

// Written exactly as Keystatic writes it (js-yaml, core schema, empty fields left out, keys in
// schema order), so the first edit in the panel does not reformat the whole file.
const ORDER = {
  posts: ['title', 'titleEs', 'excerptEn', 'excerptEs', 'author', 'publishedAt'],
  events: ['title', 'date', 'startTime', 'endTime', 'language', 'venue', 'host', 'hostRoleEn', 'hostRoleEs', 'topicEn', 'topicEs', 'meetupUrl', 'lumaUrl', 'poster', 'posterAlt', 'instagramUrl'],
  authors: ['name', 'roleEn', 'roleEs', 'photo'],
  settings: ['email', 'emailSecondary', 'instagram', 'linkedin', 'meetup', 'luma'],
};
const yaml = (kind, obj) => {
  const entries = ORDER[kind].filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '').map((k) => [k, obj[k]]);
  return yamlLib.dump(Object.fromEntries(entries), { schema: yamlLib.CORE_SCHEMA });
};

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const AUTHORS = {
  'Sophia Gruner': { slug: 'sophia-gruner', photo: 'founder-sophia.jpg' },
  'Agnieszka Fronia': { slug: 'agnieszka-fronia', photo: 'founder-agnieszka.jpg' },
};

/* ---------- content: posts ---------- */

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*' });
turndown.addRule('callout', {
  filter: (n) => n.nodeName === 'ASIDE' && n.classList.contains('callout'),
  replacement: (content) => `\n\n{% callout %}\n${content.trim()}\n{% /callout %}\n\n`,
});
turndown.addRule('checklist', {
  filter: (n) => n.nodeName === 'UL' && n.classList.contains('ckl'),
  replacement: (content) => `\n\n{% checklist %}\n${content.trim()}\n{% /checklist %}\n\n`,
});
turndown.addRule('sources', {
  filter: (n) => n.nodeName === 'DIV' && n.classList.contains('srcs'),
  replacement: (content) => `\n\n{% sources %}\n${content.trim()}\n{% /sources %}\n\n`,
});
turndown.addRule('sourcesLabel', {
  filter: (n) => n.nodeName === 'P' && n.classList.contains('lab'),
  replacement: () => '',
});
turndown.remove(['svg']);

// article.post holds the text (div.en / div.es) followed by div.srcs and div.byline as siblings.
// The byline is rebuilt from the author, so it is left out. Markdoc.format gives the same
// layout Keystatic saves, so the first edit in the panel only shows the real change.
const toMarkdoc = ($) => {
  const html = $('article.post')
    .children()
    .not('div.byline')
    .map((_, c) => ($(c).is('div.en, div.es') ? $(c).html() : $.html(c)))
    .get()
    .join('');
  return Markdoc.format(Markdoc.parse(turndown.turndown(html)));
};

const blogEn = read('blog.html');
const blogEs = read('es/blog.html');
const rowsEs = blogEs('a.prow').toArray();
// The current site has no publish dates. Provisional dates keep the existing order (newest first)
// until the owners send the real ones; they can change them in the panel.
const provisionalDate = (i) => new Date(Date.UTC(2026, 9, 1 - i * 7)).toISOString().slice(0, 10);

blogEn('a.prow').each((i, row) => {
  const slug = blogEn(row).attr('href').split('/').pop();
  const author = blogEn(row).find('.lab').contents().first().text().trim();
  const en = read(`blog/${slug}.html`);
  const es = read(`es/blog/${slug}.html`);
  const dir = `content/posts/${slug}`;
  write(
    `${dir}/index.yaml`,
    yaml('posts', {
      title: en('section.post-head h1').text().trim(),
      titleEs: es('section.post-head h1').text().trim(),
      excerptEn: blogEn(row).find('p').text().trim(),
      excerptEs: blogEs(rowsEs[i]).find('p').text().trim(),
      author: AUTHORS[author].slug,
      publishedAt: provisionalDate(i),
    }),
  );
  write(`${dir}/bodyEn.mdoc`, toMarkdoc(en));
  write(`${dir}/bodyEs.mdoc`, toMarkdoc(es));
});

for (const [name, { slug, photo }] of Object.entries(AUTHORS)) {
  const findByline = (dirName) => {
    for (const f of fs.readdirSync(path.join(HTML, dirName))) {
      const $ = read(`${dirName}/${f}`);
      if ($('div.byline p.nm').text().trim() === name) return $('div.byline p.lab').last().text().trim();
    }
  };
  copy(`assets/${photo}`, `assets/team/${slug}/photo.jpg`);
  write(
    `content/authors/${slug}.yaml`,
    yaml('authors', { name, roleEn: findByline('blog'), roleEs: findByline('es/blog'), photo: `/src/assets/team/${slug}/photo.jpg` }),
  );
}

/* ---------- content: events ---------- */

{
  const en = read('events.html');
  const es = read('es/events.html');
  const LANGS = { ESP: 'es', ENG: 'en', 'ENG + ESP': 'both' };
  const frameEn = en('div.frame');
  const frameEs = es('div.frame');
  const posters = en('.posters.three figure').toArray();

  en('article.ev.show').each((i, row) => {
    const r = en(row);
    const title = r.find('h3').text().trim();
    const [hostOrNote, venue] = r.find('p').first().html().split(/<br\s*\/?>/i).map((s) => cheerio.load(s).text().trim());
    const isCommunity = r.find('p span.en').length > 0;
    const [startTime, endTime] = r.find('.tags .pill').first().text().split('–');
    const slug = `${r.attr('data-date')}-${slugify(title)}`;
    const featured = frameEn.find('h3').text().trim() === title;
    const poster = posters.find((f) => en(f).find('figcaption').text().replace('↗', '').trim().startsWith(title.split(' ')[0]));

    const data = {
      title,
      date: r.attr('data-date'),
      startTime,
      endTime,
      language: LANGS[r.find('.tags .pill').eq(1).text().trim()],
      venue,
      host: isCommunity ? undefined : hostOrNote,
    };
    if (featured) {
      const [topicEn, roleEn] = [frameEn.find('.who span.en').first().text(), frameEn.find('.who span.en').last().text()];
      const [topicEs, roleEs] = [frameEs.find('.who span.es').first().text(), frameEs.find('.who span.es').last().text()];
      Object.assign(data, {
        topicEn,
        topicEs,
        hostRoleEn: roleEn,
        hostRoleEs: roleEs,
        meetupUrl: frameEn.find('a.btn').eq(0).attr('href'),
        lumaUrl: frameEn.find('a.btn').eq(1).attr('href'),
      });
    }
    if (poster) {
      const img = en(poster).find('img');
      const alt = img.attr('alt').replace(/^Event poster: /, '');
      copy(img.attr('src').slice(1), `assets/events/${slug}/poster.jpg`);
      Object.assign(data, {
        poster: `/src/assets/events/${slug}/poster.jpg`,
        // Only keep the alt text when it says more than the default "<title> with <host>".
        posterAlt: alt === `${title} with ${data.host}` ? undefined : alt,
        instagramUrl: en(poster).find('a').attr('href'),
      });
    }
    write(`content/events/${slug}.yaml`, yaml('events', data));
  });
}

/* ---------- content: site settings ---------- */

{
  const $ = read('index.html');
  const foot = (re) => $('footer a').filter((_, a) => re.test($(a).attr('href'))).first().attr('href');
  write(
    'content/settings.yaml',
    yaml('settings', {
      email: 'agnieszka@shewins.es',
      emailSecondary: 'sophia@shewins.es',
      instagram: foot(/instagram\.com/),
      linkedin: foot(/linkedin\.com/),
      meetup: foot(/meetup\.com/),
      luma: 'https://luma.com/user/SheWins',
    }),
  );
}
