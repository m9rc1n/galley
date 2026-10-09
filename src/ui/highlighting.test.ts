import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectFrame } from '../testing/sandbox.ts';
import { highlight } from './highlight-frame.ts';

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

async function realFrame() {
  const { serveHighlights } = await import('./highlight-frame.ts');
  return connectFrame('highlight-frame.html', serveHighlights);
}

/** A frame that answers every request with `reply`, as a compromised highlighter might. */
async function fakeFrame(reply: object) {
  const { serve } = await import('./sandbox-frame.ts');
  return connectFrame('highlight-frame.html', (port) => serve(port, (data): data is { id: number } => true, async () => reply));
}

function codeBlock(lang: string, text: string) {
  return import('./code.ts').then(({ lineify }) => {
    const pre = document.createElement('pre'); pre.dataset.lang = lang; pre.textContent = text;
    lineify(document, pre); document.body.append(pre);
    return pre;
  });
}

it('highlights supported languages including Dockerfile, escapes source, and declines unknown languages', () => {
  expect(highlight('<script>alert(1)</script>', 'xml')).not.toContain('<script>');
  expect(highlight('FROM node:22', 'dockerfile')).toContain('hljs-keyword');
  expect(highlight('secret', 'unknown-language')).toBeNull();
});

it('highlights in the sandboxed frame and preserves text and source coordinates across multiline tokens', async () => {
  const { highlightCode } = await import('./code.ts');
  const pre = await codeBlock('js', '/* First\n   Second */\nconst value = "<script>";\n');
  const before = [...pre.querySelectorAll<HTMLElement>('[data-line]')].map((el) => [el.dataset.line, el.textContent]);
  const done = highlightCode(document.body);
  const frame = await realFrame();
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  await done;
  expect([...pre.querySelectorAll<HTMLElement>('[data-line]')].map((el) => [el.dataset.line, el.textContent])).toEqual(before);
  expect(pre.querySelector('[data-line="h:1"] .hljs-comment')).toBeTruthy();
  expect(pre.querySelector('script')).toBeNull();
  expect(pre.dataset.mrCode).toBe('done');
});

it('keeps oversized source readable and skips highlighting text that no longer matches', async () => {
  const { registerCode, lineEl, highlightCode } = await import('./code.ts');
  const box = document.createElement('div'); document.body.append(box);
  const pre = document.createElement('pre');
  const line = lineEl(document, 'span', '', 'Changed while loading', 'h:0'); pre.append(line); box.append(pre);
  registerCode(pre, { language: 'javascript', head: 'const original = 1;' });
  const done = highlightCode(box); await realFrame(); await done;
  expect(line.textContent).toBe('Changed while loading'); expect(line.querySelector('span')).toBeNull();
  const large = document.createElement('pre'); const row = lineEl(document, 'span', '', 'x', 'b:0'); large.append(row); box.append(large);
  registerCode(large, { language: 'javascript', base: 'x'.repeat(300_001) });
  await highlightCode(box); expect(row.textContent).toBe('x'); expect(row.querySelector('span')).toBeNull();
});

it('a reply can only add token colours: markup is dropped and different text is ignored', async () => {
  const { highlightCode } = await import('./code.ts');
  const pre = await codeBlock('ts', 'const a = 1;');
  const done = highlightCode(document.body);
  await fakeFrame({ html: '<img src=x onerror="alert(1)"><span class="hljs-keyword" onclick="x()" style="color:red">const</span> a = 1;<a href="https://evil.example">!</a>' });
  await done;
  expect(pre.textContent).toBe('const a = 1;');
  expect(pre.querySelector('img, a, [onclick], [style]')).toBeNull();
  const other = await codeBlock('ts', 'let b = 2;');
  await highlightCode(document.body);
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(other.textContent).toBe('let b = 2;'); expect(other.querySelector('span span')).toBeNull();
});

it.each([42, null, 'x'.repeat(10_000_001)])('keeps code plain for malformed or oversized highlighting replies, case %#', async (html) => {
  const { highlightCode } = await import('./code.ts');
  const odd = await codeBlock('ts', 'const odd = 1;');
  const done = highlightCode(document.body); await fakeFrame({ html }); await done;
  expect(odd.textContent).toBe('const odd = 1;'); expect(odd.querySelector('[data-line] span')).toBeNull();
});

it('keeps code with an unsupported language plain without loading the highlighter', async () => {
  const { highlightCode } = await import('./code.ts');
  const pre = await codeBlock('unknown-language', 'readable text');
  await highlightCode(document.body);
  expect(pre.textContent).toBe('readable text');
  expect(pre.dataset.mrCode).toBe('');
  expect(document.querySelector('iframe')).toBeNull();
});

it('stays plain, and stops for this document, when the highlighter stops answering', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const { highlightCode } = await import('./code.ts');
  const stuck = await codeBlock('ts', 'const text = "kept"');
  const later = await codeBlock('ts', 'const later = true');
  const done = highlightCode(document.body);
  const frame = await connectFrame('highlight-frame.html', () => { /* never answers */ });
  vi.advanceTimersByTime(8_500);
  await done;
  expect(stuck.textContent).toBe('const text = "kept"'); expect(stuck.querySelector('[data-line] span')).toBeNull();
  expect(later.dataset.mrCode).toBe('');
  expect(frame.isConnected).toBe(false);
});

it('keeps its frame inside the reader and skips blocks taken off screen while it works', async () => {
  const { highlightCode } = await import('./code.ts');
  const { serveHighlights } = await import('./highlight-frame.ts');
  const host = document.createElement('div'); document.body.append(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const shown = await codeBlock('ts', 'const a = 1;'), gone = await codeBlock('ts', 'const b = 2;');
  shadow.append(shown, gone);
  const done = highlightCode(shadow);
  gone.remove(); // e.g. the document re-rendered while the first block was being coloured
  await connectFrame('highlight-frame.html', serveHighlights, shadow);
  await done;
  expect(shown.querySelector('[data-line] span')).toBeTruthy();
  expect(gone.dataset.mrCode).toBe('');
  expect(shadow.querySelectorAll('iframe')).toHaveLength(1);
  expect(document.querySelector('iframe')).toBeNull();
});
