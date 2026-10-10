import { expect, it } from 'vitest';
import { buildLens, MAX_SUGGESTIONS, mentionLine, type ArchitectureInput, type ConfigReading } from './architecture.ts';
import { indexDocument, ProjectIndex } from './docindex.ts';

function input(docs: Record<string, string>, configs: Record<string, ConfigReading> = {}, patch: Partial<ArchitectureInput> = {}): ArchitectureInput {
  const index = new ProjectIndex(Object.keys(docs));
  for (const [path, text] of Object.entries(docs)) index.add(indexDocument(path, text));
  return {
    index,
    corrections: { docs: new Map(), folders: new Map() },
    configs: new Map(Object.entries(configs)),
    texts: new Map(Object.entries(docs)),
    proposed: { entities: [], relations: [] },
    kinds: new Map(),
    ...patch,
  };
}

const compose: ConfigReading = {
  items: [
    { key: 'service:web', name: 'web', kind: 'service', line: 2, detail: 'image acme/web' },
    { key: 'service:queue', name: 'queue', kind: 'service', line: 5, detail: '' },
  ],
  links: [
    { from: 'service:web', to: 'service:queue', label: 'depends on', line: 3 },
    { from: 'service:web', to: 'service:cache', label: 'depends on', line: 4 },
  ],
  notes: [],
};
const override: ConfigReading = { items: [{ key: 'service:web', name: 'web', kind: 'service', line: 1, detail: 'image acme/web:dev' }], links: [], notes: [] };
const workflow: ConfigReading = {
  items: [
    { key: 'job:ci:deploy', name: 'deploy', kind: 'job', line: 3, detail: '' },
    { key: 'environment:production', name: 'production', kind: 'environment', line: 5, detail: '' },
  ],
  links: [
    { from: 'job:ci:deploy', to: 'environment:production', label: 'deploys to', line: 3 },
    // A link to something in another view, and one from something no file declares, are not drawn here.
    { from: 'job:ci:deploy', to: 'service:web', label: 'needs', line: 4 },
    { from: 'job:ci:ghost', to: 'job:ci:deploy', label: 'needs', line: 6 },
    { from: 'job:ci:deploy', to: 'odd:thing', label: 'needs', line: 7 },
  ],
  notes: [],
};

it('architecture shows what configuration declares, merged across files, with every declaration as evidence', () => {
  const model = buildLens('architecture', input({}, { 'docker-compose.yml': compose, 'compose.dev.yaml': override }));
  expect(model.entities.map(({ id, kind, origin, detail, evidence }) => [id, kind, origin, detail, evidence.map((e) => `${e.path}:${e.line}`)])).toStrictEqual([
    ['service:cache', 'Service', 'declared', '', []],
    ['service:queue', 'Service', 'declared', '', ['docker-compose.yml:5']],
    ['service:web', 'Service', 'declared', 'image acme/web:dev', ['compose.dev.yaml:1', 'docker-compose.yml:2']],
  ]);
  // A service only named by depends_on is shown, and said to be undeclared.
  expect(model.entities[0].notes).toStrictEqual(['Referenced in configuration, but declared in no file Galley read.']);
  expect(model.relations).toStrictEqual([
    {
      from: 'service:web',
      to: 'service:queue',
      label: 'depends on',
      origin: 'declared',
      evidence: [{ path: 'docker-compose.yml', line: 3, quote: 'web depends on queue' }],
    },
    {
      from: 'service:web',
      to: 'service:cache',
      label: 'depends on',
      origin: 'declared',
      evidence: [{ path: 'docker-compose.yml', line: 4, quote: 'web depends on cache' }],
    },
  ]);
});

it('infrastructure shows jobs and environments; links across views or from undeclared things are left out', () => {
  const model = buildLens('infrastructure', input({}, { 'ci.yml': workflow, 'docker-compose.yml': compose }));
  expect(model.entities.map((entity) => [entity.id, entity.kind])).toStrictEqual([
    ['environment:production', 'Environment'],
    ['job:ci:deploy', 'Job'],
    ['odd:thing', 'Unknown'],
  ]);
  expect(model.relations.map((r) => `${r.from} ${r.label} ${r.to}`)).toStrictEqual([
    'job:ci:deploy deploys to environment:production',
    'job:ci:deploy needs odd:thing',
  ]);
});

it('the reader’s own components and connections are marked as theirs, anchored to where they read about them', () => {
  const docs = { 'docs/architecture/overview.md': '# Overview\n\nThe Renderer turns Markdown into pages.' };
  const proposed = {
    entities: [
      {
        id: 'mine:renderer',
        name: 'Renderer',
        kind: 'Component',
        lens: 'architecture' as const,
        anchor: { path: 'docs/architecture/overview.md', label: 'Overview' },
      },
      { id: 'mine:store', name: 'Store', kind: 'Data store', lens: 'architecture' as const, anchor: null },
      { id: 'mine:env', name: 'Staging', kind: 'Environment', lens: 'infrastructure' as const, anchor: null },
    ],
    relations: [
      { id: 'r1', from: 'mine:renderer', to: 'mine:store', label: 'writes to' },
      { id: 'r2', from: 'mine:renderer', to: 'mine:env', label: 'runs in' },
    ],
  };
  proposed.entities.push({
    id: 'mine:unread',
    name: 'Unread',
    kind: 'Component',
    lens: 'architecture',
    anchor: { path: 'docs/unlisted.md', label: 'Unlisted' },
  });
  const model = buildLens('architecture', input(docs, {}, { proposed }));
  expect(model.entities.find((entity) => entity.id === 'doc:docs/unlisted.md')).toMatchObject({ name: 'docs/unlisted.md', kind: 'Document' });
  model.entities = model.entities.filter((entity) => !entity.id.includes('unread') && !entity.id.includes('unlisted'));
  model.relations = model.relations.filter((relation) => !relation.from.includes('unread'));
  expect(model.entities.map((entity) => [entity.id, entity.origin])).toStrictEqual([
    ['doc:docs/architecture/overview.md', 'documented'],
    ['mine:renderer', 'reader'],
    ['mine:store', 'reader'],
  ]);
  expect(model.relations.map((r) => [r.from, r.label, r.to, r.origin])).toStrictEqual([
    ['mine:renderer', 'described in', 'doc:docs/architecture/overview.md', 'reader'],
    ['mine:renderer', 'writes to', 'mine:store', 'reader'],
    ['mine:renderer', 'named in', 'doc:docs/architecture/overview.md', 'suggested'],
  ]);
  expect(model.relations[2].evidence).toStrictEqual([{ path: 'docs/architecture/overview.md', line: 3, quote: 'The Renderer turns Markdown into pages.' }]);
});

it('a kind the reader sets replaces the source’s kind, which stays visible', () => {
  const model = buildLens(
    'architecture',
    input(
      {},
      { 'docker-compose.yml': compose },
      {
        kinds: new Map([
          ['service:queue', 'Data store'],
          ['service:web', 'Service'],
        ]),
      },
    ),
  );
  expect(model.entities.find((entity) => entity.id === 'service:queue')).toMatchObject({ kind: 'Data store', correctedFrom: 'Service' });
  expect(model.entities.find((entity) => entity.id === 'service:web')).toMatchObject({ kind: 'Service', correctedFrom: null });
});

it('suggestions come only from documents of the right kinds, whole words only, and are capped', () => {
  const many: ConfigReading = {
    items: Array.from({ length: MAX_SUGGESTIONS + 5 }, (_, i) => ({
      key: `service:svc${i}x`,
      name: `svc${i}x`,
      kind: 'service' as const,
      line: 1,
      detail: '',
    })),
    links: [],
    notes: [],
  };
  const text = `# Runbook\n\n${many.items.map((item) => item.name).join(' ')}`;
  const docs = { 'docs/architecture/a.md': text, 'notes/b.md': text, 'docs/architecture/c.md': '# C\n\nwebsite, web-app and web' };
  const model = buildLens('architecture', input(docs, { 'docker-compose.yml': { ...many, items: [...many.items, compose.items[0]] } }));
  const suggested = model.relations.filter((relation) => relation.origin === 'suggested');
  expect(suggested).toHaveLength(MAX_SUGGESTIONS);
  expect(suggested.every((relation) => relation.to === 'doc:docs/architecture/a.md')).toBe(true);
  // Unread documents are not looked in.
  const unread = input(docs, { 'docker-compose.yml': compose });
  unread.texts.set('docs/architecture/missing.md', 'web');
  expect(
    buildLens('architecture', unread)
      .relations.filter((relation) => relation.origin === 'suggested')
      .map((r) => r.to),
  ).toStrictEqual(['doc:docs/architecture/c.md']);
  expect(mentionLine('web', 'website\nweb-app\nthe (web) tier')).toBe(3);
  expect(mentionLine('a.b', 'aXb\na.b')).toBe(2);
  expect(mentionLine('web', 'nothing')).toBe(0);
});

it('decisions: their status, which supersede which, and what they link to or name, with conflicts stated', () => {
  const docs = {
    'docs/adr/0001-record.md':
      '---\nrfcs: [42]\n---\n# ADR 1: Record decisions\n\n## Status\n\nAccepted\n\n## Context\n\nSee [RFC 42](../rfcs/0042-reading.md) and [ADR 3](0003-queue.md).',
    'docs/adr/0003-queue.md': '---\nstatus: Accepted\n---\n# ADR 3: Queue\n\n## Status\n\nSuperseded by [ADR 7](0007-browser.md)',
    'docs/adr/0007-browser.md':
      '---\nsupersedes: [3]\nsuperseded-by: 9\n---\n# ADR 7: Browser\n\n## Status\n\nSupersedes [ADR 3](0003-queue.md); see [itself](0007-browser.md), [readme](../../README.md), [gone](0042-x.md) and [site](https://x)',
    'docs/adr/0009-next.md': '---\nsupersedes: [9, 99]\n---\n[](0001-record.md)\n\n# ADR 9: Next\n\n## Status\n\n| [](0003-queue.md) |\n| - |',
    'docs/adr/0012-front.md': '---\nstatus: Proposed\n---\n# ADR 12: Front matter only',
    'docs/rfcs/0042-reading.md': '---\ntype: rfc\n---\n# RFC 42',
    'README.md': '# Readme',
  };
  const all = input(docs);
  all.index.add({ ...indexDocument('docs/adr/0010-unread.md', ''), unread: 'failed' });
  const model = buildLens('decisions', all);
  expect(model.entities.map(({ id, kind, detail, notes }) => [id, kind, detail, notes])).toStrictEqual([
    ['doc:docs/adr/0001-record.md', 'Decision', 'Accepted', []],
    ['doc:docs/adr/0003-queue.md', 'Decision', 'Accepted', ['Its front matter says “Accepted”, and its Status section says “Superseded by ADR 7”.']],
    ['doc:docs/adr/0007-browser.md', 'Decision', 'Supersedes ADR 3; see itself, readme, gone and site', []],
    ['doc:docs/adr/0009-next.md', 'Decision', 'No status stated', []],
    ['doc:docs/adr/0012-front.md', 'Decision', 'Proposed', []],
    ['doc:docs/rfcs/0042-reading.md', 'Spec', 'docs/rfcs/0042-reading.md', []],
  ]);
  expect(model.entities[0].evidence).toStrictEqual([{ path: 'docs/adr/0001-record.md', line: 6, quote: 'Accepted' }]);
  expect(model.entities[3].evidence).toStrictEqual([{ path: 'docs/adr/0009-next.md', line: 1, quote: 'ADR 9: Next' }]);
  expect(model.entities[4].evidence).toStrictEqual([{ path: 'docs/adr/0012-front.md', line: 1, quote: 'Proposed' }]);
  // A link without text is named by its address; a link outside any section, or in a Status section without a status, links.
  expect(model.relations.filter((r) => r.from.endsWith('0009-next.md') && r.label === 'links to').map((r) => r.evidence[0].quote)).toStrictEqual([
    '0001-record.md',
    '0003-queue.md',
  ]);
  expect(model.relations.map((r) => `${r.from.slice(13)} ${r.label} ${r.to.slice(9)} @${r.evidence.map((e) => e.line).join(',')}`)).toStrictEqual([
    '0001-record.md links to rfcs/0042-reading.md @12',
    '0001-record.md links to adr/0003-queue.md @12',
    '0001-record.md names rfcs/0042-reading.md @1',
    // Both records say it, and the front matter too: one relation, three pieces of evidence.
    '0007-browser.md supersedes adr/0003-queue.md @8,9,1',
    // Stated in ADR 7's front matter (superseded-by: 9), so it is read with ADR 7.
    '0009-next.md supersedes adr/0007-browser.md @1',
    '0009-next.md links to adr/0001-record.md @4',
    '0009-next.md links to adr/0003-queue.md @10',
  ]);
  // The reader's correction of a kind moves a document in or out of the decisions view.
  const corrected = input(docs, {}, { corrections: { docs: new Map([['docs/adr/0009-next.md', 'other']]), folders: new Map() } });
  expect(buildLens('decisions', corrected).entities.some((entity) => entity.id === 'doc:docs/adr/0009-next.md')).toBe(false);
});
