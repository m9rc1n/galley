import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectFrame } from '../testing/sandbox.ts';
import { renderCodeFile } from './code-files.ts';
import { parseSymbols, serveSpecs } from './spec-frame.ts';
import type { DocRef } from '../platforms/types.ts';

const ref: DocRef = { path: 'src/limits.ts', oldPath: 'src/limits.ts', kind: 'code', status: 'modified' };
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
});
afterEach(() => document.body.replaceChildren());

function rendered(base: string, head: string, file = ref) {
  const r = renderCodeFile(document, file, { base, head });
  document.body.append(r.content);
  return r;
}
async function present(base: string, head: string) {
  const { presentSymbols, refreshSymbols } = await import('./symbols.ts');
  const r = rendered(base, head);
  presentSymbols(r, parseSymbols(base)!, parseSymbols(head)!);
  return { r, refreshSymbols };
}
const outline = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>('.mr-symbol-plan .mr-spec-link')].map((link) => [
    link.querySelector('.mr-symbol-kind')!.textContent,
    link.querySelector('.mr-spec-name')!.textContent,
    link.dataset.status,
    link.style.getPropertyValue('--spec-depth'),
  ]);

const base = [
  "import { clock } from './clock';",
  'export function request(client: string) {',
  '  return quota(client) > 0;',
  '}',
  'export function reset() {',
  '  usage.clear();',
  '}',
  'export class Limiter {',
  '  check(id: string) {',
  '    return id.length > 0;',
  '  }',
  '  stable() {',
  '    return true;',
  '  }',
  '}',
  'export type Window = number;',
  '',
].join('\n');
const head = base
  .replace("import { clock } from './clock';", "import { clock, now } from './clock';")
  .replace('  return quota(client) > 0;', '  return quota(client) >= 1;')
  .replace('export function reset() {\n  usage.clear();\n}\n', '')
  .replace('    return id.length > 0;', '    return id.trim().length > 0;')
  .replace('export type Window = number;', 'export type Window = number | "minute";\nexport function quota(client: string) {\n  return 100;\n}');

it('maps what changed in a source file, declaration by declaration, each a way to its first changed line', async () => {
  const { r } = await present(base, head);
  const plan = r.content.firstElementChild!;
  expect(plan.classList.contains('mr-symbol-plan')).toBe(true);
  expect(plan.getAttribute('aria-label')).toBe('Changes in this file');
  // The class changed only through a method: it heads the method instead of counting on its own.
  expect(plan.querySelector('.mr-spec-summary')!.textContent).toBe('5 declarations changed');
  expect([...plan.querySelectorAll('.mr-spec-count')].map((el) => el.textContent)).toEqual(['1 added', '3 edited', '1 removed']);
  expect(outline(r.content)).toEqual([
    ['function', 'request', 'edited', '0'],
    ['function', 'reset', 'removed', '0'],
    ['class', 'Limiter', 'edited', '0'],
    ['method', 'check', 'edited', '1'],
    ['type', 'Window', 'edited', '0'],
    ['function', 'quota', 'added', '0'],
    ['other', 'Outside declarations', 'edited', '0'],
  ]);
  expect(plan.querySelector('[data-status="removed"]')!.classList.contains('is-removed')).toBe(true);
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  const check = [...plan.querySelectorAll<HTMLButtonElement>('.mr-spec-link')][3];
  check.click();
  const first = r.blocks.find((block) => block.kind !== 'same' && block.base?.text === '    return id.length > 0;')!;
  expect(scroll.mock.contexts[0]).toBe(first.el);
  expect(scroll).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
  expect(first.el.classList.contains('is-flash')).toBe(true);
});

it('shows a rename as an edit of the name, and code that only moved as moved', async () => {
  const { showMove, MoveFinder } = await import('./moves.ts');
  const body = '  const used = usage.get(client) ?? 0;\n  return limit - used;\n';
  const before = `function spare(client) {\n${body}}\nfunction other() {\n  return 1;\n}\n${'step();\n'.repeat(12)}function move() {\n  audit.record(client, used);\n  audit.flush(client);\n}\n`;
  const after = `function remaining(client) {\n${body}}\nfunction other() {\n  return 2;\n}\nfunction move() {\n  audit.record(client, used);\n  audit.flush(client);\n}\n${'step();\n'.repeat(12)}`;
  const { r, refreshSymbols } = await present(before, after);
  const rename = r.content.querySelector('.mr-symbol-plan .mr-spec-name')!;
  expect([rename.querySelector('del')!.textContent, rename.querySelector('ins')!.textContent]).toEqual(['spare', 'remaining']);
  expect(outline(r.content).map((entry) => entry[2])).toEqual(['edited', 'edited', 'edited']);
  // A move found later, perhaps with a file shown after this one, updates the map.
  for (const move of new MoveFinder().add(ref, r)) showMove(move);
  refreshSymbols(r);
  expect(outline(r.content).map((entry) => [entry[1], entry[2]])).toEqual([
    ['spareremaining', 'edited'],
    ['other', 'edited'],
    ['move', 'moved'],
  ]);
  expect(r.content.querySelectorAll('.mr-symbol-plan')).toHaveLength(1);
  refreshSymbols(rendered('a();\n', 'b();\n'));
});

it('leaves files with a single change alone, and sends a link inside a formatted comment to the comment', async () => {
  const { presentSymbols } = await import('./symbols.ts');
  const { r } = await present('function a() {\n  return 1;\n}\n', 'function a() {\n  return 2;\n}\n');
  expect(r.content.querySelector('.mr-symbol-plan')).toBeNull();
  // In a new or a deleted file, the code outside declarations was simply added or removed.
  const file = "import x from 'a';\nfunction a() {}\nfunction b() {}\n";
  const added = await present('', file);
  expect(outline(added.r.content).map((entry) => entry[2])).toEqual(['added', 'added', 'added']);
  const removed = await present(file, '');
  expect(outline(removed.r.content).map((entry) => entry[2])).toEqual(['removed', 'removed', 'removed']);
  const one = await present("import x from 'a';\nfunction a() {\n  return 1;\n}\n", "import x from 'b';\nfunction a() {\n  return 2;\n}\n");
  expect(one.r.content.querySelector('.mr-spec-summary')!.textContent).toBe('1 declaration changed');
  // Declarations the parser reads differently in each version, with no changed line, are no change at all.
  const phantom = rendered('x();\ny();\n', 'x();\nz();\n');
  presentSymbols(phantom, [{ kind: 'type', name: 'Gone', start: 0, end: 0, parent: '' }], [{ kind: 'type', name: 'Here', start: 0, end: 0, parent: '' }]);
  expect(phantom.content.querySelector('.mr-symbol-plan')).toBeNull();
  const comment = await present('function a() {\n  return 1;\n}\nfunction b() {}\n', 'function a() {\n  return 2;\n}\nfunction c() {}\n');
  const row = comment.r.blocks.find((block) => block.base?.text === '  return 1;' && block.kind === 'removed')!;
  const card = document.createElement('section');
  card.className = 'mr-source-comment';
  row.el.before(card);
  card.append(row.el);
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  comment.r.content.querySelector<HTMLButtonElement>('.mr-symbol-plan .mr-spec-link')!.click();
  expect(scroll.mock.contexts[0]).toBe(card);
});

it('reads declarations in the parser frame for JavaScript and TypeScript files only', async () => {
  const { enhanceSymbols } = await import('./symbols.ts');
  const contents = { base, head };
  const r = rendered(base, head);
  const done = enhanceSymbols(r, ref, contents);
  await connectFrame('spec-frame.html', serveSpecs);
  await done;
  expect(r.content.querySelector('.mr-symbol-plan')).not.toBeNull();
  for (const [file, setup] of [
    [{ ...ref, path: 'src/limits.py' }, () => {}],
    [ref, (other: ReturnType<typeof rendered>) => other.content.classList.add('mr-spec-file')],
    [ref, (other: ReturnType<typeof rendered>) => other.blocks.push(...Array.from({ length: 10_001 }, () => other.blocks[0]))],
  ] as const) {
    const other = rendered(base, head, file);
    setup(other);
    await enhanceSymbols(other, file, contents);
    expect(other.content.querySelector('.mr-symbol-plan')).toBeNull();
  }
  const large = rendered('a();\n', 'b();\n');
  await enhanceSymbols(large, ref, { base: 'x'.repeat(200_001), head: '' });
  expect(large.content.querySelector('.mr-symbol-plan')).toBeNull();
});

it('keeps source when the frame replies with something other than declarations, or the file is gone', async () => {
  const { serve } = await import('./sandbox-frame.ts');
  const replies: unknown[] = [
    { base: [], head: [{ kind: 'script', name: 'x', start: 0, end: 0, parent: '' }] },
    { base: [{ kind: 'function', name: 'x', start: 0, end: 99, parent: '' }], head: [] },
    { base: [], head: Array.from({ length: 1_001 }, () => ({ kind: 'function', name: 'x', start: 0, end: 0, parent: '' })) },
    { base: [], head: [null] },
    { base: [], head: [{ kind: 'function', name: 'x'.repeat(201), start: 0, end: 0, parent: '' }] },
    { base: [], head: [{ kind: 'method', name: 'x', start: 0, end: 0, parent: 'y'.repeat(201) }] },
    { base: [], head: [{ kind: 'function', name: 'x', start: 1, end: 0, parent: '' }] },
    { base: [], head: [{ kind: 'function', name: 'x', start: -1, end: 0, parent: '' }] },
    { base: [], head: [{ kind: 'function', name: 'x', start: 0.5, end: 1, parent: '' }] },
    { base: [], head: [{ kind: 'function', name: 7, start: 0, end: 0, parent: '' }] },
    { base: [], head: [{ kind: 'function', name: 'x', start: 0, end: 0, parent: 7 }] },
    { base: [], head: 'nothing' },
  ];
  const { enhanceSymbols } = await import('./symbols.ts');
  let next = 0;
  const done = (async () => {
    for (const _ of replies) {
      const r = rendered(base, head);
      await enhanceSymbols(r, ref, { base, head });
      expect(r.content.querySelector('.mr-symbol-plan')).toBeNull();
    }
  })();
  await connectFrame('spec-frame.html', (port) =>
    serve(
      port,
      (data): data is { id: number } => true,
      async () => {
        const reply = replies[next++];
        if (reply instanceof Error) throw reply;
        return reply as object;
      },
    ),
  );
  await done;
  // A file closed before the reply, and a frame that fails, both leave nothing behind.
  const gone = rendered(base, head);
  const pending = enhanceSymbols(gone, ref, { base, head });
  gone.content.remove();
  replies.push({ base: parseSymbols(base), head: parseSymbols(head) });
  await pending;
  expect(gone.content.querySelector('.mr-symbol-plan')).toBeNull();
  replies.push(new Error('parser stopped'));
  const failed = rendered(base, head);
  await enhanceSymbols(failed, ref, { base, head });
  expect(failed.content.querySelector('.mr-symbol-plan')).toBeNull();
});
