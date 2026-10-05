import { ReaderError, type CommentTarget, type DocRef } from './types.ts';

export interface DiffLine { oldLine?: number; newLine?: number; oldPos: number; newPos: number; hunk: number }

/** Only lines actually present in a platform patch may receive an inline comment. */
export function diffLines(patch = ''): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 0, newLine = 0, hunk = -1;
  for (const line of patch.split('\n')) {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (match) { oldLine = Number(match[1]); newLine = Number(match[2]); hunk++; continue; }
    if (hunk < 0) continue;
    const positions = { oldPos: oldLine, newPos: newLine };
    if (line.startsWith('+')) result.push({ newLine: newLine++, ...positions, hunk });
    else if (line.startsWith('-')) result.push({ oldLine: oldLine++, ...positions, hunk });
    else if (line.startsWith(' ')) result.push({ oldLine: oldLine++, newLine: newLine++, ...positions, hunk });
  }
  return result;
}

export function diffRange(patch: string | undefined, target: CommentTarget): DiffLine[] | null {
  const key = target.side === 'base' ? 'oldLine' : 'newLine';
  const lines = diffLines(patch).filter((row) => row[key] !== undefined && row[key]! >= target.startLine && row[key]! <= target.endLine);
  if (lines.length !== target.endLine - target.startLine + 1 || lines.some((row) => row.hunk !== lines[0].hunk)) return null;
  return lines;
}

export function validateTarget(docs: DocRef[], target: CommentTarget): void {
  if (!docs.includes(target.doc) || !Number.isInteger(target.startLine) || !Number.isInteger(target.endLine) || target.startLine < 1 || target.endLine < target.startLine || (target.side !== 'base' && target.side !== 'head')) {
    throw new ReaderError('Select a paragraph in this review before commenting.');
  }
}

export function commentContext(target: CommentTarget, body: string): string {
  const path = target.side === 'base' ? target.doc.oldPath : target.doc.path;
  const context = `${path} · ${target.side === 'base' ? 'old' : 'new'} lines ${target.startLine}–${target.endLine}`;
  const quote = target.quote ? `\n\n${target.quote.split('\n').map((line) => `> ${line}`).join('\n')}` : '';
  return `${body.trim()}\n\n---\n${context}${quote}`;
}

export function requireBody(body: string): void {
  if (!body.trim()) throw new ReaderError('Write a comment before posting.');
}
