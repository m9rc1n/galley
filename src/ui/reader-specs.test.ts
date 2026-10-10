import { expect, it, vi } from 'vitest';
import { deferred, readerHarness, review } from '../testing/reader.ts';
import { connectFrame } from '../testing/sandbox.ts';
import { openReader } from './reader.ts';
import { serveSpecs } from './spec-frame.ts';
import * as specs from './specs.ts';
import type { CommentTarget, DocRef } from '../platforms/types.ts';

const ui = readerHarness();
const file: DocRef = { path: 'src/upload.test.ts', oldPath: 'src/upload.test.ts', kind: 'code', status: 'modified' };
const base = 'describe("Uploads", () => {\n  it("accepts", () => {\n    expect(limit).toBe(10);\n  });\n});\n';
const head = base.replace('toBe(10)', 'toBe(100)');
const source = () => review({ docs: [], codeDocs: [file], load: async () => ({ base, head }) });

it('keeps existing discussions and new comments on exact source lines in both test views', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const prepareComment = vi.fn(async (_target: CommentTarget) => ({
    kind: 'inline' as const,
    label: 'Inline comment',
    post: async () => ({ url: '#posted' }),
  }));
  await ui.open({
    ...source(),
    prepareComment,
    loadThreads: async () => [
      {
        doc: file,
        side: 'head',
        line: 3,
        url: '#existing',
        comments: [{ author: 'Dana', body: 'Check the limit?', createdAt: new Date().toISOString(), url: '#existing' }],
      },
    ],
  });
  await connectFrame('spec-frame.html', serveSpecs, ui.shadow());
  await vi.waitFor(() => expect(ui.q('.mr-spec-file')).toBeTruthy());
  await vi.waitFor(() => {
    ui.flushFrame();
    expect(ui.q('.mr-thread-body')?.textContent?.trim()).toBe('Check the limit?');
  });
  expect(ui.q('.mr-toc').children).toHaveLength(0);
  expect(ui.q('.mr-gutter').children).toHaveLength(0);
  const rows = [...ui.q('.mr-spec-file').querySelectorAll('.mr-code-text')].map((row) => [row.getAttribute('data-line'), row.textContent]);
  const composer = await ui.commentOn('.mr-code-line[data-mr-change="added"]');
  expect(prepareComment).toHaveBeenCalledWith(
    expect.objectContaining({ doc: file, side: 'head', startLine: 3, endLine: 3, quote: '    expect(limit).toBe(100);' }),
  );
  ui.input('Should we check zero as well?');
  ui.click('.mr-spec-view-options [data-value="source"]');
  expect(composer.isConnected).toBe(true);
  expect(ui.q('.mr-spec-file').classList.contains('is-spec-source')).toBe(true);
  expect(composer.querySelector('textarea')!.value).toBe('Should we check zero as well?');
  expect([...ui.q('.mr-spec-file').querySelectorAll('.mr-code-text')].map((row) => [row.getAttribute('data-line'), row.textContent])).toEqual(rows);
  expect(ui.q('.mr-spec-view-options [data-value="source"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.q('.mr-settings [data-setting="tests"] [data-value="source"]').getAttribute('aria-pressed')).toBe('true');
  ui.click('.mr-spec-view-options [data-value="plan"]');
  expect(ui.q('.mr-thread-body').textContent?.trim()).toBe('Check the limit?');
  ui.click('.mr-composer .mr-cancel');
});

it('restores the whole-file choice and keeps the file switch and settings in sync', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true, tests: 'source', scope: 'changed' }));
  await ui.open(source());
  await connectFrame('spec-frame.html', serveSpecs, ui.shadow());
  await vi.waitFor(() => expect(ui.q('.mr-spec-file')).toBeTruthy());
  expect(ui.q('.mr-spec-file').classList.contains('is-spec-source')).toBe(true);
  expect(ui.q('.mr-spec-view-options [data-value="source"]').textContent).toBe('Whole file (raw)');
  expect(ui.q('.mr-spec-view-options [data-value="source"]').getAttribute('aria-pressed')).toBe('true');
  expect(ui.q('.mr-spec-file').querySelectorAll('.mr-context-gap')).toHaveLength(0);
  ui.click('.mr-spec-view-options [data-value="plan"]');
  expect(ui.q('.mr-spec-file').classList.contains('is-spec-source')).toBe(false);
  expect(ui.q('.mr-spec-view-options [data-value="plan"]').getAttribute('aria-pressed')).toBe('true');
  await vi.waitFor(() => expect(JSON.parse(localStorage.getItem('galley:settings')!).tests).toBe('plan'));
  ui.click('.mr-settings [data-setting="tests"] [data-value="source"]');
  expect(ui.q('.mr-spec-view-options [data-value="source"]').getAttribute('aria-pressed')).toBe('true');
});

it('stops loading a test view when the reader closes during enhancement', async () => {
  localStorage.setItem('galley:settings', JSON.stringify({ codeFiles: true }));
  const pending = deferred<void>();
  vi.spyOn(specs, 'enhanceSpecs').mockImplementation(async () => pending.promise);
  const handle = openReader(source());
  await vi.waitFor(() => expect(ui.q('.mr-code-line')).toBeTruthy());
  handle.close();
  pending.resolve();
  await ui.tick();
  expect(document.querySelector('#galley-reader')).toBeNull();
});
