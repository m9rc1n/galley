import { boundedDiff } from '../core/limits.ts';
import { languageOf, registerCode, setIndent } from './code.ts';
import type { Unit } from '../core/markdown.ts';
import { ReaderError, type DocContents, type DocRef } from '../platforms/types.ts';
import type { RenderedBlock, RenderedDoc } from './render.ts';

/** Plain source text never passes through Markdown or HTML parsing. */
export function renderCodeFile(doc: Document, ref: DocRef, contents: DocContents): RenderedDoc {
  if (contents.base.includes('\0') || contents.head.includes('\0')) throw new ReaderError('This file contains binary data. Open it in the platform diff.');
  if (Math.max(contents.base.length, contents.head.length) > 500_000) throw new ReaderError('This source file is too large for the reader. Open it in the platform diff.');
  const lines = (text: string) => { const rows = text.replace(/\r\n/g, '\n').split('\n'); if (rows.at(-1) === '') rows.pop(); return rows; };
  const root = doc.createElement('div'); root.className = 'mr-content mr-code-file';
  const code = doc.createElement('div'); code.className = 'mr-code-lines'; root.append(code);
  registerCode(code, { language: languageOf(ref.path), base: contents.base.replace(/\r\n/g, '\n'), head: contents.head.replace(/\r\n/g, '\n') });
  const blocks: RenderedBlock[] = [], changes: HTMLElement[] = [];
  const stats = { added: 0, removed: 0, modified: 0 };
  let baseLine = 0, headLine = 0, serial = 0, inChange = false;
  const unit = (text: string, line: number): Unit => ({ id: ++serial, kind: 'code', key: text, text, source: text, lines: [line, line + 1], inList: false, level: 0, links: [] });
  for (const part of boundedDiff(lines(contents.base), lines(contents.head))) {
    for (const text of part.value) {
      const kind = part.added ? 'added' : part.removed ? 'removed' : 'same';
      const base = part.added ? undefined : unit(text, baseLine++);
      const head = part.removed ? undefined : unit(text, headLine++);
      const row = doc.createElement('div'); row.className = 'mr-code-line';
      row.dataset.mrSide = kind === 'removed' ? 'base' : 'head';
      if (kind !== 'same') { row.dataset.mrChange = kind; stats[kind]++; }
      if (kind === 'removed' && ref.status !== 'removed') row.classList.add('mr-ghost');
      for (const [value, className] of [[base ? String(base.lines[0] + 1) : '', 'mr-code-number'], [head ? String(head.lines[0] + 1) : '', 'mr-code-number'], [part.added ? '+' : part.removed ? '−' : '', 'mr-code-sign']] as const) {
        const label = doc.createElement('span'); label.className = className; label.textContent = value; label.setAttribute('aria-hidden', 'true'); row.append(label);
      }
      const source = doc.createElement('span'); source.className = 'mr-code-text'; source.textContent = text;
      source.dataset.line = kind === 'removed' ? `b:${base!.lines[0]}` : `h:${head!.lines[0]}`;
      setIndent(source, text);
      row.append(source);
      blocks.push({ el: row, kind, base, head }); code.append(row);
      if (kind !== 'same' && !inChange) changes.push(row);
      inChange = kind !== 'same';
    }
  }
  return { content: root, blocks, changes, stats, diagrams: [], isCode: true, lead: null, title: ref.path.split('/').pop() ?? ref.path, description: null, words: 0, heldImages: 0, hiddenLines: 0 };
}
