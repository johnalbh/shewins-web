import Markdoc, { type Node, type Config, type RenderableTreeNode } from '@markdoc/markdoc';
import type { Lang } from '../i18n';

// @markdoc/markdoc is CommonJS: named runtime exports are only on the default import.
// Same version as the one Keystatic parses with (see package.json), so the trees match.
const { Tag } = Markdoc;
type Tag = InstanceType<typeof Tag>;
const isTag = (c: RenderableTreeNode, name?: string): c is Tag => Tag.isTag(c) && (!name || c.name === name);

const TICK = new Tag('svg', { 'aria-hidden': 'true', viewBox: '0 0 40 32' }, [new Tag('path', { d: 'M4 18 L15 28 L36 4' }, [])]);

// Markdown wraps text in <p> inside quotes and loose list items; the design expects the text directly.
const unwrap = (children: RenderableTreeNode[]) => children.flatMap((c) => (isTag(c, 'p') ? c.children : [c]));

function config(lang: Lang): Config {
  return {
    nodes: {
      // Every quote in the articles is a pull quote.
      blockquote: {
        transform: (node, cfg) => new Tag('blockquote', { class: 'pull' }, unwrap(node.transformChildren(cfg))),
      },
      link: {
        attributes: { href: { type: String }, title: { type: String } },
        transform(node, cfg) {
          const { href, title } = node.transformAttributes(cfg);
          const external = /^https?:\/\//.test(href);
          return new Tag('a', { href, title, ...(external ? { rel: 'noopener', target: '_blank' } : {}) }, node.transformChildren(cfg));
        },
      },
    },
    tags: {
      callout: { transform: (node, cfg) => new Tag('aside', { class: 'callout' }, node.transformChildren(cfg)) },
      checklist: {
        transform(node, cfg) {
          const items = node
            .transformChildren(cfg)
            .filter((c) => isTag(c, 'ul'))
            .flatMap((ul) => (ul as Tag).children.filter((li) => isTag(li, 'li')));
          return new Tag('ul', { class: 'ckl' }, items.map((li) => new Tag('li', {}, [TICK, ...unwrap((li as Tag).children)])));
        },
      },
      sources: {
        transform(node, cfg) {
          const label = new Tag('p', { class: 'lab' }, [new Tag('span', { class: lang }, [lang === 'es' ? 'Fuentes' : 'Sources'])]);
          return new Tag('div', { class: 'srcs' }, [label, ...node.transformChildren(cfg)]);
        },
      },
    },
  };
}

export function renderMarkdoc(node: Node, lang: Lang) {
  const tree = Markdoc.transform(node, config(lang));
  // Markdoc wraps the document in <article>; the page already has article.post around it.
  return Markdoc.renderers.html(isTag(tree, 'article') ? tree.children : tree);
}
