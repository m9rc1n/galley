// Built as a separate local ESM asset and loaded only when code is on screen; never fetched from a CDN.
import hljs from 'highlight.js/lib/common';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

hljs.registerLanguage('dockerfile', dockerfile);

/** Highlighted HTML (escaped text and <span class="hljs-…">), or null for an unknown language. */
export function highlight(code: string, language: string): string | null {
  if (!hljs.getLanguage(language)) return null;
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}
