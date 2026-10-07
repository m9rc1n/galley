// highlight.js, inside the sandboxed highlight-frame.html (see sandbox.ts). Some grammars take time
// quadratic in the input, so a hostile file could otherwise freeze the review page; here the reader's
// watchdog simply discards the frame. Replies are untrusted: code.ts rebuilds them from text and
// token classes only.
import hljs from 'highlight.js/lib/common';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import { listen, serve } from './sandbox-frame.ts';

hljs.registerLanguage('dockerfile', dockerfile);

export interface HighlightRequest {
  id: number;
  code: string;
  language: string;
}

/** Matches the reader's limit; the frame repeats it rather than trusting the request. */
const MAX_SOURCE = 300_000;

/** Highlighted HTML (escaped text and <span class="hljs-…">), or null for an unknown language. */
export function highlight(code: string, language: string): string | null {
  if (!hljs.getLanguage(language)) return null;
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}

export function isRequest(data: unknown): data is HighlightRequest {
  const request = data as Partial<HighlightRequest> | null;
  return typeof request?.id === 'number' && typeof request.code === 'string' && request.code.length <= MAX_SOURCE && typeof request.language === 'string';
}

export function serveHighlights(port: MessagePort): void {
  serve(port, isRequest, async ({ code, language }) => ({ html: highlight(code, language) }));
}

listen(serveHighlights);
