import { PROPOSED_KINDS, type ProposedEntity, type ProposedRelation } from './architecture.ts';
import { DOC_KINDS, type DocKind } from './docindex.ts';
import { outlineDocument } from './markdown.ts';

/**
 * The reader's private thinking about a project: ideas, questions, assumptions, next experiments and
 * alternatives, anchored to sections of the documents, plus the components and connections they propose
 * and the types they correct. It is theirs: it stays on the device, is saved only when they choose, and
 * leaves only through an export they preview (ADR 0028).
 */

export const NOTE_KINDS = ['idea', 'question', 'assumption', 'experiment', 'alternative'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_NAMES: Record<NoteKind, string> = {
  idea: 'Idea',
  question: 'Question',
  assumption: 'Assumption',
  experiment: 'Next experiment',
  alternative: 'Alternative',
};
export const NOTE_HEADINGS: Record<NoteKind, string> = {
  idea: 'Ideas',
  question: 'Questions',
  assumption: 'Assumptions',
  experiment: 'Next experiments',
  alternative: 'Alternatives',
};

/** A section of a document as it was when the note was written: its text's fingerprint tells if it changed. */
export interface Anchor {
  path: string;
  /** The heading id, or null for the whole document. */
  heading: string | null;
  /** How the reader saw it: "Architecture overview § Rendering". */
  label: string;
  commit: string;
  digest: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  text: string;
  /** For alternatives: the question they answer, so they can be compared side by side. */
  group: string;
  anchor: Anchor | null;
  /** Tentative connections to other notes or entities, by id. */
  links: string[];
  created: number;
  updated: number;
}

export interface Thinking {
  notes: Note[];
  entities: ProposedEntity[];
  relations: ProposedRelation[];
  docKinds: Array<[string, DocKind]>;
  folderKinds: Array<[string, DocKind]>;
  entityKinds: Array<[string, string]>;
}

export const MAX_NOTES = 500;
export const MAX_NOTE_CHARS = 4_000;
/** Tentative connections one note keeps. */
export const MAX_LINKS = 50;
const MAX_ITEMS = 2_000;

export function emptyThinking(): Thinking {
  return { notes: [], entities: [], relations: [], docKinds: [], folderKinds: [], entityKinds: [] };
}

const isText = (value: unknown, most = 400): value is string => typeof value === 'string' && value.length <= most;
const isTime = (value: unknown): value is number => Number.isFinite(value);
const isPair = (value: unknown, second: (v: unknown) => boolean): value is [string, string] =>
  Array.isArray(value) && value.length === 2 && isText(value[0], 1_000) && second(value[1]);
const isDocKind = (value: unknown) => DOC_KINDS.includes(value as DocKind);

function isAnchor(value: unknown): value is Anchor {
  const anchor = value as Partial<Anchor> | null;
  return (
    isText(anchor?.path, 1_000) &&
    (anchor.heading === null || isText(anchor.heading)) &&
    isText(anchor.label) &&
    isText(anchor.commit, 64) &&
    isText(anchor.digest, 64)
  );
}

function isNote(value: unknown): value is Note {
  const note = value as Partial<Note> | null;
  return (
    isText(note?.id, 64) &&
    NOTE_KINDS.includes(note.kind as NoteKind) &&
    isText(note.text, MAX_NOTE_CHARS) &&
    isText(note.group, 200) &&
    (note.anchor === null || isAnchor(note.anchor)) &&
    Array.isArray(note.links) &&
    note.links.length <= MAX_LINKS &&
    note.links.every((link) => isText(link, 600)) &&
    isTime(note.created) &&
    isTime(note.updated)
  );
}

function isEntity(value: unknown): value is ProposedEntity {
  const entity = value as Partial<ProposedEntity> | null;
  return (
    isText(entity?.id, 64) &&
    isText(entity.name, 200) &&
    PROPOSED_KINDS.includes(entity.kind!) &&
    (entity.lens === 'architecture' || entity.lens === 'infrastructure') &&
    (entity.anchor === null || (isText(entity.anchor?.path, 1_000) && isText(entity.anchor.label)))
  );
}

function isRelation(value: unknown): value is ProposedRelation {
  const relation = value as Partial<ProposedRelation> | null;
  return isText(relation?.id, 64) && isText(relation.from, 600) && isText(relation.to, 600) && isText(relation.label, 80);
}

/**
 * Stored thinking, checked: storage is the reader's own, but anything malformed (an older format, a
 * partial write) is dropped item by item rather than trusted or allowed to break the reader.
 */
export function parseThinking(value: unknown): Thinking | null {
  const stored = value as Partial<Record<keyof Thinking, unknown>> | null;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
  const list = (items: unknown) => (Array.isArray(items) ? items.slice(0, MAX_ITEMS) : []);
  return {
    notes: list(stored.notes).filter(isNote).slice(0, MAX_NOTES),
    entities: list(stored.entities).filter(isEntity),
    relations: list(stored.relations).filter(isRelation),
    docKinds: list(stored.docKinds).filter((pair): pair is [string, DocKind] => isPair(pair, isDocKind)),
    folderKinds: list(stored.folderKinds).filter((pair): pair is [string, DocKind] => isPair(pair, isDocKind)),
    entityKinds: list(stored.entityKinds).filter((pair): pair is [string, string] => isPair(pair, (kind) => isText(kind, 80))),
  };
}

/** The source of a section: from its heading to the next heading of the same or a higher level; null when it is gone. */
export function sectionText(src: string, heading: string | null): string | null {
  if (heading === null) return src;
  const { headings } = outlineDocument(src);
  const at = headings.findIndex((h) => h.id === heading);
  if (at === -1) return null;
  const next = headings.slice(at + 1).find((h) => h.level <= headings[at].level);
  return src
    .split('\n')
    .slice(headings[at].line - 1, next ? next.line - 1 : undefined)
    .join('\n');
}

/** What became of a note's anchor at the commit being read. */
export type AnchorState = 'current' | 'unchanged' | 'changed' | 'missing';
export const ANCHOR_STATES: Record<AnchorState, string> = {
  current: 'Written at this commit',
  unchanged: 'Unchanged since you wrote this',
  changed: 'The section changed since you wrote this: reconfirm',
  missing: 'The section is gone at this commit: detach the note from it, or delete the note',
};

export function anchorState(anchor: Anchor, commit: string, digestNow: string | null): AnchorState {
  if (anchor.commit === commit) return 'current';
  if (digestNow === null) return 'missing';
  return digestNow === anchor.digest ? 'unchanged' : 'changed';
}

/** How exported text refers to the project: links at the commit read, names for connected things. */
export interface ExportContext {
  name: string;
  ref: string | null;
  commit: string;
  date: string;
  link(path: string, heading: string | null): string;
  /** A connected item's name and what it is, or null when it no longer exists. */
  describe(id: string): string | null;
}

const indent = (text: string) => text.trim().replace(/\n/g, '\n  ');

/** The chosen notes, as Markdown a team can read: every source linked at its commit, every proposal labelled. */
export function exportMarkdown(thinking: Thinking, chosen: Set<string>, ctx: ExportContext): string {
  const notes = thinking.notes.filter((note) => chosen.has(note.id));
  const at = `${ctx.ref ?? 'default branch'} @ ${ctx.commit.slice(0, 7)}`;
  const out = [
    `# Notes on ${ctx.name}`,
    '',
    `Private notes exported from Galley on ${ctx.date}, read at ${at}. They are ideas and questions, not the project's documentation.`,
  ];
  const write = (note: Note) => {
    out.push(`- **${NOTE_NAMES[note.kind]}** (proposal): ${indent(note.text)}`);
    if (note.anchor)
      out.push(
        `  - About: [${note.anchor.label}](${ctx.link(note.anchor.path, note.anchor.heading)}) (documented; the note was written at ${note.anchor.commit.slice(0, 7)})`,
      );
    const linked = note.links.map((id) => ctx.describe(id)).filter((name): name is string => name !== null);
    if (linked.length) out.push(`  - Tentatively connected to: ${linked.join('; ')}`);
  };
  for (const kind of NOTE_KINDS) {
    const ofKind = notes.filter((note) => note.kind === kind);
    if (!ofKind.length) continue;
    if (kind !== 'alternative') {
      out.push('', `## ${NOTE_HEADINGS[kind]}`, '');
      ofKind.forEach(write);
      continue;
    }
    for (const group of [...new Set(ofKind.map((note) => note.group))]) {
      out.push('', `## Alternatives${group ? `: ${group}` : ''}`, '');
      ofKind.filter((note) => note.group === group).forEach(write);
    }
  }
  return `${out.join('\n')}\n`;
}

/** Text safe inside a Mermaid label: no quotes, brackets or line breaks, and short. */
function label(text: string): string {
  const flat = text
    .replace(/["`]/g, "'")
    .replace(/[[\](){}<>|#;\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > 60 ? `${flat.slice(0, 59)}…` : flat;
}

/** The chosen notes as a Mermaid flowchart: notes dashed as proposals, documents solid, connections dotted. */
export function exportMermaid(thinking: Thinking, chosen: Set<string>, ctx: ExportContext): string {
  const notes = thinking.notes.filter((note) => chosen.has(note.id));
  const ids = new Map(notes.map((note, i) => [note.id, `n${i + 1}`]));
  const docs = new Map<string, string>();
  const lines = ['flowchart LR'];
  for (const note of notes) lines.push(`  ${ids.get(note.id)}(["${label(`${NOTE_NAMES[note.kind]}: ${note.text}`)}"])`);
  for (const note of notes) {
    if (note.anchor) {
      const key = `${note.anchor.path}#${note.anchor.heading ?? ''}`;
      if (!docs.has(key)) {
        docs.set(key, `d${docs.size + 1}`);
        lines.push(`  ${docs.get(key)}["${label(note.anchor.label)}"]`);
      }
      lines.push(`  ${ids.get(note.id)} --- ${docs.get(key)}`);
    }
    for (const link of note.links) {
      const other = ids.get(link);
      if (other) lines.push(`  ${ids.get(note.id)} -. tentative .-> ${other}`);
      else {
        const name = ctx.describe(link);
        if (name === null) continue;
        const key = `link:${link}`;
        if (!docs.has(key)) {
          docs.set(key, `e${docs.size + 1}`);
          lines.push(`  ${docs.get(key)}["${label(name)}"]`);
        }
        lines.push(`  ${ids.get(note.id)} -. tentative .-> ${docs.get(key)}`);
      }
    }
  }
  if (notes.length) lines.push('  classDef proposal stroke-dasharray: 4 3', `  class ${[...ids.values()].join(',')} proposal`);
  return `${lines.join('\n')}\n`;
}
