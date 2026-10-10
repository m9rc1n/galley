import { classify, KIND_NAMES, type Corrections, type ProjectIndex } from './docindex.ts';

/**
 * Architecture, infrastructure and decision views of the project map. Everything in them says where it
 * comes from: a document, a configuration file, the reader, or a guess Galley labels as unverified.
 * Configuration says what the files ask for, never what is running.
 */

// ---------------------------------------------------------------- what configuration declares (config-frame.ts)

export type DeclaredKind = 'service' | 'workflow' | 'job' | 'stage' | 'environment' | 'workload' | 'resource' | 'module';
export type DeclaredLabel = 'depends on' | 'needs' | 'deploys to' | 'in stage' | 'runs';

/** Something a configuration file declares. `key` identifies it across files, so two files can name the same thing. */
export interface DeclaredItem {
  key: string;
  name: string;
  kind: DeclaredKind;
  /** One-based line of the declaration. */
  line: number;
  /** A short fact from the declaration, such as an image or a Kubernetes kind. */
  detail: string;
}

export interface DeclaredLink {
  from: string;
  to: string;
  label: DeclaredLabel;
  line: number;
}

/** Larger configuration files are listed as not read: they are rarely hand-written, and the frame must answer quickly. */
export const MAX_CONFIG_CHARS = 256_000;

export interface ConfigReading {
  items: DeclaredItem[];
  links: DeclaredLink[];
  /** What the file holds that was not read, in plain words. */
  notes: string[];
}

// ---------------------------------------------------------------- the views

export type Origin = 'documented' | 'declared' | 'reader' | 'suggested';
export const ORIGIN_NAMES: Record<Origin, string> = {
  documented: 'Documented',
  declared: 'Declared in configuration',
  reader: 'Proposed by you',
  suggested: 'Unverified suggestion',
};

export type LensName = 'architecture' | 'infrastructure' | 'decisions';

/** Where something is said: a file, a line, and the words or value found there. */
export interface Evidence {
  path: string;
  line: number;
  quote: string;
}

export interface Entity {
  id: string;
  name: string;
  kind: string;
  origin: Origin;
  detail: string;
  evidence: Evidence[];
  /** The document this entity is, when it is one: it opens in the reader and on the map. */
  doc: string | null;
  /** Caveats and conflicts, stated rather than resolved: two statuses, a reference nothing declares. */
  notes: string[];
  /** The kind the source gave, when the reader set another: both stay visible. */
  correctedFrom: string | null;
}

export interface Relation {
  from: string;
  to: string;
  label: string;
  origin: Origin;
  evidence: Evidence[];
}

export interface LensModel {
  entities: Entity[];
  relations: Relation[];
}

/** A component, service or environment the reader proposes, anchored to where they read about it. */
export interface ProposedEntity {
  id: string;
  name: string;
  kind: string;
  lens: 'architecture' | 'infrastructure';
  anchor: { path: string; label: string } | null;
}

export interface ProposedRelation {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface ArchitectureInput {
  index: ProjectIndex;
  corrections: Corrections;
  /** Configuration read so far, by file path. */
  configs: Map<string, ConfigReading>;
  /** Source of documents read so far, for suggestions. */
  texts: Map<string, string>;
  proposed: { entities: ProposedEntity[]; relations: ProposedRelation[] };
  /** Kinds the reader set for entities, by entity id. */
  kinds: Map<string, string>;
}

export const PROPOSED_KINDS = ['Component', 'Service', 'Data store', 'Interface', 'Environment', 'Deployment unit'];
const DECLARED_KIND_NAMES: Record<DeclaredKind, string> = {
  service: 'Service',
  workflow: 'Workflow',
  job: 'Job',
  stage: 'Stage',
  environment: 'Environment',
  workload: 'Workload',
  resource: 'Resource',
  module: 'Module',
};
const LENS_OF: Record<DeclaredKind, 'architecture' | 'infrastructure'> = {
  service: 'architecture',
  workflow: 'infrastructure',
  job: 'infrastructure',
  stage: 'infrastructure',
  environment: 'infrastructure',
  workload: 'infrastructure',
  resource: 'infrastructure',
  module: 'infrastructure',
};
/** Documents a name is looked for in, for unverified suggestions in each view. */
const MENTIONED_IN: Record<'architecture' | 'infrastructure', Set<string>> = {
  architecture: new Set(['architecture', 'overview', 'spec', 'decision', 'guide']),
  infrastructure: new Set(['runbook', 'architecture', 'guide', 'overview']),
};
/** Most unverified suggestions in one view, so a common word cannot flood it. */
export const MAX_SUGGESTIONS = 200;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** By kind, then by name with numbers in order, so ADR 9 comes before ADR 12 on every machine. */
const byName = (a: Entity, b: Entity) => Number(a.kind > b.kind) - Number(a.kind < b.kind) || a.name.localeCompare(b.name, 'en', { numeric: true });

/** The first line of `text` that names `name` as a whole word, or 0. */
export function mentionLine(name: string, text: string): number {
  const word = new RegExp(`(?:^|[^\\p{L}\\p{N}_-])${escapeRegExp(name)}(?:$|[^\\p{L}\\p{N}_-])`, 'iu');
  const lines = text.split('\n');
  const i = lines.findIndex((line) => word.test(line));
  return i + 1;
}

class Builder {
  readonly entities = new Map<string, Entity>();
  readonly relations: Relation[] = [];
  private readonly kinds: Map<string, string>;
  // Plain fields rather than parameter properties, so Node can load this file as it is (scripts/repo-report.mjs).
  constructor(kinds: Map<string, string>) {
    this.kinds = kinds;
  }

  entity(id: string, init: Omit<Entity, 'id' | 'evidence' | 'notes' | 'correctedFrom'>, evidence?: Evidence): Entity {
    let entity = this.entities.get(id);
    if (!entity) {
      const kind = this.kinds.get(id);
      entity = { id, ...init, kind: kind ?? init.kind, evidence: [], notes: [], correctedFrom: kind && kind !== init.kind ? init.kind : null };
      this.entities.set(id, entity);
    }
    if (evidence) entity.evidence.push(evidence);
    return entity;
  }

  relation(from: string, to: string, label: string, origin: Origin, evidence: Evidence[]): void {
    const same = this.relations.find((r) => r.from === from && r.to === to && r.label === label && r.origin === origin);
    if (same) same.evidence.push(...evidence);
    else this.relations.push({ from, to, label, origin, evidence });
  }

  done(): LensModel {
    return { entities: [...this.entities.values()].sort(byName), relations: this.relations };
  }
}

function documentEntity(build: Builder, input: ArchitectureInput, path: string): Entity {
  const doc = input.index.docs.get(path);
  const kind = doc ? classify(doc, input.corrections).kind : 'other';
  return build.entity(`doc:${path}`, { name: doc?.title ?? path, kind: KIND_NAMES[kind], origin: 'documented', detail: path, doc: path });
}

/** Configuration and the reader's own components, with unverified suggestions of where documents name them. */
function systemView(lens: 'architecture' | 'infrastructure', input: ArchitectureInput): LensModel {
  const build = new Builder(input.kinds);
  const where = new Map<string, Evidence>();
  for (const [path, reading] of [...input.configs].sort(([a], [b]) => Number(a > b) - Number(a < b))) {
    for (const item of reading.items) {
      const evidence = { path, line: item.line, quote: item.detail || item.name };
      where.set(item.key, evidence);
      if (LENS_OF[item.kind] === lens)
        build.entity(item.key, { name: item.name, kind: DECLARED_KIND_NAMES[item.kind], origin: 'declared', detail: item.detail, doc: null }, evidence);
    }
  }
  for (const [path, reading] of input.configs) {
    for (const link of reading.links) {
      const from = build.entities.get(link.from);
      if (!from) continue;
      let to = build.entities.get(link.to);
      if (!to && !where.has(link.to)) {
        // Named in configuration but declared in no file read: shown, and said.
        const name = link.to.slice(link.to.lastIndexOf(':') + 1);
        to = build.entity(link.to, {
          name,
          kind: DECLARED_KIND_NAMES[link.to.slice(0, link.to.indexOf(':')) as DeclaredKind] ?? 'Unknown',
          origin: 'declared',
          detail: '',
          doc: null,
        });
        to.notes.push('Referenced in configuration, but declared in no file Galley read.');
      }
      if (to) build.relation(from.id, to.id, link.label, 'declared', [{ path, line: link.line, quote: `${from.name} ${link.label} ${to.name}` }]);
    }
  }
  for (const proposed of input.proposed.entities) {
    if (proposed.lens !== lens) continue;
    const entity = build.entity(proposed.id, { name: proposed.name, kind: proposed.kind, origin: 'reader', detail: '', doc: null });
    if (proposed.anchor)
      build.relation(entity.id, documentEntity(build, input, proposed.anchor.path).id, 'described in', 'reader', [
        { path: proposed.anchor.path, line: 1, quote: proposed.anchor.label },
      ]);
  }
  for (const relation of input.proposed.relations) {
    if (build.entities.has(relation.from) && build.entities.has(relation.to)) build.relation(relation.from, relation.to, relation.label, 'reader', []);
  }
  // Suggestions: a document that names an entity may describe it. Galley says so, and never more.
  let suggestions = 0;
  const named = [...build.entities.values()].filter((entity) => !entity.doc && entity.name.length >= 3);
  for (const [path, text] of [...input.texts].sort(([a], [b]) => Number(a > b) - Number(a < b))) {
    const doc = input.index.docs.get(path);
    if (!doc || !MENTIONED_IN[lens].has(classify(doc, input.corrections).kind)) continue;
    for (const entity of named) {
      const line = mentionLine(entity.name, text);
      if (!line || suggestions >= MAX_SUGGESTIONS) continue;
      suggestions++;
      // The words as a reader sees them: without the marks that make a line a heading, list item or quote.
      const quote = text
        .split('\n')
        [line - 1].replace(/^\s*(?:#{1,6}|[-*+>]|\d+[.)])\s+/, '')
        .trim();
      build.relation(entity.id, documentEntity(build, input, path).id, 'named in', 'suggested', [{ path, line, quote: quote.slice(0, 160) }]);
    }
  }
  return build.done();
}

/** Front matter numbers such as `rfcs: [36, 49]` or `superseded-by: 0024`, as numbers. */
function numbers(value: string | undefined): number[] {
  return (value ?? '').match(/\d+/g)?.map(Number) ?? [];
}

/** Decision records: their status, which supersede which, and what they link to or name, as written. */
function decisionsView(input: ArchitectureInput): LensModel {
  const build = new Builder(input.kinds);
  const { index } = input;
  const kindOf = (path: string) => classify(index.docs.get(path)!, input.corrections).kind;
  const numbered = (n: number, kind: string) =>
    index.listed.find((path) => index.docs.has(path) && kindOf(path) === kind && Number(/^(\d+)-/.exec(path.slice(path.lastIndexOf('/') + 1))?.[1]) === n);
  for (const doc of index.docs.values()) {
    if (doc.unread || kindOf(doc.path) !== 'decision') continue;
    const statusAt = doc.headings.find((heading) => /^status$/i.test(heading.text))?.line ?? 1;
    const entity = documentEntity(build, input, doc.path);
    entity.detail = doc.status ?? 'No status stated';
    entity.evidence.push({ path: doc.path, line: doc.status ? statusAt : 1, quote: doc.status ?? doc.title });
    if (doc.statusAlso) entity.notes.push(`Its front matter says “${doc.status}”, and its Status section says “${doc.statusAlso}”.`);
    for (const link of doc.links) {
      const target = link.path === null ? null : index.documentAt(link.path);
      if (!target || target === doc.path || !index.docs.has(target)) continue;
      const kind = kindOf(target);
      if (kind !== 'decision' && kind !== 'spec') continue;
      const evidence = [{ path: doc.path, line: link.line, quote: link.text || link.href }];
      const status = /^status$/i.test(link.section ?? '') ? (doc.statusAlso ?? doc.status ?? '') : '';
      if (kind === 'decision' && /superseded by/i.test(status))
        build.relation(documentEntity(build, input, target).id, entity.id, 'supersedes', 'documented', evidence);
      else if (kind === 'decision' && /supersedes/i.test(status))
        build.relation(entity.id, documentEntity(build, input, target).id, 'supersedes', 'documented', evidence);
      else build.relation(entity.id, documentEntity(build, input, target).id, 'links to', 'documented', evidence);
    }
    const stated: Array<[string, string, string, boolean]> = [
      ['supersedes', 'decision', 'supersedes', false],
      ['superseded-by', 'decision', 'supersedes', true],
      ['rfcs', 'spec', 'names', false],
    ];
    for (const [field, kind, label, reverse] of stated) {
      for (const n of numbers(doc.meta[field])) {
        const target = numbered(n, kind);
        if (!target || target === doc.path) continue;
        const other = documentEntity(build, input, target).id;
        const evidence = [{ path: doc.path, line: 1, quote: `${field}: ${doc.meta[field]}` }];
        if (reverse) build.relation(other, entity.id, label, 'documented', evidence);
        else build.relation(entity.id, other, label, 'documented', evidence);
      }
    }
  }
  return build.done();
}

export function buildLens(lens: LensName, input: ArchitectureInput): LensModel {
  return lens === 'decisions' ? decisionsView(input) : systemView(lens, input);
}
