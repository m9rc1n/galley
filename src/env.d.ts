// Stylesheets are bundled as plain strings (esbuild `text` loader) and injected into shadow roots.
declare module '*.css' {
  const css: string;
  export default css;
}

declare module 'markdown-it-footnote' {
  import type { MarkdownIt } from 'markdown-it';
  const footnote: (md: MarkdownIt) => void;
  export default footnote;
}

/** true in the local development build (`npm run dev`), false in release builds. */
declare const __GALLEY_DEV__: boolean;

/** Dev build only: the pages the content script runs on (from src/manifest.json). */
declare const __GALLEY_MATCHES__: string[];
