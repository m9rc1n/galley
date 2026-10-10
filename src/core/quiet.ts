import { boundedDiff } from './limits.ts';
import type { DocContents, DocRef } from '../platforms/types.ts';

/** A changed file most reviewers can skip: what it is, why it is folded, and how much changed. */
export interface QuietFile {
  label: string;
  reason: string;
  added: number;
  removed: number;
}

const LOCKFILE =
  /^(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lock|deno\.lock|Cargo\.lock|Gemfile\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|pdm\.lock|composer\.lock|go\.sum|mix\.lock|pubspec\.lock|Podfile\.lock|Package\.resolved|packages\.lock\.json|flake\.lock|gradle\.lockfile|\.terraform\.lock\.hcl)$/i;
const MINIFIED = /[.-]min\.(?:[cm]?js|css)$/i;
const VENDORED = /(?:^|\/)(?:vendor|node_modules|third_party|bower_components)\//;
const BUILT = /(?:^|\/)dist\//;
const GENERATED_NAME = /(?:\.pb\.go|_pb2(?:_grpc)?\.pyi?|\.g\.dart|\.freezed\.dart|\.designer\.cs|[._-]generated\.\w+|\.gen\.\w+)$/i;
const GENERATED_FOLDER = /(?:^|\/)(?:__generated__|generated)\//;
const SNAPSHOT = /\.snap$|(?:^|\/)__snapshots__\//;
const GENERATED_MARK = /@generated\b|\bDO NOT EDIT\b|\bauto-?generated\b|\bautomatically generated\b/i;
/** Where indentation is meaning, a whitespace change is a real change. */
const INDENTED = /\.(?:py|pyi|ya?ml|sass|styl|pug|jade|haml|slim|coffee|nim|fs|fsx|fsi|hs|elm|mk)$|(?:^|\/)(?:GNU)?[Mm]akefile$/;

type Kind = Pick<QuietFile, 'label' | 'reason'>;

/** What the path alone says, before the file loads: enough to put these files last in the reading order. */
export function quietPath(doc: DocRef): Kind | null {
  const path = doc.status === 'removed' ? doc.oldPath : doc.path;
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (VENDORED.test(path)) return { label: 'Vendored', reason: 'Third-party code kept in the repository.' };
  if (doc.kind !== 'code') return null;
  if (LOCKFILE.test(name)) return { label: 'Lockfile', reason: 'Written by a package manager when dependencies change.' };
  if (MINIFIED.test(name)) return { label: 'Minified', reason: 'Built from other source and squeezed onto few lines.' };
  if (BUILT.test(path)) return { label: 'Build output', reason: 'Built from other source, in a dist folder.' };
  if (GENERATED_NAME.test(name)) return { label: 'Generated', reason: 'Written by a tool, as its name says.' };
  if (GENERATED_FOLDER.test(path)) return { label: 'Generated', reason: 'Written by a tool, in a generated folder.' };
  if (SNAPSHOT.test(path)) return { label: 'Snapshot', reason: 'Test output saved by the test runner.' };
  if (/\.svg$/i.test(name)) return { label: 'Vector image', reason: 'Image markup, rarely read line by line.' };
  return null;
}

function kindOf(doc: DocRef, { base, head }: DocContents): Kind | null {
  if (doc.status === 'renamed' && base === head) return { label: 'Renamed', reason: `Renamed from ${doc.oldPath}, text unchanged.` };
  const byPath = quietPath(doc);
  if (byPath) return byPath;
  if (doc.kind !== 'code') return null;
  const name = doc.path.slice(doc.path.lastIndexOf('/') + 1);
  const current = doc.status === 'removed' ? base : head;
  if (current.split('\n', 5).some((line) => GENERATED_MARK.test(line))) return { label: 'Generated', reason: 'Marked as generated in its first lines.' };
  const words = (text: string) => text.split(/\s+/).filter(Boolean).join(' ');
  if (base && head && base !== head && !INDENTED.test(name) && words(base) === words(head))
    return { label: 'Whitespace only', reason: 'Only spaces, tabs or line breaks changed.' };
  return null;
}

/** Folded files are still one click away; this only decides what the reader shows first. */
export function quietFile(doc: DocRef, contents: DocContents): QuietFile | null {
  const kind = kindOf(doc, contents);
  if (!kind) return null;
  const lines = (text: string) => {
    const rows = text.replace(/\r\n/g, '\n').split('\n');
    if (rows.at(-1) === '') rows.pop();
    return rows;
  };
  let added = 0;
  let removed = 0;
  for (const part of boundedDiff(lines(contents.base), lines(contents.head))) {
    if (part.added) added += part.value.length;
    if (part.removed) removed += part.value.length;
  }
  return { ...kind, added, removed };
}
