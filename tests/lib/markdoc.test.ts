import Markdoc from '@markdoc/markdoc';
import { describe, expect, it } from 'vitest';
import { renderMarkdoc } from '../../src/lib/markdoc';

const render = (source: string, lang: 'en' | 'es' = 'en') => renderMarkdoc(Markdoc.parse(source), lang);

describe('renderMarkdoc', () => {
  it('renders the body without an <article> wrapper', () => {
    expect(render('Hello.')).toBe('<p>Hello.</p>');
  });

  it('makes every quote a pull quote, without an inner paragraph', () => {
    expect(render('> Done is better than perfect.')).toBe('<blockquote class="pull">Done is better than perfect.</blockquote>');
  });

  it('opens external links in a new tab, internal ones in place', () => {
    expect(render('[Meetup](https://www.meetup.com/)')).toBe(
      '<p><a href="https://www.meetup.com/" rel="noopener" target="_blank">Meetup</a></p>',
    );
    expect(render('[Letter](/letter)')).toBe('<p><a href="/letter">Letter</a></p>');
  });

  it('keeps a link title only when the author wrote one', () => {
    expect(render('[Letter](/letter "The Letter")')).toBe('<p><a href="/letter" title="The Letter">Letter</a></p>');
  });

  // Markdoc writes attribute names in lower case; the HTML parser restores viewBox on <svg>.
  it('renders the brand blocks', () => {
    expect(render('{% callout %}\nJoin us.\n{% /callout %}')).toBe('<aside class="callout"><p>Join us.</p></aside>');
    expect(render('{% checklist %}\n- One\n- Two\n{% /checklist %}')).toBe(
      '<ul class="ckl"><li><svg aria-hidden="true" viewbox="0 0 40 32"><path d="M4 18 L15 28 L36 4"></path></svg>One</li><li><svg aria-hidden="true" viewbox="0 0 40 32"><path d="M4 18 L15 28 L36 4"></path></svg>Two</li></ul>',
    );
  });

  it('labels the sources in the page language', () => {
    expect(render('{% sources %}\n- A\n{% /sources %}', 'es')).toBe(
      '<div class="srcs"><p class="lab"><span class="es">Fuentes</span></p><ul><li>A</li></ul></div>',
    );
    expect(render('{% sources %}\n- A\n{% /sources %}', 'en')).toContain('<span class="en">Sources</span>');
  });
});
