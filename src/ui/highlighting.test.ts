import { beforeEach, expect, it, vi } from 'vitest';
import { highlight } from './highlight-engine.ts';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: () => `${process.cwd()}/src/ui/highlight-engine.ts` } });
});

it('highlights supported languages including Dockerfile, escapes source, and declines unknown languages', () => {
  expect(highlight('<script>alert(1)</script>', 'xml')).not.toContain('<script>');
  expect(highlight('FROM node:22', 'dockerfile')).toContain('hljs-keyword');
  expect(highlight('secret', 'unknown-language')).toBeNull();
});

it('loads the bundled highlighter and preserves text and source coordinates across multiline tokens', async () => {
  const { lineify, highlightCode } = await import('./code.ts');
  const pre = document.createElement('pre'); pre.dataset.lang = 'js';
  pre.textContent = '/* First\n   Second */\nconst value = "<script>";\n';
  lineify(document, pre); document.body.append(pre);
  const before = [...pre.querySelectorAll<HTMLElement>('[data-line]')].map((el) => [el.dataset.line, el.textContent]);
  await highlightCode(document.body);
  expect([...pre.querySelectorAll<HTMLElement>('[data-line]')].map((el) => [el.dataset.line, el.textContent])).toEqual(before);
  expect(pre.querySelector('[data-line="h:1"] .hljs-comment')).toBeTruthy();
  expect(pre.querySelector('script')).toBeNull();
  expect(pre.dataset.mrCode).toBe('done');
  pre.remove();
});

it('keeps oversized source readable and skips highlighting text that no longer matches', async () => {
  const { registerCode, lineEl, highlightCode } = await import('./code.ts');
  const box = document.createElement('div'); document.body.append(box);
  const pre = document.createElement('pre');
  const line = lineEl(document, 'span', '', 'Changed while loading', 'h:0'); pre.append(line); box.append(pre);
  registerCode(pre, { language: 'javascript', head: 'const original = 1;' });
  await highlightCode(box);
  expect(line.textContent).toBe('Changed while loading'); expect(line.querySelector('span')).toBeNull();
  const large = document.createElement('pre'); const row = lineEl(document, 'span', '', 'x', 'b:0'); large.append(row); box.append(large);
  registerCode(large, { language: 'javascript', base: 'x'.repeat(300_001) });
  await highlightCode(box); expect(row.textContent).toBe('x'); expect(row.querySelector('span')).toBeNull();
  box.remove();
});

it('falls back to plain code when the local highlighter fails to load', async () => {
  vi.stubGlobal('chrome', { runtime: { getURL: () => '/missing-highlighter.js' } });
  const { lineify, highlightCode } = await import('./code.ts');
  const box = document.createElement('div'), pre = document.createElement('pre'); box.append(pre);
  pre.dataset.lang = 'ts'; pre.textContent = 'const text = "kept"'; lineify(document, pre);
  await expect(highlightCode(box)).resolves.toBeUndefined();
  expect(pre.textContent).toBe('const text = "kept"');
});
