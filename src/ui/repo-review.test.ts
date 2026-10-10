import { expect, it, vi } from 'vitest';
import { handbook, listing, repoHarness, repository, words } from '../testing/repo.ts';
import { readConfig } from './config-frame.ts';
import type { ReviewContext } from './repo-reader.ts';

const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn(), highlightCode: vi.fn(async () => {}) }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));
vi.mock('./code.ts', async (original) => ({ ...(await original<typeof import('./code.ts')>()), highlightCode: drawn.highlightCode }));
const frame = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('./configs.ts', () => ({ readConfiguration: frame.read }));
frame.read.mockImplementation(async (_host: unknown, path: string, format: Parameters<typeof readConfig>[1], text: string) => readConfig(path, format, text));

const ui = repoHarness();
const spec = 'docs/specs/reading.md';
const decision = 'docs/adr/0001-use-markdown.md';
const files: Record<string, string> = {
  ...handbook,
  'docs/architecture/rendering.md': '# Rendering\n\nThe [renderer](../../src/render.ts) draws documents. See [the spec](../specs/reading.md).',
  'NOTES.md': '# Field notes\n\nWatch [render.ts](src/render.ts).\n\nAnd [](src/render.ts).',
  'docker-compose.yml': 'services:\n  web:\n    image: shop/web\n',
};
const review: ReviewContext = {
  title: 'Fix rendering',
  revision: 'head',
  ref: 'feature/render',
  chapters: [
    { title: 'Reading', paths: [spec, decision] },
    { title: 'Code', paths: ['src/render.ts', 'docker-compose.yml'] },
  ],
};

it('a repository read on its own has no review view', async () => {
  await ui.open(repository());
  expect(ui.q('[data-view="review"]').hidden).toBe(true);
  expect(ui.q('[data-act="close"]').title).toBe('Close reader (Esc)');
});

it('opened from a review, the reader starts at what it changes: each file with the documents that link to it, flagged and never judged', async () => {
  const onClose = vi.fn();
  await ui.open(repository(files, { pinned: true }), { review, onClose });
  expect(ui.q('[data-view="review"]').hidden).toBe(false);
  expect(ui.q('[data-view="review"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.q('[data-act="close"]').getAttribute('aria-label')).toBe('Back to the review (Esc)');
  await vi.waitFor(() => expect(ui.q('.mr-review-status .mr-map-status').textContent).toMatch(/^Built from all 5 documents/));
  expect(ui.text('.mr-review-context .mr-subtitle')).toBe(
    'Reading the repository at its head, feature/render @ c0ffee1 for “Fix rendering”. Documents that link to the files this review changes are listed with the link that connects them. Galley says what is worth checking; it never says a document is wrong.',
  );
  const files_ = ui.all('.mr-review-file').map(words);
  expect(ui.all('.mr-review-chapter > h2').map((h) => h.textContent)).toStrictEqual(['Reading', 'Code']);
  expect(files_).toStrictEqual([
    `${spec} Changed document ADR 1: Use Markdown Decision Changed in this review the spec line 9 Rendering Architecture Worth checking: it links to a file this review changes the spec line 3`,
    `${decision} Changed document Reading Spec Changed in this review the decision line 10 Handbook Overview Worth checking: it links to a file this review changes the decision line 3`,
    'src/render.ts Field notes Worth checking: it links to a file this review changes render.ts line 3 src/render.ts line 5 Rendering Architecture Worth checking: it links to a file this review changes renderer line 3',
    'docker-compose.yml No document read so far links here.',
  ]);
  // Changed is a change, in the change colour; worth checking is a plain fact, without one.
  const chips = (start: string) =>
    new Set(
      ui
        .all('.mr-review-file .mr-chip')
        .filter((c) => c.textContent!.startsWith(start))
        .map((c) => c.className),
    );
  expect(chips('Changed')).toStrictEqual(new Set(['mr-chip is-modified']));
  expect(chips('Worth checking')).toStrictEqual(new Set(['mr-chip']));
  // A changed configuration file says what it declares once configuration is read.
  ui.press('Read configuration', '.mr-review-status button');
  await vi.waitFor(() => expect(words(ui.all('.mr-review-file')[3])).toBe('docker-compose.yml Declares web. No document read so far links here.'));

  // Evidence opens at its line, and the changed document is flagged where it is read, listed and mapped.
  ui.press('renderer line 3', '.mr-review-file button');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Rendering');
  ui.click('[data-view="review"]');
  ui.press(spec, '.mr-review-path button');
  await ui.settled();
  expect(ui.text('.mr-file-meta')).toContain('Changed in this review');
  ui.click('[data-act="docs"]');
  expect(ui.all('.mr-repo-outline [data-path] .mr-chip.is-modified').map((f) => f.closest('button')!.dataset.path)).toStrictEqual([decision, spec]);
  ui.click('[data-view="map"]');
  expect(ui.text('.mr-map-facts')).toBe('Spec Changed in this review');

  ui.key('Escape');
  expect(onClose).toHaveBeenCalled();
});

it('Read, before any document is open, opens the repository where it starts', async () => {
  await ui.open(repository(files), { review });
  await vi.waitFor(() => expect(ui.all('.mr-review-file').length).toBe(4));
  ui.click('[data-view="read"]');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Handbook');
});

it('a listing that fails in the review view can be tried again', async () => {
  const source = repository(files);
  vi.mocked(source.discover).mockRejectedValueOnce(new Error('offline'));
  await ui.open(source, { review });
  await vi.waitFor(() => expect(ui.text('.mr-repo-review .mr-message h2')).toBe('Galley could not read this.'));
  expect(ui.text('.mr-repo-review .mr-message p')).toBe('offline');
  ui.press('Try again', '.mr-repo-review button');
  await vi.waitFor(() => expect(ui.all('.mr-review-file')).toHaveLength(4));
});

it('a listing that fails after the reader left the review view stays quiet there', async () => {
  const source = repository(files);
  let fail!: (err: Error) => void;
  vi.mocked(source.discover).mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
  await ui.open(source, { review });
  ui.click('[data-view="notes"]');
  fail(new Error('offline'));
  await vi.waitFor(() => expect(source.discover).toHaveBeenCalledTimes(2));
  expect(ui.q('.mr-repo-review .mr-message')).toBe(null);
});

it('a review that changes no configuration does not offer to read it', async () => {
  await ui.open(repository(files, { discover: vi.fn(async () => listing(Object.keys(files).filter((p) => p.endsWith('.md')))) }), {
    review: { ...review, chapters: [{ title: 'Reading', paths: [spec] }] },
  });
  await vi.waitFor(() => expect(ui.all('.mr-review-file')).toHaveLength(1));
  expect(ui.all('.mr-review-status .mr-lens-configs')).toHaveLength(0);
});

it('a newer commit redraws the review view from the new snapshot', async () => {
  const next = repository(files, { commit: 'beef000000000000000000000000000000000000' });
  await ui.open(repository(files, { refresh: vi.fn(async () => next) }), { review });
  await vi.waitFor(() => expect(ui.q('.mr-review-status .mr-map-status').textContent).toMatch(/^Built from all/));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.q('.mr-review-status .mr-map-status').textContent).toMatch(/at beef000/));
  expect(ui.text('.mr-review-context .mr-subtitle')).toContain('feature/render @ beef000');
});
