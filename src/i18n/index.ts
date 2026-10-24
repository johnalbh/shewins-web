export type Lang = 'en' | 'es';

export const SITE = 'https://www.shewins.es';

/** Path of a page in the other language: "/about" ↔ "/es/about", "/" ↔ "/es". */
export function localePath(path: string, lang: Lang) {
  if (lang === 'en') return path;
  return path === '/' ? '/es' : `/es${path}`;
}

export function alternatesFor(enPath: string) {
  return { en: enPath, es: localePath(enPath, 'es') };
}

/**
 * Helpers used by every view: L picks the text for the current language,
 * u turns an English path into the path for the current language.
 */
export function localize(lang: Lang) {
  return {
    L: <T>(en: T, es: T) => (lang === 'es' ? es : en),
    u: (path: string) => localePath(path, lang),
  };
}
