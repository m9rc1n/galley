import { expect, it } from 'vitest';
import { classify, fileTitle, folderTree, INDEX_BATCH, indexDocument, pathKind, ProjectIndex, readForIndex, type Corrections } from './docindex.ts';
import { MAX_DOCUMENT_CHARS } from './limits.ts';

const none: Corrections = { docs: new Map(), folders: new Map() };

it('a document’s kind is what its front matter says, else a guess from its path, else unknown', () => {
  expect(indexDocument('notes/x.md', '---\ntype: ADR\nstatus: Accepted\n---\n# Use Postgres')).toMatchObject({
    title: 'Use Postgres',
    kind: 'decision',
    kindFrom: 'metadata',
    status: 'Accepted',
  });
  expect(indexDocument('docs/adr/0002-queue.md', '# Queue\n\n## Status\n\nSuperseded by [ADR 7](0007-stream.md)')).toMatchObject({
    kind: 'decision',
    kindFrom: 'path',
    status: 'Superseded by ADR 7',
  });
  expect(indexDocument('notes/scratch.md', '---\ntitle: Scratch\nkind: grocery list\n---\nhello')).toMatchObject({
    title: 'Scratch',
    kind: 'other',
    kindFrom: 'none',
    status: null,
  });
  expect(indexDocument('notes/long-status.md', `---\nstatus: ${'x'.repeat(80)}\n---\n`).status).toBe(`${'x'.repeat(59)}…`);
  // Front matter and a Status section can disagree; both are kept, front matter first.
  const torn = indexDocument('adr/0003.md', '---\nstatus: Accepted\nRFCs: 36\n---\n# Queue\n\n## Status\n\nSuperseded by ADR 7');
  expect(torn).toMatchObject({ status: 'Accepted', statusAlso: 'Superseded by ADR 7', meta: { status: 'Accepted', rfcs: '36' } });
  expect(indexDocument('adr/0004.md', '---\nstatus: accepted.\n---\n## Status\n\nAccepted').statusAlso).toBe(null);
  expect(pathKind('README.md')).toBe('overview');
  expect(pathKind('docs/RFC-0042-reading.md')).toBe('spec');
  expect(pathKind('handbook/runbooks/deploy/rollback.md')).toBe('runbook');
  expect(pathKind('docs/architecture/c4.md')).toBe('architecture');
  expect(pathKind('docs/how-to/setup.md')).toBe('guide');
  expect(pathKind('src/notes.md')).toBe(null);
  expect(fileTitle('docs/adr/0007-use_markdown.mdx')).toBe('0007 use markdown');
});

it('links keep their text, line and section, resolved against the repository', () => {
  const doc = indexDocument(
    'docs/rfcs/0042.md',
    '# RFC\n\nSee [the ADR](../adr/0007.md#status), [above](#rfc), [site](https://example.com) and [bad](x.md#%E0%A4%A).\n\n<a id="raw-anchor"></a>',
  );
  expect(doc.links.map(({ path, anchor, text, line, section }) => ({ path, anchor, text, line, section }))).toStrictEqual([
    { path: 'docs/adr/0007.md', anchor: 'status', text: 'the ADR', line: 3, section: 'RFC' },
    { path: 'docs/rfcs/0042.md', anchor: 'rfc', text: 'above', line: 3, section: 'RFC' },
    { path: null, anchor: '', text: 'site', line: 3, section: 'RFC' },
    // markdown-it re-encodes a broken escape; it stays as written rather than failing.
    { path: 'docs/rfcs/x.md', anchor: '%E0%A4%25A', text: 'bad', line: 3, section: 'RFC' },
  ]);
  expect([...doc.anchors]).toStrictEqual(['rfc', 'raw-anchor']);
});

it('connections come from links, with every link as evidence; missing documents and sections are reported', () => {
  const index = new ProjectIndex(['README.md', 'docs/README.md', 'docs/adr/0001.md', 'docs/rfc.md']);
  index.add(
    indexDocument(
      'docs/rfc.md',
      '# RFC\n\n## Goals\n\nSee [ADR 1](adr/0001.md) and [again](adr/0001.md#context), [docs](./), [gone](old.md), [img](diagram.png), [up](#nowhere), [fn](#fn1), [site](https://example.com), [home](/README.md).',
    ),
  );
  expect(index.edges).toStrictEqual([
    { from: 'docs/rfc.md', to: 'docs/adr/0001.md', evidence: [expect.objectContaining({ text: 'ADR 1' }), expect.objectContaining({ text: 'again' })] },
    { from: 'docs/rfc.md', to: 'docs/README.md', evidence: [expect.objectContaining({ text: 'docs' })] },
    { from: 'docs/rfc.md', to: 'README.md', evidence: [expect.objectContaining({ text: 'home' })] },
  ]);
  expect(index.problems.map((problem) => [problem.kind, problem.link.text])).toStrictEqual([
    ['missing-doc', 'gone'],
    ['missing-anchor', 'up'],
  ]);
  // A section can only be missing from a document that has been read.
  index.add(indexDocument('docs/adr/0001.md', '# ADR 1\n\n## Context\n\nBack to [the RFC](../rfc.md#Goals).'));
  expect(index.problems.map((problem) => problem.link.text)).toStrictEqual(['gone', 'up']);
  index.add({ ...indexDocument('docs/adr/0001.md', '# ADR 1'), unread: 'failed' });
  expect(index.problems.map((problem) => problem.link.text)).toStrictEqual(['gone', 'up']);
  index.add(indexDocument('docs/adr/0001.md', '# ADR 1'));
  expect(index.problems.map((problem) => problem.link.text)).toStrictEqual(['again', 'gone', 'up']);
  expect(index.outgoing('docs/rfc.md').map((edge) => edge.to)).toStrictEqual(['README.md', 'docs/README.md', 'docs/adr/0001.md']);
  expect(index.incoming('docs/adr/0001.md').map((edge) => edge.from)).toStrictEqual(['docs/rfc.md']);
  expect(index.unread()).toStrictEqual(['README.md', 'docs/README.md']);
  expect(index.documentAt('docs/')).toBe('docs/README.md');
  expect(index.documentAt('')).toBe('README.md');
  expect(index.documentAt('src')).toBe(null);
});

it('search matches every word in a path or title first, then in headings', () => {
  const index = new ProjectIndex(['docs/deploy.md', 'docs/rfc.md', 'README.md']);
  index.add(indexDocument('docs/rfc.md', '# Reading first\n\n## Rollout plan'));
  index.add(indexDocument('README.md', '# Galley\n\n## Deploy steps'));
  expect(index.search('  ')).toStrictEqual([{ path: 'docs/deploy.md' }, { path: 'docs/rfc.md' }, { path: 'README.md' }]);
  expect(index.search('Deploy')).toStrictEqual([{ path: 'docs/deploy.md' }, { path: 'README.md', heading: expect.objectContaining({ text: 'Deploy steps' }) }]);
  expect(index.search('rollout PLAN')).toStrictEqual([{ path: 'docs/rfc.md', heading: expect.objectContaining({ id: 'rollout-plan' }) }]);
  expect(index.search('missing')).toStrictEqual([]);
});

it('the reader’s corrections win over the document, nearest folder first', () => {
  const doc = indexDocument('docs/adr/old/0001.md', '# Old');
  expect(classify(doc, none)).toStrictEqual({ kind: 'decision', from: 'path' });
  const corrections: Corrections = {
    docs: new Map(),
    folders: new Map([
      ['docs', 'guide'],
      ['docs/adr/old', 'other'],
    ]),
  };
  expect(classify(doc, corrections)).toStrictEqual({ kind: 'other', from: 'reader' });
  corrections.folders.delete('docs/adr/old');
  expect(classify(doc, corrections)).toStrictEqual({ kind: 'guide', from: 'reader' });
  corrections.docs.set(doc.path, 'spec');
  expect(classify(doc, corrections)).toStrictEqual({ kind: 'spec', from: 'reader' });
  expect(classify(indexDocument('top.md', ''), corrections)).toStrictEqual({ kind: 'other', from: 'none' });
});

it('the outline groups documents by folder, README first, in a stable order', () => {
  expect(folderTree(['docs/b.md', 'z.md', 'docs/adr/2.md', 'README.md', 'docs/README.md', 'docs/a.md', 'Docs2/x.md', 'docs/adr/1.md'])).toStrictEqual({
    name: '',
    path: '',
    docs: ['README.md', 'z.md'],
    folders: [
      {
        name: 'docs',
        path: 'docs',
        docs: ['docs/README.md', 'docs/a.md', 'docs/b.md'],
        folders: [{ name: 'adr', path: 'docs/adr', docs: ['docs/adr/1.md', 'docs/adr/2.md'], folders: [] }],
      },
      { name: 'Docs2', path: 'Docs2', docs: ['Docs2/x.md'], folders: [] },
    ],
  });
});

it('reads a bounded batch a few at a time, reporting documents it could not or would not read', async () => {
  const listed = Array.from({ length: INDEX_BATCH + 5 }, (_, i) => `d${String(i).padStart(3, '0')}.md`);
  const index = new ProjectIndex(listed);
  let progress = 0;
  let open = 0;
  let most = 0;
  const result = await readForIndex(
    index,
    async (path) => {
      open++;
      most = Math.max(most, open);
      await Promise.resolve();
      open--;
      if (path === 'd001.md') throw new Error('404');
      return path === 'd002.md' ? 'x'.repeat(MAX_DOCUMENT_CHARS + 1) : `# ${path}`;
    },
    { sizes: new Map([['d003.md', MAX_DOCUMENT_CHARS + 1]]), progress: () => progress++ },
  );
  expect(result).toStrictEqual({ read: INDEX_BATCH - 3, failed: ['d001.md'], skipped: ['d003.md', 'd002.md'] });
  expect(progress).toBe(INDEX_BATCH);
  expect(most).toBe(4);
  expect(index.docs.get('d001.md')).toMatchObject({ unread: 'failed', title: 'd001' });
  expect(index.docs.get('d002.md')).toMatchObject({ unread: 'too-large' });
  expect(index.unread()).toHaveLength(5);
});

it('a cancelled pass stops starting reads and drops results that arrive late', async () => {
  const index = new ProjectIndex(['a.md', 'b.md', 'c.md', 'd.md', 'e.md']);
  const signal = { cancelled: false };
  const result = await readForIndex(
    index,
    async (path) => {
      if (path === 'a.md') signal.cancelled = true;
      return '# Doc';
    },
    { signal },
  );
  expect(result.read).toBe(0);
  expect(index.docs.size).toBe(0);
  expect((await readForIndex(index, async () => '# Doc')).read).toBe(5);
});
