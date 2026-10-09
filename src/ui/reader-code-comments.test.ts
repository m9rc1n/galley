import { expect, it, vi } from 'vitest';
import { readerHarness, review } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';
import { serveHighlights } from './highlight-frame.ts';
import type { CommentTarget, DocRef } from '../platforms/types.ts';

const ui = readerHarness();
const file: DocRef = { path: 'src/limits.ts', oldPath: 'src/limits.ts', kind: 'code', status: 'modified' };
const base = '/**\n * One shared limit.\n */\nexport const limit = 10;\n';
const head = '/**\n * A **fair** limit for each client.\n */\nexport const limit = 100;\n';
const buttons = (setting: string) =>
  [...ui.shadow().querySelectorAll(`[data-setting="${setting}"] button`)].map((el) => [el.textContent, el.getAttribute('aria-pressed')]);
const write = (composer: HTMLFormElement, text: string) => {
  const field = composer.querySelector('textarea')!;
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

it('shows code comments formatted or as written from Review settings, and keeps every draft beside its line', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const prepareComment = vi.fn(async (_target: CommentTarget) => ({
    kind: 'inline' as const,
    label: 'Inline comment',
    post: async () => ({ url: '#posted' }),
  }));
  await ui.open({ ...review({ docs: [], codeDocs: [file], load: async () => ({ base, head }) }), prepareComment });
  await connectFrame('highlight-frame.html', serveHighlights, ui.shadow());
  await vi.waitFor(() => expect(ui.q('.mr-source-comment')).toBeTruthy());
  expect(buttons('tests')).toEqual([
    ['Test plan', 'true'],
    ['Whole file', 'false'],
  ]);
  expect(buttons('codeComments')).toEqual([
    ['Formatted', 'true'],
    ['Source', 'false'],
  ]);
  expect(ui.q('.mr-source-comment-body strong').textContent).toBe('fair');

  // One draft on the note, one on code outside it.
  const onNote = await ui.commentOn('.mr-source-comment-body [data-mr-change="added"]');
  expect(prepareComment).toHaveBeenLastCalledWith(expect.objectContaining({ side: 'head', startLine: 2, endLine: 2 }));
  write(onNote, 'Per client, or per key?');
  const onCode = await ui.commentOn('.mr-code-lines > .mr-code-line[data-mr-change="added"]');
  write(onCode, 'Is 100 enough for uploads?');

  ui.click('[data-setting="codeComments"] [data-value="source"]');
  ui.flushFrame();
  expect(buttons('codeComments')).toEqual([
    ['Formatted', 'false'],
    ['Source', 'true'],
  ]);
  expect(ui.q('.mr-source-comment-source').hidden).toBe(false);
  expect(ui.q('.mr-source-comment-body').hidden).toBe(true);
  expect([onNote, onCode].map((composer) => [composer.hidden, composer.querySelector('textarea')!.value])).toEqual([
    [false, 'Per client, or per key?'],
    [false, 'Is 100 enough for uploads?'],
  ]);

  // The opening /** has no place in the formatted note, so its draft stays with the note as a whole.
  const onOpener = await ui.commentOn('.mr-source-comment-source .mr-code-line');
  expect(prepareComment).toHaveBeenLastCalledWith(expect.objectContaining({ side: 'head', startLine: 1, endLine: 1 }));
  write(onOpener, 'Could this be a one-line comment?');
  ui.click('[data-setting="codeComments"] [data-value="formatted"]');
  ui.flushFrame();
  expect(ui.q('.mr-source-comment-source').hidden).toBe(true);
  expect([onNote, onCode, onOpener].map((composer) => composer.hidden)).toEqual([false, false, false]);
  expect(onOpener.querySelector('textarea')!.value).toBe('Could this be a one-line comment?');
});

it('reads the comments of a removed file from its old version', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true, codeComments: 'source' }));
  const gone: DocRef = { ...file, path: 'src/gone.ts', oldPath: 'src/gone.ts', status: 'removed' };
  await ui.open(review({ docs: [], codeDocs: [gone], load: async () => ({ base: '// Gone with the file.\nx();\n', head: '' }) }));
  await connectFrame('highlight-frame.html', serveHighlights, ui.shadow());
  await vi.waitFor(() => expect(ui.q('.mr-source-comment')).toBeTruthy());
  expect(ui.q('.mr-source-comment-meta').textContent).toBe('Comment · old line 1');
  // The saved setting applies as soon as the notes appear.
  expect(ui.q('.mr-source-comment-body').hidden).toBe(true);
  expect(ui.q('.mr-source-comment-source').hidden).toBe(false);
});

it('keeps the comment invitation and its highlighted source target while moving into the control or editor', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const prepareComment = vi.fn(async (_target: CommentTarget) => ({ kind: 'inline' as const, label: 'Inline', post: vi.fn() }));
  await ui.open({ ...review({ docs: [], codeDocs: [file], load: async () => ({ base, head }) }), prepareComment });
  await connectFrame('highlight-frame.html', serveHighlights, ui.shadow());
  await vi.waitFor(() => expect(ui.q('.mr-source-comment')).toBeTruthy());
  ui.flushFrame();
  const note = ui.q('.mr-source-comment-body [data-mr-change="added"]');
  const button = ui.q('.mr-comment-btn');
  const move = (target: Element, clientX: number, clientY: number) => {
    const event = new MouseEvent('pointermove', { bubbles: true, composed: true, clientX, clientY });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    target.dispatchEvent(event);
  };
  ui.bounds(note, 300);
  note.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(note.classList).toContain('mr-hovered');
  expect(button.hidden).toBe(false);
  expect(button.getAttribute('aria-label')).toBe('Comment on line 2');
  // A short line and a taller control can have different vertical bounds.
  ui.bounds(button, 380, 1000);
  move(ui.q('.mr-main'), 980, 395);
  expect(button.hidden).toBe(false);
  expect(note.classList).toContain('mr-hovered');
  button.dispatchEvent(new Event('pointerover', { bubbles: true }));
  move(button, 1040, 395);
  expect(note.classList).toContain('mr-linked');
  const composer = await ui.commentOn('.mr-source-comment-body [data-mr-change="added"]');
  expect(prepareComment).toHaveBeenCalledWith(expect.objectContaining({ startLine: 2, endLine: 2 }));
  write(composer, 'Check the reset behavior.');
  composer.dispatchEvent(new Event('pointerover', { bubbles: true }));
  move(composer, 1040, 395);
  expect(composer.isConnected).toBe(true);
  expect(note.classList).toContain('mr-targeted');
  note.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(button.hidden).toBe(true); // The existing editor is still there for this target.
  move(ui.q('.mr-main'), 966, 320);
  expect(note.classList).toContain('mr-hovered');
  const line = ui.q('.mr-code-lines > .mr-code-line[data-mr-change="added"]');
  line.dispatchEvent(new Event('pointerover', { bubbles: true }));
  expect(note.classList).not.toContain('mr-hovered');
  expect(line.classList).toContain('mr-hovered');
  move(ui.q('.mr-main'), 50, 700);
  expect(line.classList).not.toContain('mr-hovered');
  expect(button.hidden).toBe(true);
  expect(composer.querySelector('textarea')!.value).toBe('Check the reset behavior.');
});
