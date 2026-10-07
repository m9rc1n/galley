import sans from './fonts/dm-sans-latin.woff2';
import italic from './fonts/newsreader-italic-latin.woff2';
import serif from './fonts/newsreader-latin.woff2';

const registered = new WeakSet<Document>();

/** Register bundled fonts on the document: shadow-root @font-face rules are not portable.
 * Binary sources avoid network requests and work even under the host page's font-src policy.
 * Names are scoped to Galley so a page's own Newsreader font cannot replace ours. */
export function loadReaderFonts(doc: Document): void {
  if (typeof FontFace === 'undefined' || !doc.fonts || registered.has(doc)) return;
  registered.add(doc);
  for (const [family, source, style, weight] of [
    ['Galley Newsreader', serif, 'normal', '400 600'],
    ['Galley Newsreader', italic, 'italic', '400 600'],
    ['Galley DM Sans', sans, 'normal', '400 700'],
  ] as const) {
    const face = new FontFace(family, source, { style, weight, display: 'swap' });
    doc.fonts.add(face);
    // Keep system fallbacks usable if a browser cannot decode a bundled font.
    void face.load().catch(() => doc.fonts.delete(face));
  }
}
