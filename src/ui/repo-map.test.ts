import { expect, it, vi } from 'vitest';
import { INDEX_BATCH } from '../core/docindex.ts';
import { MAX_DOCUMENT_CHARS } from '../core/limits.ts';
import { ReaderError } from '../platforms/types.ts';
import { deferred } from '../testing/reader.ts';
import { handbook, repoHarness, repository, words } from '../testing/repo.ts';

const drawn = vi.hoisted(() => ({ renderDiagrams: vi.fn(), highlightCode: vi.fn(async () => {}) }));
vi.mock('./diagrams.ts', async (original) => ({ ...(await original<typeof import('./diagrams.ts')>()), renderDiagrams: drawn.renderDiagrams }));
vi.mock('./code.ts', async (original) => ({ ...(await original<typeof import('./code.ts')>()), highlightCode: drawn.highlightCode }));

const ui = repoHarness();
const decision = 'docs/adr/0001-use-markdown.md';
const showMap = async () => {
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.q('.mr-map-status').textContent).toMatch(/^Built from all/));
};

it('the map shows one document, what links to it and what it links to, each with the links as evidence', async () => {
  await ui.open(repository(handbook, { start: { path: decision, folder: false } }));
  await showMap();
  expect(ui.q('.mr-repo-read').hidden).toBe(true);
  expect(ui.q('[data-view="map"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.text('.mr-map-status')).toBe('Built from all 3 documents at c0ffee1.');
  expect(ui.text('.mr-map-title')).toBe('ADR 1: Use Markdown');
  expect(ui.text('.mr-map-crumbs')).toBe('In docs/adr/');
  expect(ui.text('.mr-map-facts')).toBe('Decision Accepted');
  expect(ui.q('.mr-map-facts .mr-repo-kind').title).toBe('Decision, guessed from its path');
  const [from, to] = ui.all('.mr-map-col');
  expect(from.querySelector('h3')!.textContent).toBe('Linked from (2)');
  expect([...from.querySelectorAll('.mr-repo-edge')].map(words)).toStrictEqual([
    'Handbook Overview the decision in “Handbook”, line 3',
    'Reading Spec the decision in “Goals”, line 10',
  ]);
  expect(to.querySelector('h3')!.textContent).toBe('Links to (2)');
  // Every connection opens its evidence in the reader, at the paragraph that holds the link.
  ui.press('in “Goals”, line 10', '.mr-repo-proof');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Reading');
  expect(ui.all('.mr-content p').find((p) => p.textContent === 'Read the decision.')!.classList).toContain('mr-repo-flash');
  // Back in the map, a neighbour becomes the middle.
  ui.click('[data-view="map"]');
  expect(ui.text('.mr-map-title')).toBe('Reading');
  ui.press('ADR 1: Use Markdown', '.mr-repo-map .mr-repo-edge-doc');
  expect(ui.text('.mr-map-title')).toBe('ADR 1: Use Markdown');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-map-title'));
  ui.press('Read', '.mr-map-center button');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('ADR 1: Use Markdown');
  // Backlinks below the document come from the same index.
  expect(ui.text('.mr-repo-backlinks')).toContain('Handbook');
  expect(ui.all('.mr-repo-backlinks .mr-repo-edge-doc').map((b) => b.dataset.act)).toStrictEqual(['open', 'open']);
  ui.press('Handbook', '.mr-repo-backlinks .mr-repo-edge-doc');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Handbook');
  expect(ui.text('.mr-repo-backlinks')).toBe('Linked from ADR 1: Use Markdown Decision the README in “Context”, line 9');
});

it('links the map cannot follow are listed with the link that makes them', async () => {
  const files = {
    'a.md': '# A\n\n[gone](gone.md), [no section](b.md#nope), [fine](b.md#here), [section](#also-missing)',
    'b.md': '# B\n\n## Here\n\nok',
  };
  const source = repository(files, { start: { path: 'a.md', folder: false } });
  await ui.open(source);
  await showMap();
  expect(ui.all('.mr-map-problems li').map(words)).toStrictEqual([
    'gone line 3: gone.md is not among the listed documents.',
    'no section line 3: “nope” is not a section of b.md.',
    'section line 3: “also-missing” is not a section of a.md.',
  ]);
  ui.close();
  vi.mocked(source.discover).mockResolvedValue({ docs: [{ path: 'a.md' }, { path: 'b.md' }], limits: ['GitHub listed only part of docs/.'] });
  await ui.open(source);
  await showMap();
  expect(ui.text('.mr-map-problems li')).toBe('gone line 3: gone.md is not among the listed documents, which are incomplete.');
  expect(ui.text('.mr-map-status .mr-repo-limit')).toBe('GitHub listed only part of docs/.');
});

it('a large repository is read for the map in bounded passes that can be stopped and continued', async () => {
  const files: Record<string, string> = { 'README.md': '# Top\n\n[first](d000.md)' };
  for (let i = 0; i < INDEX_BATCH + 10; i++) files[`d${String(i).padStart(3, '0')}.md`] = `# Doc ${i}\n\n[home](README.md)`;
  files['big.md'] = 'x';
  files['big2.md'] = 'x';
  files['broken.md'] = '# never';
  const source = repository(files);
  const load = source.load;
  source.load = vi.fn((path: string) => (path === 'broken.md' ? Promise.reject(new Error('500')) : load(path)));
  source.discover = vi.fn(async () => ({
    docs: [
      { path: 'big.md', size: MAX_DOCUMENT_CHARS + 1 },
      { path: 'big2.md', size: MAX_DOCUMENT_CHARS + 1 },
      { path: 'broken.md' },
      ...Object.keys(files)
        .filter((path) => !path.startsWith('b'))
        .map((path) => ({ path })),
    ],
    limits: [],
  }));
  await ui.open(source);
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toContain('Index more'));
  expect(ui.text('.mr-map-status')).toBe(
    `Built from ${INDEX_BATCH + 1} of 164 documents at c0ffee1. Links from the others are not shown yet. Index more 1 document could not be read. 2 documents are too large to read.`,
  );
  expect(ui.text('.mr-map-col h3')).toBe(`Linked from (${INDEX_BATCH - 3})`);
  // Long columns show the first few, and the rest on request.
  expect(ui.all('.mr-map-col:first-child .mr-repo-edge:not([hidden])')).toHaveLength(8);
  ui.press(`Show ${INDEX_BATCH - 11} more`);
  expect(ui.all('.mr-map-col:first-child .mr-repo-edge:not([hidden])')).toHaveLength(INDEX_BATCH - 3);
  // A pass the reader stops leaves what it read; Index more continues.
  const slow = deferred<string>();
  source.load = vi.fn(() => slow.promise);
  ui.press('Index more');
  expect(ui.text('.mr-map-status')).toContain('Stop reading');
  ui.press('Stop reading');
  expect(ui.text('.mr-map-status')).toContain('Index more');
  slow.resolve('# Late');
  await slow.promise;
  source.load = load;
  ui.press('Index more');
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toMatch(/^Built from all 164 documents/));
  expect(ui.text('.mr-map-status')).toBe('Built from all 164 documents at c0ffee1. 1 document could not be read. 2 documents are too large to read.');
});

it('documents that could not be read, or are too large, say so in the map', async () => {
  const source = repository({ 'a.md': '# A\n\n[b](b.md) [c](c.md)', 'b.md': '', 'c.md': '' });
  source.load = vi.fn(async (path: string) => {
    if (path === 'b.md') throw new Error('500');
    return path === 'c.md' ? 'x'.repeat(MAX_DOCUMENT_CHARS + 1) : '# A\n\n[b](b.md) [c](c.md)';
  });
  await ui.open(source);
  await showMap();
  ui.press('b', '.mr-repo-map .mr-repo-edge-doc');
  expect(ui.text('.mr-map-facts')).toBe('Document Could not be read');
  ui.press('A', '.mr-repo-map .mr-repo-edge-doc');
  ui.press('c', '.mr-repo-map .mr-repo-edge-doc');
  expect(ui.text('.mr-map-facts')).toBe('Document Too large to read');
  expect(ui.text('.mr-map-status')).toContain('1 document could not be read. 1 document is too large to read.');
  ui.press('A', '.mr-repo-map .mr-repo-edge-doc');
  ui.press('Read', '.mr-map-center button');
  await ui.settled();
  expect(ui.text('.mr-repo-backlinks')).toBe('Linked from No other document links here.');
});

it('the reader can correct a document’s type, or a folder’s, for this session only', async () => {
  await ui.open(repository(handbook, { start: { path: decision, folder: false } }));
  await showMap();
  const select = () => ui.q<HTMLSelectElement>('[data-act="kind"]');
  const folderWide = () => ui.q<HTMLInputElement>('[data-act="kind-folder"]');
  expect(ui.text('.mr-map-kind small')).toBe('Decision, guessed from its path.');
  select().value = 'runbook';
  select().dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.text('.mr-map-facts')).toBe('Runbook Accepted');
  expect(ui.q('.mr-map-facts .mr-repo-kind').classList).toContain('is-reader');
  expect(ui.text('.mr-map-kind small')).toBe('Set by you for this session; Galley does not save it.');
  expect(folderWide().checked).toBe(false);
  folderWide().checked = true;
  folderWide().dispatchEvent(new Event('change', { bubbles: true }));
  expect(folderWide().checked).toBe(true);
  expect(ui.text('.mr-map-facts')).toBe('Runbook Accepted');
  folderWide().checked = false;
  folderWide().dispatchEvent(new Event('change', { bubbles: true }));
  expect(folderWide().checked).toBe(false);
  // The README sits at the top: there is no folder to apply a type to.
  ui.press('Handbook', '.mr-repo-map .mr-repo-edge-doc');
  expect(ui.text('.mr-map-crumbs')).toBe('In the top folder');
  expect(ui.all('[data-act="kind-folder"]')).toHaveLength(0);
  expect(ui.text('.mr-map-kind small')).toBe('Overview, guessed from its path.');
  select().value = 'other';
  select().dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.text('.mr-map-facts')).toBe('Document');
  // Typing in the search box is not a correction.
  ui.q('.mr-repo-search').dispatchEvent(new Event('change', { bubbles: true }));
  expect(ui.text('.mr-map-facts')).toBe('Document');
});

it('the documents list is an outline of folders that searches titles, paths and headings', async () => {
  const files: Record<string, string> = { ...handbook, 'docs/adr/0002-other.md': '# ADR 2\n\n## Rollout plan' };
  await ui.open(repository(files));
  ui.click('[data-act="docs"]');
  expect(ui.q('[data-act="docs"]').getAttribute('aria-expanded')).toBe('true');
  expect(ui.shadow().activeElement).toBe(ui.q('.mr-repo-search'));
  expect(ui.text('.mr-files-title')).toBe('acme/handbook');
  expect(ui.text('.mr-files-meta')).toBe('main · c0ffee1 · 4 documents');
  expect(ui.all('.mr-repo-outline summary').map((s) => s.textContent)).toStrictEqual(['docs/', 'adr/', 'specs/']);
  expect(ui.all<HTMLDetailsElement>('.mr-repo-folder').every((folder) => folder.open)).toBe(true);
  expect(ui.q('.mr-menu-item[aria-current="true"]').dataset.path).toBe('README.md');
  const search = (value: string) => {
    ui.q<HTMLInputElement>('.mr-repo-search').value = value;
    ui.q('.mr-repo-search').dispatchEvent(new Event('input', { bubbles: true }));
  };
  search('reading');
  expect(ui.all('.mr-repo-results .mr-menu-item').map((b) => b.dataset.path)).toStrictEqual(['docs/specs/reading.md']);
  expect(ui.text('.mr-repo-results')).toContain('Headings are searched in the 1 document Galley has read.');
  search('nothing like this');
  expect(ui.text('.mr-repo-results')).toContain('No document or heading matches.');
  // After the map has read every document, headings are found too, and open at their section.
  ui.key('Escape');
  await showMap();
  ui.click('[data-act="docs"]');
  search('rollout');
  expect(ui.text('.mr-repo-results .mr-path-dir')).toBe('§ Rollout plan');
  expect(ui.text('.mr-repo-results')).not.toContain('Headings are searched');
  ui.click('.mr-repo-results .mr-menu-item');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('ADR 2');
  expect(ui.q('#user-content-rollout-plan').classList).toContain('mr-repo-flash');
  expect(ui.q('.mr-repo-docs').hidden).toBe(true);
  // Kinds show beside titles once read; the current document is marked and choosing it again does nothing.
  ui.click('[data-act="docs"]');
  search('');
  expect(ui.text('.mr-menu-item[data-path="docs/specs/reading.md"]')).toBe('Reading docs/specs/reading.md Spec');
  ui.click('.mr-menu-item[aria-current="true"]');
  expect(ui.q('.mr-repo-docs').hidden).toBe(true);
  // Clicking elsewhere closes the list; clicking inside it does not.
  ui.click('[data-act="docs"]');
  ui.click('.mr-files-head');
  expect(ui.q('.mr-repo-docs').hidden).toBe(false);
  ui.click('.mr-main');
  expect(ui.q('.mr-repo-docs').hidden).toBe(true);
  ui.click('[data-act="docs"]');
  ui.click('[data-act="docs"]');
  expect(ui.q('.mr-repo-docs').hidden).toBe(true);
});

it('a large outline opens only the folders around the current document', async () => {
  const files: Record<string, string> = { 'README.md': '# Top' };
  for (let i = 0; i < 45; i++) files[`f${i % 3}/doc${i}.md`] = `# ${i}`;
  await ui.open(repository(files, { start: { path: 'f1/doc1.md', folder: false } }));
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.all('.mr-repo-folder')).toHaveLength(3));
  expect(ui.all<HTMLDetailsElement>('.mr-repo-folder').map((folder) => folder.open)).toStrictEqual([false, true, false]);
});

it('the list says when the repository is still being listed, has no documents, or could not be listed', async () => {
  const listing = deferred<{ docs: Array<{ path: string }>; limits: string[] }>();
  const source = repository(handbook, { start: { path: 'README.md', folder: false } });
  vi.mocked(source.discover).mockReturnValueOnce(listing.promise).mockRejectedValueOnce(new Error('offline'));
  await ui.open(source);
  ui.click('[data-act="docs"]');
  expect(ui.text('.mr-repo-outline')).toBe('Listing documents…');
  listing.reject(new Error('offline'));
  await vi.waitFor(() => expect(ui.text('.mr-repo-outline')).toBe('Galley could not list this repository. Try again'));
  ui.press('Try again');
  await vi.waitFor(() => expect(ui.text('.mr-repo-outline')).toBe('Galley could not list this repository. Try again'));
  ui.press('Try again');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline .mr-menu-item')).toHaveLength(3));
  ui.close();
  const empty = repository({}, { start: { path: 'README.md', folder: false } });
  await ui.open(empty);
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-outline')).toBe('No Markdown documents at this commit.'));
  ui.key('Escape');
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-map')).toContain('No Markdown documents at this commit.'));
  expect(ui.text('.mr-map-status')).toBe('Built from all 0 documents at c0ffee1.');
});

it('a listing that fails in the map can be tried again; the read view is where it was', async () => {
  const source = repository(handbook, { start: { path: decision, folder: false } });
  vi.mocked(source.discover).mockRejectedValueOnce(new ReaderError('GitHub API rate limit reached.', 'Wait a few minutes.'));
  await ui.open(source);
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-map .mr-message')).toBe('GitHub API rate limit reached. Wait a few minutes. Try again'));
  ui.press('Try again', '.mr-repo-map button');
  await vi.waitFor(() => expect(ui.text('.mr-map-title')).toBe('ADR 1: Use Markdown'));
  ui.click('[data-view="read"]');
  expect(ui.text('.mr-lead')).toBe('ADR 1: Use Markdown');
  // Leaving the map before the listing arrives keeps the reader in the document.
  ui.close();
  const listing = deferred<{ docs: Array<{ path: string }>; limits: string[] }>();
  const slow = repository(handbook, { start: { path: decision, folder: false } });
  vi.mocked(slow.discover).mockReturnValueOnce(listing.promise);
  await ui.open(slow);
  ui.click('[data-view="map"]');
  ui.click('[data-view="read"]');
  listing.reject(new Error('offline'));
  await listing.promise.catch(() => {});
  expect(ui.q('.mr-repo-map').hidden).toBe(true);
  const second = deferred<{ docs: Array<{ path: string }>; limits: string[] }>();
  vi.mocked(slow.discover).mockReturnValueOnce(second.promise);
  ui.click('[data-view="map"]');
  ui.click('[data-view="read"]');
  second.resolve({ docs: [{ path: decision }], limits: [] });
  await second.promise;
  expect(ui.q('.mr-repo-map').hidden).toBe(true);
  // Without a document open, Read has nothing to show.
  ui.close();
  await ui.open(repository({}));
  ui.click('[data-view="read"]');
  expect(ui.text('.mr-message h2')).toBe('No documents here');
});

it('backlinks below a document say how much has been read, and find more on request', async () => {
  const source = repository(handbook, { start: { path: decision, folder: false } });
  await ui.open(source);
  expect(ui.text('.mr-repo-backlinks')).toBe('Linked from Galley has read 1 in this repository. Find links to this document');
  ui.press('Find links to this document');
  await vi.waitFor(() => expect(ui.text('.mr-repo-backlinks')).toContain('Handbook'));
  expect(ui.text('.mr-repo-backlinks')).not.toContain('Galley has read');
  ui.close();
  // A failed listing is reported without leaving the document.
  const failing = repository(handbook, { start: { path: decision, folder: false } });
  vi.mocked(failing.discover).mockRejectedValueOnce(new ReaderError('Could not reach GitHub.', ''));
  await ui.open(failing);
  ui.press('Find links to this document');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Could not reach GitHub.'));
  ui.press('Find links to this document');
  await vi.waitFor(() => expect(ui.text('.mr-repo-backlinks')).toContain('Handbook'));
});

it('backlinks show progress while documents are read, from the list or the reader', async () => {
  const slow = deferred<string>();
  const source = repository(handbook, { start: { path: 'README.md', folder: false } });
  await ui.open(source);
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline .mr-menu-item')).toHaveLength(3));
  ui.key('Escape');
  expect(ui.text('.mr-repo-backlinks')).toBe('Linked from Galley has read 1 of 3 documents in this repository. Find links to this document');
  const load = source.load;
  source.load = vi.fn((path: string) => (path === 'docs/specs/reading.md' ? slow.promise : load(path)));
  ui.press('Find links to this document');
  expect(ui.text('.mr-repo-backlinks')).toContain('Reading documents…');
  ui.press('Reading documents…');
  slow.resolve(handbook['docs/specs/reading.md']);
  await vi.waitFor(() => expect(ui.text('.mr-repo-backlinks')).toBe('Linked from ADR 1: Use Markdown Decision the README in “Context”, line 9'));
});

it('checking for a newer commit keeps the snapshot when nothing moved, and starts over when it did', async () => {
  const source = repository();
  await ui.open(source);
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Up to date: main is still at c0ffee1.'));
  const moved = repository({ ...handbook, 'README.md': '# Handbook, revised' }, { commit: 'beef0000beef0000beef0000beef0000beef0000' });
  vi.mocked(source.refresh).mockResolvedValueOnce(moved);
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-lead')).toBe('Handbook, revised'));
  expect(ui.text('.mr-toast')).toBe('Now reading beef000. It was c0ffee1.');
  expect(ui.text('.mr-repo-commit-label')).toBe('beef000');
  expect(ui.text('.mr-repo-at')).toBe('README.md · main @ beef000');
  // In the map, the map is drawn again from the new commit and the document is read again later.
  await showMap();
  const again = repository({ 'README.md': '# Third' }, { commit: 'abcdef0000abcdef0000abcdef0000abcdef0000' });
  vi.mocked(moved.refresh).mockResolvedValueOnce(again);
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toBe('Built from all 1 document at abcdef0.'));
  ui.click('[data-view="read"]');
  await ui.settled();
  expect(ui.text('.mr-lead')).toBe('Third');
  // A failed check says why and can be tried again.
  vi.mocked(again.refresh).mockRejectedValueOnce(new ReaderError('Could not reach GitHub.', ''));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Could not reach GitHub.'));
  expect(ui.q<HTMLButtonElement>('[data-act="refresh"]').disabled).toBe(false);
});

it('a newer commit stops a pass reading for the map; a check answered after closing changes nothing', async () => {
  const slow = deferred<string>();
  const source = repository(handbook, { ref: null });
  await ui.open(source);
  const load = source.load;
  source.load = vi.fn((path: string) => (path === decision ? slow.promise : load(path)));
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toContain('Stop reading'));
  vi.mocked(source.refresh).mockResolvedValueOnce(repository(handbook, { commit: 'beef0000beef0000beef0000beef0000beef0000', ref: null }));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-commit-label')).toBe('beef000'));
  slow.resolve('# Old');
  await slow.promise;
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toBe('Built from all 3 documents at beef000.'));
  ui.close();
  // Same commit, a moved commit and a failure, each answered after the reader closed.
  const answers = [() => Promise.resolve(source), () => Promise.resolve(repository()), () => Promise.reject(new Error('late'))];
  for (const answer of answers) {
    const pending = deferred<ReturnType<typeof repository>>();
    const later = repository(handbook, { refresh: vi.fn(() => pending.promise) });
    await ui.open(later);
    ui.click('[data-act="refresh"]');
    ui.close();
    answer().then(pending.resolve, pending.reject);
    await pending.promise.catch(() => {});
    expect(document.querySelector('#galley-repo-reader')).toBeNull();
  }
});

it('a commit page is pinned: there is nothing newer to check', async () => {
  await ui.open(repository(handbook, { ref: 'c0ffee1' }));
  const refresh = ui.q<HTMLButtonElement>('[data-act="refresh"]');
  expect(refresh.disabled).toBe(true);
  expect(refresh.title).toBe('Reading commit c0ffee1234567890abcdef1234567890abcdef12');
  expect(refresh.getAttribute('aria-label')).toBe('Reading commit c0ffee1');
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.text('.mr-files-meta')).toBe('c0ffee1 · c0ffee1 · 3 documents'));
});

it('a reader closed while documents are read for the map stops reading', async () => {
  const slow = deferred<string>();
  const source = repository();
  await ui.open(source);
  source.load = vi.fn(() => slow.promise);
  ui.click('[data-view="map"]');
  await vi.waitFor(() => expect(ui.text('.mr-map-status')).toContain('Stop reading'));
  ui.close();
  slow.resolve('# Late');
  await slow.promise;
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
  // A map asked for before the repository arrived waits for it.
  const pending = deferred<ReturnType<typeof repository>>();
  const { openRepository } = await import('./repo-reader.ts');
  const handle = openRepository(pending.promise);
  const root = document.querySelector('#galley-repo-reader')!.shadowRoot!;
  root.querySelector<HTMLElement>('[data-view="map"]')!.click();
  root.querySelector<HTMLElement>('[data-act="docs"]')!.click();
  expect(root.querySelector<HTMLElement>('.mr-repo-docs')!.hidden).toBe(true);
  expect(root.querySelector<HTMLElement>('.mr-repo-map')!.hidden).toBe(true);
  handle.close();
});

it('the map can be closed while the listing is on its way', async () => {
  const listing = deferred<{ docs: Array<{ path: string }>; limits: string[] }>();
  const source = repository(handbook, { start: { path: 'README.md', folder: false } });
  vi.mocked(source.discover).mockReturnValueOnce(listing.promise);
  await ui.open(source);
  ui.click('[data-view="map"]');
  ui.close();
  listing.resolve({ docs: [{ path: 'README.md' }], limits: [] });
  await listing.promise;
  expect(document.querySelector('#galley-repo-reader')).toBeNull();
});

it('evidence without link text or a section is still named, and opens where the link is', async () => {
  const files = { 'a.md': '[](b.md) at the top, and [](gone.md).\n\n# A', 'b.md': '# B' };
  await ui.open(repository(files, { start: { path: 'b.md', folder: false } }));
  await showMap();
  expect(ui.text('.mr-map-col .mr-repo-proof')).toBe('b.md line 1');
  ui.press('A', '.mr-repo-map .mr-repo-edge-doc');
  expect(ui.text('.mr-map-problems li')).toBe('gone.md line 1: gone.md is not among the listed documents.');
  ui.click('.mr-map-problems .mr-repo-proof');
  await ui.settled();
  expect(ui.q('.mr-content p').classList).toContain('mr-repo-flash');
});

it('the documents list names what the listing could not cover', async () => {
  const source = repository();
  vi.mocked(source.discover).mockResolvedValue({ docs: [{ path: 'README.md' }], limits: ['This repository is too large for GitHub to list in one go.'] });
  await ui.open(source);
  ui.click('[data-act="docs"]');
  expect(ui.text('.mr-repo-notes')).toBe('This repository is too large for GitHub to list in one go.');
});

it('a listing for an older commit is dropped when the reader has moved to a newer one', async () => {
  const listing = deferred<{ docs: Array<{ path: string }>; limits: string[] }>();
  const source = repository(handbook, { start: { path: 'README.md', folder: false }, ref: null });
  vi.mocked(source.discover).mockReturnValueOnce(listing.promise);
  await ui.open(source);
  ui.click('[data-act="docs"]');
  ui.key('Escape');
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-toast')).toBe('Up to date: the default branch is still at c0ffee1.'));
  const moved = repository(handbook, { commit: 'beef0000beef0000beef0000beef0000beef0000', start: { path: 'README.md', folder: false } });
  vi.mocked(source.refresh).mockResolvedValueOnce(moved);
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-repo-commit-label')).toBe('beef000'));
  listing.resolve({ docs: [{ path: 'stale.md' }], limits: [] });
  await listing.promise;
  ui.click('[data-act="docs"]');
  await vi.waitFor(() => expect(ui.all('.mr-repo-outline .mr-menu-item').map((b) => b.dataset.path)).toStrictEqual(Object.keys(handbook)));
});

it('a repository that had no documents starts again when a newer commit has some', async () => {
  const source = repository({});
  await ui.open(source);
  expect(ui.text('.mr-message h2')).toBe('No documents here');
  vi.mocked(source.refresh).mockResolvedValueOnce(repository(handbook, { commit: 'beef0000beef0000beef0000beef0000beef0000' }));
  ui.click('[data-act="refresh"]');
  await vi.waitFor(() => expect(ui.text('.mr-doc h1')).toBe('Handbook'));
});
