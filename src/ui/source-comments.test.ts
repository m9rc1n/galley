import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectFrame } from '../testing/sandbox.ts';
import type { DocRef, DocStatus } from '../platforms/types.ts';
import type { RenderedBlock } from './render.ts';
import { commentText } from './source-comments.ts';

const ref: DocRef = { path: 'src/limits.ts', oldPath: 'src/limits.ts', kind: 'code', status: 'modified' };
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
});
afterEach(() => document.body.replaceChildren());

/** A code file rendered as the reader does, with its comment lines found by the real highlighter. */
async function highlighted(base: string, head: string, file: DocRef = ref) {
  const { renderCodeFile } = await import('./code-files.ts');
  const { highlightCode } = await import('./code.ts');
  const { serveHighlights } = await import('./highlight-frame.ts');
  const r = renderCodeFile(document, file, { base, head });
  document.body.append(r.content);
  const done = highlightCode(r.content);
  // One highlighter frame serves the whole test; only the first file has to connect it.
  if (!document.querySelector('iframe[data-connected]')) await connectFrame('highlight-frame.html', serveHighlights);
  await done;
  const input = { path: file.path, status: file.status, base, head, links: { raw: (p: string) => p, blob: (p: string) => p }, origin: location.origin };
  return { r, input };
}
async function notes(base: string, head: string, file: DocRef = ref) {
  const { renderSourceComments, showCommentSource } = await import('./source-comments.ts');
  const { r, input } = await highlighted(base, head, file);
  return { r, shown: renderSourceComments(r, input), showCommentSource };
}
const text = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map((el) => el.textContent);

it('takes comment syntax off every line without moving the lines, whatever the language', () => {
  const rows = (...sources: string[]) => sources.map((source, line) => ({ head: { source, lines: [line + 4, line + 5] } }) as unknown as RenderedBlock);
  expect(commentText(rows('/**', ' * Each client gets **its own** quota.', ' */'), 'head')).toEqual({
    text: '\nEach client gets **its own** quota.\n',
    start: 4,
  });
  expect(commentText(rows('/* one line */'), 'head').text).toBe('one line');
  expect(commentText(rows('// slashes', '/// triple', '# hash', '-- dashes', '; semicolon', '<!-- markup -->'), 'head').text).toBe(
    'slashes\ntriple\nhash\ndashes\nsemicolon\nmarkup',
  );
  expect(commentText(rows('// head only'), 'base')).toEqual({ text: '', start: 0 });
});

it('reads a doc comment as a formatted note, labelled with its lines, with the source one switch away', async () => {
  const { r, shown, showCommentSource } = await notes(
    '/**\n * One shared limit.\n */\nexport const limit = 10;\n',
    '/**\n * A **fair** limit for each client.\n */\nexport const limit = 100;\n',
  );
  expect(shown).toBe(true);
  const note = r.content.querySelector<HTMLElement>('.mr-source-comment')!;
  expect(note.querySelector('.mr-source-comment-meta')!.textContent).toBe('Doc comment · lines 1–3');
  expect(note.querySelector('.mr-source-comment-body strong')!.textContent).toBe('fair');
  expect(note.querySelector('.mr-source-comment-body')!.textContent).not.toMatch(/\*\/|\/\s*$/);
  // The comment's own rows move into the note, so they read as one thing in either view. The reader picks
  // the view (Reading settings → Review → Code comments).
  const source = note.querySelector<HTMLElement>('.mr-source-comment-source')!;
  expect(source.hidden).toBe(true);
  expect(source.querySelectorAll('.mr-code-line').length).toBeGreaterThan(0);
  showCommentSource(r, true);
  expect(r.content.classList.contains('is-comment-source')).toBe(true);
  expect(source.hidden).toBe(false);
  expect(note.querySelector<HTMLElement>('.mr-source-comment-body')!.hidden).toBe(true);
  showCommentSource(r, false);
  expect(source.hidden).toBe(true);
  // Rendering twice changes nothing.
  const { renderSourceComments } = await import('./source-comments.ts');
  expect(renderSourceComments(r, { path: ref.path, status: ref.status, base: '', head: '', links: { raw: (p) => p, blob: (p) => p }, origin: '' })).toBe(false);
});

it('reads an edited one-line comment as one note with the words changed, beside its code', async () => {
  const { r } = await notes(
    'const a = 1;\n// A new client starts with the shared quota.\nconst quota = 10;\n',
    'const a = 1;\n// A new client starts with a full quota.\nconst quota = 100;\n',
  );
  expect(r.content.querySelectorAll('.mr-source-comment')).toHaveLength(1);
  expect(r.content.querySelector('.mr-source-comment-meta')!.textContent).toBe('Comment · line 2');
  expect(text(r.content, '.mr-source-comment-body del')).toEqual(['the shared']);
  expect(text(r.content, '.mr-source-comment-body ins')).toEqual(['a full']);
  // A selection from the code above into the note has no single place to post, so it offers none.
  const { selectionTarget } = await import('./reading.ts');
  const range = document.createRange();
  range.setStart(r.blocks.find((block) => block.head?.text === 'const a = 1;')!.el.querySelector('.mr-code-text')!, 0);
  range.setEnd(r.content.querySelector('.mr-source-comment-body ins')!.firstChild!, 1);
  expect(selectionTarget(ref, r.blocks, range)).toBeNull();
  // The changed comment lines show in the reading view; the unchanged comment would not need to.
  expect(r.blocks.filter((block) => block.el.closest('.mr-source-comment-body')).every((block) => 'mrSpecContext' in block.el.dataset)).toBe(true);
});

it('keeps separate notes apart, labels a removed comment by its old line, and marks unchanged ones quietly', async () => {
  const { r } = await notes(
    '# Explains the default.\nvalue = 1\n# Removed note.\nother = 2\n# Kept note.\nlast = 3\n',
    '# Explains the default.\nvalue = 1\nother = 2\nnew = 4\n# Added note.\n# Kept note.\nlast = 3\n',
    { ...ref, path: 'settings.py', oldPath: 'settings.py' },
  );
  // An added line joined to an unchanged one is still one comment in the new file, so it reads as one note.
  expect(text(r.content, '.mr-source-comment-meta')).toEqual(['Comment · line 1', 'Comment · old line 3', 'Comment · lines 5–6']);
  const unchanged = r.blocks.find((block) => block.el.closest('.mr-source-comment-body') && block.head?.text === 'Explains the default.')!;
  expect('mrSpecContext' in unchanged.el.dataset).toBe(false);
});

it('says when part of a comment change only shows in Source, and reads removed files from their old version', async () => {
  const hint = await notes(
    '// See the [guide].\n//\n// [guide]: https://old.example/\nx();\n',
    '// See the [guide].\n//\n// [guide]: https://new.example/\nx();\n',
  );
  expect(hint.r.content.querySelector('.mr-source-comment-hint')!.textContent).toBe('Some comment changes only appear in Source.');
  const removed = await notes('// Gone with the file.\nx();\n', '', { ...ref, status: 'removed' as DocStatus });
  expect(removed.r.content.querySelector('.mr-source-comment-meta')!.textContent).toBe('Comment · old line 1');
  expect(removed.r.blocks.find((block) => block.el.closest('.mr-source-comment-body'))!.base!.lines[0]).toBe(0);
});

it('leaves the file as source when nothing can be read as prose, or reading it would cost too much', async () => {
  const { renderSourceComments } = await import('./source-comments.ts');
  const plain = await highlighted('const a = 1;\n', 'const a = 2;\n');
  expect(renderSourceComments(plain.r, plain.input)).toBe(false);
  const empty = await highlighted('//\n//\nconst a = 1;\n', '//\n//\nconst a = 2;\n');
  expect(renderSourceComments(empty.r, empty.input)).toBe(false);
  const big = await highlighted('// note\nx();\n', '// note\ny();\n');
  expect(renderSourceComments(big.r, { ...big.input, head: 'x'.repeat(200_001) })).toBe(false);
  const many = await highlighted('// note\nx();\n', '// note\ny();\n');
  many.r.blocks.push(...Array.from({ length: 10_001 }, () => many.r.blocks[0]));
  expect(renderSourceComments(many.r, many.input)).toBe(false);
  const runs = Array.from({ length: 501 }, (_, i) => `// note ${i}\nx${i}();`).join('\n');
  const crowded = await highlighted(runs, runs.replace('x0()', 'y0()'));
  expect(renderSourceComments(crowded.r, crowded.input)).toBe(false);
  // Not highlighted yet: there is nothing to tell comments from code.
  const { renderCodeFile } = await import('./code-files.ts');
  const raw = renderCodeFile(document, ref, { base: '// a\n', head: '// b\n' });
  expect(renderSourceComments(raw, many.input)).toBe(false);
});

it('never lets a note gather lines from two containers', async () => {
  const { renderSourceComments } = await import('./source-comments.ts');
  const split = await highlighted('// first\n// second\nx();\n', '// first\n// second\ny();\n');
  const elsewhere = split.r.content.ownerDocument.createElement('div');
  split.r.content.append(elsewhere);
  elsewhere.append(split.r.blocks[1].el);
  expect(renderSourceComments(split.r, split.input)).toBe(true);
  expect(split.r.content.querySelectorAll('.mr-source-comment')).toHaveLength(2);
});
