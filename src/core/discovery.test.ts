import { expect, it } from 'vitest';
import { collectDocs, docRoots, MAX_DOCS, MAX_DOC_ROOTS } from './discovery.ts';

it('lists Markdown files once, by path, with their size when the listing has it', () => {
  const limits: string[] = [];
  const found = collectDocs(
    [
      { path: 'z.md', type: 'blob' },
      { path: 'README.md', type: 'blob', size: 10 },
      { path: 'docs', type: 'tree' },
      { path: 'docs/guide.markdown', type: 'blob' },
      { path: 'README.md', type: 'blob', size: 10 },
      { path: 'src/app.ts', type: 'blob' },
      { path: 'notes.md', type: 'commit' },
    ],
    limits,
  );
  expect(found).toStrictEqual({ docs: [{ path: 'README.md', size: 10 }, { path: 'docs/guide.markdown' }, { path: 'z.md' }], limits: [] });
});

it('past the budget, top-level and documentation folders are kept before other folders and dependencies', () => {
  const entries = [
    ...Array.from({ length: MAX_DOCS }, (_, i) => ({ path: `node_modules/pkg${i}/README.md`, type: 'blob' })),
    { path: 'vendor/lib/README.md', type: 'blob' },
    { path: 'src/feature/NOTES.md', type: 'blob' },
    { path: 'Docs/adr/0001.md', type: 'blob' },
    { path: 'CHANGELOG.md', type: 'blob' },
  ];
  const limits = ['Listed by folder.'];
  const { docs } = collectDocs(entries, limits);
  expect(docs).toHaveLength(MAX_DOCS);
  expect(docs.slice(0, 3).map((doc) => doc.path)).toStrictEqual(['CHANGELOG.md', 'Docs/adr/0001.md', 'node_modules/pkg0/README.md']);
  expect(docs.at(-1)!.path).toBe('src/feature/NOTES.md');
  expect(docs.some((doc) => doc.path.startsWith('vendor/'))).toBe(false);
  expect(limits).toStrictEqual(['Listed by folder.', 'Listing the first 2,000 of 2,004 Markdown files, documentation folders first.']);
});

it('documentation folders are top-level folders with familiar names, in a fixed order and number', () => {
  const folder = (path: string) => ({ path, type: 'tree' });
  const roots = docRoots([
    folder('src'),
    folder('ADR'),
    folder('docs'),
    { path: 'docs.md', type: 'blob' },
    folder('docs/specs'),
    folder('specs'),
    folder('design'),
    folder('runbooks'),
    folder('guides'),
    folder('rfcs'),
  ]);
  expect(roots.map((entry) => entry.path)).toStrictEqual(['docs', 'specs', 'ADR', 'rfcs', 'design', 'runbooks']);
  expect(roots).toHaveLength(MAX_DOC_ROOTS);
});
