#!/usr/bin/env node
// Reads a local checkout the way the repository reader reads a repository at one commit, with the same
// code (src/core), and reports what the project map would show: documents and where their types come
// from, links and the links the map cannot follow, decision records and their statuses, and what the
// configuration declares. For RFC 0049's validation (docs/how-to/validate-repository-reading.md): run it
// on Galley's own docs and on the repositories used in research sessions. Nothing leaves the machine.
//
//   npm run repo:report                       this repository
//   npm run repo:report -- ../other/checkout  another checkout
//   npm run repo:report -- --json             the same, as JSON
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// The configuration reader runs in a sandboxed frame in the extension, where it listens for the reader.
// Here it is called directly, so there is nothing to listen to.
globalThis.addEventListener ??= () => {};
const { buildLens } = await import('../src/core/architecture.ts');
const { collectDocs, configFormat } = await import('../src/core/discovery.ts');
const { classify, INDEX_BATCH, indexDocument, KIND_NAMES, ProjectIndex } = await import('../src/core/docindex.ts');
const { MAX_DOCUMENT_CHARS } = await import('../src/core/limits.ts');
const { readConfig } = await import('../src/ui/config-frame.ts');
const { MAX_CONFIG_CHARS } = await import('../src/core/architecture.ts');

const { values, positionals } = parseArgs({ allowPositionals: true, options: { json: { type: 'boolean', default: false } } });
const root = resolve(positionals[0] ?? '.');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

let commit;
let tracked;
try {
  commit = git('rev-parse', 'HEAD').trim();
  tracked = git('ls-files', '-z').split('\0').filter(Boolean);
} catch {
  console.error(`${root} is not a Git checkout. The report reads tracked files at one commit, as the reader does.`);
  process.exit(1);
}

const entries = tracked.map((path) => {
  try {
    return { path, type: 'blob', size: statSync(join(root, path)).size };
  } catch {
    return { path, type: 'blob' };
  }
});
const listing = collectDocs(entries, []);
const index = new ProjectIndex(listing.docs.map((doc) => doc.path));
const texts = new Map();
const tooLarge = [];
for (const doc of listing.docs) {
  if ((doc.size ?? 0) > MAX_DOCUMENT_CHARS) {
    tooLarge.push(doc.path);
    continue;
  }
  const text = readFileSync(join(root, doc.path), 'utf8');
  texts.set(doc.path, text);
  index.add(indexDocument(doc.path, text));
}

const configs = new Map();
const configNotes = [...listing.configs.limits];
for (const file of listing.configs.files) {
  if ((file.size ?? 0) > MAX_CONFIG_CHARS) {
    configNotes.push(`${file.path} is too large to read.`);
    continue;
  }
  const reading = readConfig(file.path, configFormat(file.path), readFileSync(join(root, file.path), 'utf8'));
  configs.set(file.path, reading);
  for (const note of reading.notes) configNotes.push(`${file.path}: ${note}`);
}

const corrections = { docs: new Map(), folders: new Map() };
const kinds = {};
const from = {};
for (const doc of index.docs.values()) {
  const { kind, from: source } = classify(doc, corrections);
  kinds[KIND_NAMES[kind]] = (kinds[KIND_NAMES[kind]] ?? 0) + 1;
  from[source] = (from[source] ?? 0) + 1;
}
const input = { index, corrections, configs, texts, proposed: { entities: [], relations: [] }, kinds: new Map() };
const decisions = buildLens('decisions', input);
const architecture = buildLens('architecture', input);
const infrastructure = buildLens('infrastructure', input);
const count = (model, origin) => model.entities.filter((entity) => entity.origin === origin).length;
const relations = (model, origin) => model.relations.filter((relation) => relation.origin === origin).length;

const report = {
  root,
  commit,
  listing: {
    tracked: tracked.length,
    documents: listing.docs.length,
    limits: listing.limits,
    tooLarge,
    // How many passes the map would take to read everything, at the reader's batch size.
    passes: Math.ceil(listing.docs.length / INDEX_BATCH),
  },
  types: { byKind: kinds, bySource: from },
  links: {
    connections: index.edges.length,
    evidence: index.edges.reduce((sum, edge) => sum + edge.evidence.length, 0),
    isolated: index.listed.filter((path) => !index.edges.some((edge) => edge.from === path || edge.to === path)).length,
    missingDocuments: index.problems
      .filter((problem) => problem.kind === 'missing-doc')
      .map((problem) => `${problem.from}:${problem.link.line} → ${problem.link.path}`),
    missingSections: index.problems
      .filter((problem) => problem.kind === 'missing-anchor')
      .map((problem) => `${problem.from}:${problem.link.line} → ${problem.link.path}#${problem.link.anchor}`),
  },
  decisions: {
    records: decisions.entities.filter((entity) => entity.kind === KIND_NAMES.decision).length,
    withoutStatus: decisions.entities.filter((entity) => entity.detail === 'No status stated').map((entity) => entity.id.slice(4)),
    conflicting: decisions.entities.filter((entity) => entity.notes.length).map((entity) => `${entity.id.slice(4)}: ${entity.notes.join(' ')}`),
    supersessions: decisions.relations.filter((relation) => relation.label === 'supersedes').length,
  },
  configuration: {
    files: listing.configs.files.length,
    notes: configNotes,
    architecture: { declared: count(architecture, 'declared'), suggestions: relations(architecture, 'suggested') },
    infrastructure: { declared: count(infrastructure, 'declared'), suggestions: relations(infrastructure, 'suggested') },
  },
};

if (values.json) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const list = (items, most = 12) => [
  ...items.slice(0, most).map((item) => `    ${item}`),
  ...(items.length > most ? [`    … and ${items.length - most} more`] : []),
];
const lines = [
  `Repository reading report for ${root}`,
  `at commit ${commit.slice(0, 7)}`,
  '',
  `Listing: ${report.listing.documents} Markdown documents of ${report.listing.tracked} tracked files; the map reads them in ${report.listing.passes} pass${report.listing.passes === 1 ? '' : 'es'}.`,
  ...report.listing.limits.map((limit) => `  ${limit}`),
  ...(tooLarge.length ? [`  Too large to read (${tooLarge.length}):`, ...list(tooLarge)] : []),
  '',
  `Types: ${Object.entries(kinds)
    .map(([kind, n]) => `${kind} ${n}`)
    .join(', ')}`,
  `  from front matter ${from.metadata ?? 0}, guessed from the path ${from.path ?? 0}, none found ${from.none ?? 0}`,
  '',
  `Links: ${report.links.connections} connections between documents, from ${report.links.evidence} links; ${report.links.isolated} documents link nowhere and are linked from nowhere.`,
  `  Links to documents that are not listed (${report.links.missingDocuments.length}):`,
  ...list(report.links.missingDocuments),
  `  Links to sections that do not exist (${report.links.missingSections.length}):`,
  ...list(report.links.missingSections),
  '',
  `Decisions: ${report.decisions.records} records, ${report.decisions.supersessions} supersessions stated.`,
  `  Without a status (${report.decisions.withoutStatus.length}):`,
  ...list(report.decisions.withoutStatus),
  `  Stating two statuses (${report.decisions.conflicting.length}):`,
  ...list(report.decisions.conflicting),
  '',
  `Configuration: ${report.configuration.files} files. Architecture: ${report.configuration.architecture.declared} declared, ${report.configuration.architecture.suggestions} unverified suggestions. Infrastructure: ${report.configuration.infrastructure.declared} declared, ${report.configuration.infrastructure.suggestions} unverified suggestions.`,
  ...list(configNotes),
];
console.log(lines.join('\n'));
