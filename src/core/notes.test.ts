import { expect, it } from 'vitest';
import {
  anchorState,
  emptyThinking,
  exportMarkdown,
  exportMermaid,
  MAX_NOTE_CHARS,
  MAX_NOTES,
  parseThinking,
  sectionText,
  type ExportContext,
  type Note,
  type Thinking,
} from './notes.ts';

const anchor = { path: 'docs/rfc.md', heading: 'goals', label: 'RFC § Goals', commit: 'c0ffee1234', digest: 'd1' };
const note = (patch: Partial<Note>): Note => ({ id: 'n', kind: 'idea', text: 'Text', group: '', anchor: null, links: [], created: 1, updated: 1, ...patch });

it('stored notes are checked item by item: malformed entries are dropped, never trusted', () => {
  expect(parseThinking(null)).toBe(null);
  expect(parseThinking('notes')).toBe(null);
  expect(parseThinking([])).toBe(null);
  expect(parseThinking({})).toStrictEqual(emptyThinking());
  const stored = {
    notes: [
      note({ id: 'ok', anchor }),
      note({ id: 'bad-kind', kind: 'rant' as never }),
      note({ id: 'long', text: 'x'.repeat(MAX_NOTE_CHARS + 1) }),
      note({ id: 'bad-anchor', anchor: { ...anchor, commit: 7 } as never }),
      note({ id: 'whole-doc', anchor: { ...anchor, heading: null } }),
      note({ id: 'bad-links', links: [1] as never }),
      note({ id: 'many-links', links: Array(51).fill('x') }),
      note({ id: 'bad-time', created: Number.NaN }),
      null,
    ],
    entities: [
      { id: 'e1', name: 'Renderer', kind: 'Component', lens: 'architecture', anchor: null },
      { id: 'e2', name: 'Store', kind: 'Data store', lens: 'infrastructure', anchor: { path: 'a.md', label: 'A' } },
      { id: 'e3', name: 'X', kind: 'Spaceship', lens: 'architecture', anchor: null },
      { id: 'e4', name: 'X', kind: 'Component', lens: 'decisions', anchor: null },
      { id: 'e5', name: 'X', kind: 'Component', lens: 'architecture', anchor: { path: 1 } },
    ],
    relations: [{ id: 'r1', from: 'e1', to: 'e2', label: 'writes to' }, { id: 'r2', from: 'e1', to: 'e2', label: 'x'.repeat(81) }, 'r3'],
    docKinds: [['a.md', 'spec'], ['b.md', 'novel'], ['c.md'], 'd.md'],
    folderKinds: [['docs', 'guide']],
    entityKinds: [
      ['service:web', 'Data store'],
      ['service:x', 7],
    ],
  };
  expect(parseThinking(stored)).toStrictEqual({
    notes: [stored.notes[0], stored.notes[4]],
    entities: stored.entities.slice(0, 2),
    relations: [stored.relations[0]],
    docKinds: [['a.md', 'spec']],
    folderKinds: [['docs', 'guide']],
    entityKinds: [['service:web', 'Data store']],
  });
  expect(parseThinking({ notes: Array.from({ length: MAX_NOTES + 3 }, (_, i) => note({ id: `n${i}` })) })!.notes).toHaveLength(MAX_NOTES);
  expect(parseThinking({ notes: 'many', entities: {} })).toStrictEqual(emptyThinking());
});

it('a section runs from its heading to the next heading at the same level or higher', () => {
  const src = '# RFC\n\nIntro\n\n## Goals\n\nRead first.\n\n### Detail\n\nMore.\n\n## Rollout\n\nLater.';
  expect(sectionText(src, 'goals')).toBe('## Goals\n\nRead first.\n\n### Detail\n\nMore.\n');
  expect(sectionText(src, 'rollout')).toBe('## Rollout\n\nLater.');
  expect(sectionText(src, null)).toBe(src);
  expect(sectionText(src, 'gone')).toBe(null);
});

it('an anchor is current at its own commit, and otherwise unchanged, changed or missing', () => {
  expect(anchorState(anchor, 'c0ffee1234', 'other')).toBe('current');
  expect(anchorState(anchor, 'beef', 'd1')).toBe('unchanged');
  expect(anchorState(anchor, 'beef', 'd2')).toBe('changed');
  expect(anchorState(anchor, 'beef', null)).toBe('missing');
});

const thinking: Thinking = {
  ...emptyThinking(),
  notes: [
    note({ id: 'q', kind: 'question', text: 'Why a queue?\nAnd who reads it?', anchor, links: ['a1', 'service:web', 'gone'] }),
    note({ id: 'a1', kind: 'alternative', group: 'Queue or stream', text: 'Keep the queue' }),
    note({ id: 'a2', kind: 'alternative', group: 'Queue or stream', text: 'Stream "events" [now]', links: ['q'] }),
    note({ id: 'a3', kind: 'alternative', text: 'Do nothing' }),
    note({ id: 'private', kind: 'idea', text: 'Not for sharing' }),
    note({ id: 'x', kind: 'experiment', text: 'Measure | it', anchor: { ...anchor, label: 'RFC (whole)', heading: null } }),
  ],
};
const ctx: ExportContext = {
  name: 'acme/handbook',
  ref: 'main',
  commit: 'beef000000',
  date: '2026-10-10',
  link: (path, heading) => `https://github.com/acme/handbook/blob/beef000/${path}${heading ? `#${heading}` : ''}`,
  describe: (id) => ({ a1: 'Alternative: Keep the queue', q: 'Question: Why a queue?', 'service:web': 'Service web (declared in configuration)' })[id] ?? null,
};

it('Markdown export includes only the chosen notes, with sources linked at their commit and every proposal labelled', () => {
  const chosen = new Set(['q', 'a1', 'a2', 'a3', 'x']);
  expect(exportMarkdown(thinking, chosen, ctx)).toBe(
    [
      '# Notes on acme/handbook',
      '',
      "Private notes exported from Galley on 2026-10-10, read at main @ beef000. They are ideas and questions, not the project's documentation.",
      '',
      '## Questions',
      '',
      '- **Question** (proposal): Why a queue?',
      '  And who reads it?',
      '  - About: [RFC § Goals](https://github.com/acme/handbook/blob/beef000/docs/rfc.md#goals) (documented; the note was written at c0ffee1)',
      '  - Tentatively connected to: Alternative: Keep the queue; Service web (declared in configuration)',
      '',
      '## Next experiments',
      '',
      '- **Next experiment** (proposal): Measure | it',
      '  - About: [RFC (whole)](https://github.com/acme/handbook/blob/beef000/docs/rfc.md) (documented; the note was written at c0ffee1)',
      '',
      '## Alternatives: Queue or stream',
      '',
      '- **Alternative** (proposal): Keep the queue',
      '- **Alternative** (proposal): Stream "events" [now]',
      '  - Tentatively connected to: Question: Why a queue?',
      '',
      '## Alternatives',
      '',
      '- **Alternative** (proposal): Do nothing',
      '',
    ].join('\n'),
  );
  expect(exportMarkdown(thinking, new Set(), { ...ctx, ref: null })).toBe(
    "# Notes on acme/handbook\n\nPrivate notes exported from Galley on 2026-10-10, read at default branch @ beef000. They are ideas and questions, not the project's documentation.\n",
  );
});

it('Mermaid export draws the chosen notes as dashed proposals, their sections and their tentative connections, with safe labels', () => {
  expect(exportMermaid(thinking, new Set(['q', 'a1', 'a2', 'x']), ctx)).toBe(
    [
      'flowchart LR',
      '  n1(["Question: Why a queue? And who reads it?"])',
      '  n2(["Alternative: Keep the queue"])',
      '  n3(["Alternative: Stream \'events\' now"])',
      '  n4(["Next experiment: Measure it"])',
      '  d1["RFC § Goals"]',
      '  n1 --- d1',
      '  n1 -. tentative .-> n2',
      '  e2["Service web declared in configuration"]',
      '  n1 -. tentative .-> e2',
      '  n3 -. tentative .-> n1',
      '  d3["RFC whole"]',
      '  n4 --- d3',
      '  classDef proposal stroke-dasharray: 4 3',
      '  class n1,n2,n3,n4 proposal',
      '',
    ].join('\n'),
  );
  const long = { ...emptyThinking(), notes: [note({ id: 'l', text: 'y'.repeat(80), links: ['service:web', 'service:web'] })] };
  expect(exportMermaid(long, new Set(['l']), ctx).split('\n')[1]).toBe(`  n1(["Idea: ${'y'.repeat(53)}…"])`);
  expect(exportMermaid(long, new Set(['l']), ctx).match(/e1\[/g)).toHaveLength(1);
  expect(exportMermaid(thinking, new Set(), ctx)).toBe('flowchart LR\n');
  // Two notes about the same section share one node for it.
  const same = { ...emptyThinking(), notes: [note({ id: 'p', anchor }), note({ id: 'r', anchor })] };
  expect(exportMermaid(same, new Set(['p', 'r']), ctx).match(/d\d\[/g)).toHaveLength(1);
});
