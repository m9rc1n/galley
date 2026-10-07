import type { DocStatus } from '../platforms/types.ts';
import { type RenderedDoc, type RenderInput, renderDocument } from '../ui/render.ts';

export const REPO_LINKS = { raw: (path: string) => `/raw/${path}`, blob: (path: string) => `/blob/${path}` };

/**
 * Render two versions of a markdown document the way the reader does, in the test's DOM
 * (use it in a file that runs in the jsdom environment).
 */
export function renderMarkdown(base: string, head: string, status: DocStatus = 'modified', overrides: Partial<RenderInput> = {}): RenderedDoc {
  return renderDocument(document, { path: 'docs/a.md', status, base, head, links: REPO_LINKS, origin: 'https://gitlab.example', ...overrides });
}
