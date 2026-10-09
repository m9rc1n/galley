import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectFrame } from '../testing/sandbox.ts';
import { renderCodeFile } from './code-files.ts';
import { filterDocument, paragraphTarget, selectionTarget } from './reading.ts';
import { parseSpecs, serveSpecs } from './spec-frame.ts';
import { isSpecPath, presentSpecs } from './specs.ts';
import { showCommentSource } from './source-comments.ts';
import type { DocRef } from '../platforms/types.ts';
import type { RenderedBlock } from './render.ts';

const ref: DocRef = { path: 'src/upload.spec.ts', oldPath: 'src/upload.spec.ts', kind: 'code', status: 'modified' };
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { runtime: { getURL: (path: string) => `chrome-extension://galley/${path}` } });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
});

function rendered(base: string, head: string, file = ref) {
  const result = renderCodeFile(document, file, { base, head });
  document.body.append(result.content);
  return result;
}
const text = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map((el) => el.textContent);
function present(base: string, head: string, file = ref) {
  const result = rendered(base, head, file);
  presentSpecs(result, file, parseSpecs(base)!, parseSpecs(head)!);
  return result;
}
async function fakeFrame(reply: object | Promise<object>) {
  const { serve } = await import('./sandbox-frame.ts');
  return connectFrame('spec-frame.html', (port) =>
    serve(
      port,
      (data): data is { id: number } => true,
      async () => reply,
    ),
  );
}

it('recognizes test/spec filenames and directories without changing ordinary source files', () => {
  for (const path of [
    'a.test.ts',
    'a.spec.tsx',
    'x.test.cjs',
    'x.spec.mjs',
    'tests/helper.ts',
    'test/unit.ts',
    'specs/foo.jsx',
    'spec/test.js',
    '__tests__/nested/foo.ts',
    'x/__tests__/foo.TSX',
  ])
    expect(isSpecPath(path), path).toBe(true);
  for (const path of ['src/test.ts', 'src/specific.ts', 'src/specs.ts', 'test.py', 'a.spec.rb', 'tests/foo.md', 'contest/foo.ts'])
    expect(isSpecPath(path), path).toBe(false);
});

it('turns cases and hooks into a readable hierarchy while preserving every diff row and comment coordinate', () => {
  const base =
    'import { it } from "vitest";\ndescribe("Uploads", () => {\n  beforeEach(() => reset());\n  it("accepts a file", () => {\n    expect(limit).toBe(10);\n  });\n  it("old behavior", () => {\n    reject();\n  });\n});\n';
  const head = base.replace('toBe(10)', 'toBe(100)').replace('old behavior', 'clearer behavior');
  const r = rendered(base, head);
  const rows = [...r.blocks];
  const targets = rows.map((block) => paragraphTarget(ref, block));
  const stats = { ...r.stats };
  presentSpecs(r, ref, parseSpecs(base)!, parseSpecs(head)!);
  expect(r.content.classList.contains('mr-spec-file')).toBe(true);
  expect([...r.content.querySelectorAll('.mr-code-line')]).toEqual(rows.map((block) => block.el));
  expect(rows.map((block) => paragraphTarget(ref, block))).toEqual(targets);
  expect(r.stats).toEqual(stats);
  expect(
    [...r.content.querySelectorAll<HTMLElement>('.mr-spec-section')].map((el) => el.dataset.title ?? el.querySelector('.mr-spec-title')!.textContent),
  ).toEqual(['Imports & setup', 'Uploads', 'Before each test', 'accepts a file', 'clearer behavior']);
  // A renamed test reads like an edited sentence; its tests sit one level inside their suite.
  const renamed = r.content.querySelector('[data-title="clearer behavior"] .mr-spec-name')!;
  expect([renamed.querySelector('del')!.textContent, renamed.querySelector('ins')!.textContent]).toEqual(['old', 'clearer']);
  expect([...r.content.querySelectorAll<HTMLElement>('.is-case')].map((el) => el.dataset.depth)).toEqual(['1', '1']);
  expect([...r.content.querySelectorAll('.is-case .mr-spec-status')].map((el) => el.textContent)).toEqual(['Edited', 'Edited']);
  expect(r.content.querySelector('.mr-spec-summary')!.textContent).toBe('2 tests in 1 suite');
  expect([...r.content.querySelectorAll('.mr-spec-count')].map((el) => el.textContent)).toEqual(['2 edited']);
  expect(r.content.querySelector('.mr-spec-outline-suite')!.textContent).toBe('Uploads');
  const imports = r.content.querySelector<HTMLElement>('.is-support')!;
  const importToggle = imports.querySelector<HTMLButtonElement>('.mr-spec-support-toggle')!;
  expect(importToggle.getAttribute('aria-expanded')).toBe('false');
  importToggle.click();
  expect(imports.classList.contains('is-collapsed')).toBe(false);
  expect(importToggle.getAttribute('aria-expanded')).toBe('true');
  const added = present('', head);
  expect(added.content.querySelector('.mr-spec-support-toggle')!.getAttribute('aria-expanded')).toBe('true');
  const scroll = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scroll });
  const link = r.content.querySelector<HTMLButtonElement>('.mr-spec-link')!;
  link.click();
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  expect(document.activeElement!.classList.contains('mr-spec-toggle')).toBe(true);
  expect(document.activeElement!.closest<HTMLElement>('.mr-spec-section')!.dataset.title).toBe('accepts a file');
});

it('source and specification views use the same rows, exact selected text and line mappings', () => {
  const source = 'it("accepts a file", () => {\n  expect(limit).toBe(100);\n});\n';
  const r = present(source, source);
  expect(r.content.querySelector('.is-support')).toBeNull();
  expect(r.content.querySelector('.mr-spec-summary')!.textContent).toBe('1 test');
  expect(r.content.querySelector('.is-case .mr-spec-status')!.textContent).toBe('Unchanged');
  const rows = [...r.content.querySelectorAll('.mr-code-line')];
  const text = r.blocks[1].el.querySelector('.mr-code-text')!.firstChild!;
  const range = document.createRange();
  range.selectNodeContents(text);
  const target = selectionTarget(ref, r.blocks, range);
  expect(target).toMatchObject({ side: 'head', startLine: 2, endLine: 2, quote: '  expect(limit).toBe(100);' });
  // The reader shows Source the same way (Reading settings → Review → Test files): same rows, same targets.
  const changed = vi.fn();
  r.content.addEventListener('galley:code-view', changed);
  r.content.classList.add('is-spec-source');
  showCommentSource(r, true);
  expect([...r.content.querySelectorAll('.mr-code-line')]).toEqual(rows);
  expect(selectionTarget(ref, r.blocks, range)).toEqual(target);
  r.content.classList.remove('is-spec-source');
  showCommentSource(r, false);
  expect(changed).toHaveBeenCalledTimes(2);
});

it('preserves inline drafts already opened before the test structure finishes loading', () => {
  const source = 'it("accepts", () => {\n  expect(limit).toBe(100);\n});';
  const r = rendered('', source);
  const form = document.createElement('form');
  form.className = 'mr-composer';
  const field = document.createElement('textarea');
  field.value = 'Keep this draft';
  form.append(field);
  const another = form.cloneNode(true) as HTMLFormElement;
  r.blocks[1].el.after(form, another);
  const other = document.createElement('aside');
  r.content.querySelector('.mr-code-lines')!.prepend(other);
  presentSpecs(r, ref, [], parseSpecs(source)!);
  expect(form.isConnected).toBe(true);
  expect(form.previousElementSibling).toBe(r.blocks[1].el);
  expect(field.value).toBe('Keep this draft');
  expect(another.isConnected).toBe(true);
});

it('shows all of a test file in either scope, unchanged tests and setup too, and folds a test only when asked', () => {
  const base =
    'import { a } from "a";\nimport { b } from "b";\nimport { c } from "c";\nconst shared = 1;\n\ndescribe("Uploads", () => {\n  it("accepts", () => {\n    const file = first();\n    prepare(file);\n    authenticate();\n    send(file);\n    wait();\n    check(file);\n    expect(limit).toBe(10);\n  });\n  it("unchanged", () => {\n    first();\n    second();\n    third();\n    fourth();\n    fifth();\n    sixth();\n  });\n});\n';
  const r = present(base, base.replace('toBe(10)', 'toBe(100)'));
  filterDocument(r, true);
  const cases = [...r.content.querySelectorAll<HTMLElement>('.is-case')];
  expect(cases.map((el) => [el.dataset.status, el.classList.contains('is-collapsed')])).toEqual([
    ['edited', false],
    ['unchanged', false],
  ]);
  // Changed parts folds nothing in a test file: the imports and every line of both tests are there.
  expect(r.content.querySelector('.mr-context-toggle')).toBeNull();
  expect(r.blocks.some((block) => block.el.hidden)).toBe(false);
  const body = (el: Element) => [...el.querySelectorAll('.mr-code-line:not([data-mr-spec-boilerplate]) .mr-code-text')].map((line) => line.textContent!.trim());
  expect(body(cases[1])).toEqual(['first();', 'second();', 'third();', 'fourth();', 'fifth();', 'sixth();']);
  filterDocument(r, false);
  expect(r.content.querySelector('[hidden]')).toBeNull();
});

it('leaves out declaration lines that only repeat the heading, and keeps any that say more', () => {
  const base =
    'describe("Limits", () => {\n  it("old name", () => {\n    a();\n  });\n  it("waits", () => {\n    b();\n  });\n  it("slow", () => {\n    c();\n  });\n  it.each([[1]])("table %i", (n) => {\n    d(n);\n  });\n});\n';
  const head = `${base
    .replace('old name', 'new name')
    .replace('it("waits", () => {', 'it("waits", async () => {')
    .replace('    c();\n  });', '    c();\n  }, 10_000);')}it.todo("retries");\n`;
  const r = present(base, head);
  const line = (block: RenderedBlock) => `${block.kind} ${(block.head ?? block.base)!.text.trim()}`;
  // A rename shows in the heading, so both versions of its declaration go; so do closers and to-do lines.
  expect(r.blocks.filter((block) => 'mrSpecBoilerplate' in block.el.dataset).map(line)).toEqual([
    'same describe("Limits", () => {',
    'removed it("old name", () => {',
    'added it("new name", () => {',
    'same });',
    'same });',
    'same it("slow", () => {',
    'same });',
    'same });',
    'added it.todo("retries");',
  ]);
  // async, a timeout and a parameter table are not in the heading, so their lines stay.
  expect(r.blocks.filter((block) => !('mrSpecBoilerplate' in block.el.dataset) && /it|\}/.test(line(block))).map(line)).toEqual([
    'removed it("waits", () => {',
    'added it("waits", async () => {',
    'removed });',
    'added }, 10_000);',
    'same it.each([[1]])("table %i", (n) => {',
  ]);
  // A suite whose own code is just its declaration, and a test that is all title, are just their headings.
  expect([...r.content.querySelectorAll<HTMLElement>('.is-bare')].map((el) => el.dataset.title)).toEqual(['Limits', 'retries']);
});

it('marks additions/removals explicitly and never puts new source inside a removed-only section', () => {
  const base = 'describe("Uploads", () => {\n  it("removed", () => {\n    old();\n  });\n});\nconst helper = true;\n';
  const head = 'describe("Uploads", () => {\n});\nconst helper = true;\nit.each([[1]])("added", () => newBehavior());\n';
  const r = present(base, head);
  expect(r.content.querySelector('.mr-spec-summary')!.textContent).toBe('1 test in 1 suite');
  expect([...r.content.querySelectorAll('.mr-spec-count')].map((el) => el.textContent)).toEqual(['1 added', '1 removed']);
  expect(r.content.querySelector('.is-removed .mr-spec-meta')!.textContent).toContain('old lines 2–4');
  expect(r.content.querySelector('.mr-spec-flag')!.textContent).toBe('Parameterized');
  expect([...r.content.querySelectorAll('.mr-spec-section.is-removed .mr-code-line')].every((el) => el.getAttribute('data-mr-side') === 'base')).toBe(true);
  expect(r.blocks.find((block) => block.head?.text === 'const helper = true;')!.el.closest('.is-removed')).toBeNull();
  expect([...r.content.querySelectorAll('.is-case .mr-spec-status')].map((el) => el.textContent)).toEqual(['Removed', 'Added']);
  const deleted = present('it.skip("gone", () => {});\n', '', { ...ref, status: 'removed' });
  expect(deleted.content.querySelector('.mr-spec-section.is-removed')).toBeNull();
  expect(deleted.content.querySelector('.mr-spec-link.is-removed')).toBeNull();
  expect(deleted.content.querySelector('.mr-spec-flag')!.textContent).toBe('Skipped');
});

it('flags tests still to do or run alone, keeps quiet suites quiet, and folds a test from its heading', () => {
  const base = 'describe("Kept", () => {\n  it("works", () => {\n    one();\n  });\n});\nit("changes", () => {\n  two(1);\n});\n';
  const head = `${base.replace('two(1)', 'two(2)')}it.todo("retries after a timeout");\nit.only("runs alone", () => {});\n`;
  const r = present(base, head);
  const kept = r.content.querySelector<HTMLElement>('.is-suite[data-title="Kept"]')!;
  // Nothing in the suite changed: no status, just how much it holds.
  expect(kept.querySelector('.mr-spec-status')).toBeNull();
  expect(kept.querySelector('.mr-spec-meta')!.textContent).toBe('1 testlines 1–5');
  expect(text(r.content, '.mr-spec-count')).toEqual(['2 added', '1 edited', '1 unchanged', '1 to do']);
  const todo = r.content.querySelector<HTMLElement>('.is-case[data-title="retries after a timeout"]')!;
  expect(todo.classList.contains('is-todo')).toBe(true);
  expect(todo.querySelector('.mr-spec-flag')!.textContent).toBe('To do');
  const link = [...r.content.querySelectorAll<HTMLElement>('.mr-spec-link')].find((el) => el.textContent!.startsWith('retries'))!;
  expect(link.classList.contains('is-todo')).toBe(true);
  expect(text(link, '.mr-spec-flag')).toEqual(['To do']);
  expect(r.content.querySelector('.is-case[data-title="runs alone"] .mr-spec-flag')!.textContent).toBe('Only');
  const context = vi.fn();
  r.content.addEventListener('galley:context', context);
  const changes = r.content.querySelector<HTMLElement>('.is-case[data-title="changes"]')!;
  const toggle = changes.querySelector<HTMLButtonElement>('.mr-spec-toggle')!;
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  toggle.click();
  expect(changes.classList.contains('is-collapsed')).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  toggle.click();
  expect(changes.classList.contains('is-collapsed')).toBe(false);
  expect(context).toHaveBeenCalledTimes(2);
});

it('lets blank lines between tests space out the source without boxes of their own', () => {
  // A blank line after a removed test joins the next test, or the one before when nothing follows.
  const after = present('it("gone", () => {});\n\nit("kept", () => {\n  b(1);\n});\n', '\nit("kept", () => {\n  b(2);\n});\n');
  expect(after.content.querySelector('.is-continuation')).toBeNull();
  const blank = after.blocks.find((block) => block.kind === 'same' && !block.head!.text)!;
  expect(blank.el.closest<HTMLElement>('.mr-spec-section')!.dataset.title).toBe('kept');
  expect('mrSpecBoilerplate' in blank.el.dataset).toBe(true);
  const last = present('it("kept", () => {\n  b(1);\n});\nit("gone", () => {});\n\nfinal();\n', 'it("kept", () => {\n  b(2);\n});\n\nfinal();\n');
  expect(last.content.querySelector('.is-continuation')!.textContent).toContain('final();');
  // A blank line that was added or removed is still only spacing.
  const removed = present('it("kept", () => {\n  b(1);\n});\n\n', 'it("kept", () => {\n  b(2);\n});\n');
  expect(removed.blocks.filter((block) => block.kind === 'removed' && !block.base!.text).every((block) => 'mrSpecBoilerplate' in block.el.dataset)).toBe(true);
  expect(removed.blocks.some((block) => block.kind === 'removed' && !block.base!.text)).toBe(true);
  const end = present('it("kept", () => {\n  b(1);\n});\nit("gone", () => {});\n\n', 'it("kept", () => {\n  b(2);\n});\n\n');
  expect(end.content.querySelector('.is-continuation')).toBeNull();
  expect(end.content.querySelectorAll('.mr-code-line')).toHaveLength(end.blocks.length);
});

it('matches repeated names within their own suites when suites move', () => {
  const first = 'describe("First", () => {\n  it("works", () => {\n    one();\n  });\n});\n';
  const second = 'describe("Second", () => {\n  it("works", () => {\n    two();\n  });\n});\n';
  const r = present(first + second, second + first.replace('one()', 'three()'));
  const sections = [...r.content.querySelectorAll('.is-case')];
  expect(sections).toHaveLength(2);
  expect(sections.find((el) => (el as HTMLElement).dataset.context === 'First')!.textContent).toContain('three()');
  expect(r.content.querySelector('.mr-spec-name del')).toBeNull();
});

it('renders hostile names as text, supports same-line nested declarations, and leaves helpers plain', () => {
  const r = present('', 'describe("Suite", () => { it("<img src=x onerror=alert(1)>", () => {}); });\n');
  expect(r.content.querySelector('img')).toBeNull();
  expect(r.content.querySelector('.is-case .mr-spec-name')!.textContent).toBe('<img src=x onerror=alert(1)>');
  expect(r.content.querySelectorAll('.mr-code-line')).toHaveLength(1);
  const helper = present('const value = 1;\n', 'const value = 2;\n');
  expect(helper.content.classList.contains('mr-spec-file')).toBe(false);
  const missing = rendered('', 'it("real", () => {});');
  presentSpecs(missing, ref, [], [{ kind: 'case', title: 'absent', start: 100, end: 100, depth: 0, flag: '' }]);
  expect(missing.content.classList.contains('mr-spec-file')).toBe(false);
});

it('enhances recognized tests in an isolated frame, including JSX, without changing code colours or source', async () => {
  const { enhanceSpecs } = await import('./specs.ts');
  const source = 'it("renders", () => { render(<Button />); });\n';
  const file = { ...ref, path: 'component.test.tsx' };
  const r = rendered('', source, file);
  const done = enhanceSpecs(r, file, { base: '', head: source });
  const frame = await connectFrame('spec-frame.html', serveSpecs);
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  await done;
  expect(r.content.querySelector('.mr-spec-name')!.textContent).toBe('renders');
  expect(r.blocks[0].el.querySelector('.mr-code-text')!.textContent).toBe(source.trim());
});

it('does not load a parser for other languages, ordinary files or oversized source', async () => {
  const { enhanceSpecs } = await import('./specs.ts');
  for (const [path, head] of [
    ['main.ts', 'it("name", () => {});'],
    ['file.spec.rb', 'it "name"'],
    [ref.path, 'x'.repeat(200_001)],
    [ref.path, '\n'.repeat(10_001)],
  ]) {
    const file = { ...ref, path };
    const r = rendered('', head, file);
    await enhanceSpecs(r, file, { base: '', head });
    expect(r.content.classList.contains('mr-spec-file')).toBe(false);
  }
  expect(document.querySelector('iframe')).toBeNull();
});

const valid = { kind: 'case', title: 'name', start: 0, end: 0, depth: 0, flag: '' };
const invalidReplies = [
  null,
  {},
  Array(501).fill(valid),
  [null],
  [{ ...valid, kind: 'script' }],
  [{ ...valid, title: 42 }],
  [{ ...valid, title: 'x'.repeat(2_001) }],
  [{ ...valid, flag: null }],
  [{ ...valid, flag: 'evil' }],
  [{ ...valid, start: 0.5 }],
  [{ ...valid, end: 0.5 }],
  [{ ...valid, start: -1 }],
  [{ ...valid, start: 1, end: 0 }],
  [{ ...valid, end: 5 }],
  [{ ...valid, depth: 0.5 }],
  [{ ...valid, depth: -1 }],
  [{ ...valid, depth: 31 }],
];
it.each(invalidReplies.map((base) => [base]))('rejects malformed frame structures before they can replace source, case %#', async (base) => {
  const { enhanceSpecs } = await import('./specs.ts');
  const source = 'it("name", () => {});';
  const r = rendered(source, source);
  const rows = [...r.content.querySelectorAll('.mr-code-line')];
  const done = enhanceSpecs(r, ref, { base: source, head: source });
  await fakeFrame({ base, head: [valid] });
  await done;
  expect(r.content.classList.contains('mr-spec-file')).toBe(false);
  expect([...r.content.querySelectorAll('.mr-code-line')]).toEqual(rows);
});

it('keeps source when the updated version is invalid or the article disappears before a reply', async () => {
  const { enhanceSpecs } = await import('./specs.ts');
  const r = rendered('it("valid", () => {});', 'it("broken",');
  const done = enhanceSpecs(r, ref, { base: 'it("valid", () => {});', head: 'it("broken",' });
  await connectFrame('spec-frame.html', serveSpecs);
  await done;
  expect(r.content.classList.contains('mr-spec-file')).toBe(false);
  const gone = rendered('', 'it("gone", () => {});');
  const pending = enhanceSpecs(gone, ref, { base: '', head: 'it("gone", () => {});' });
  gone.content.remove();
  await pending;
  expect(gone.content.classList.contains('mr-spec-file')).toBe(false);
});

it('keeps source usable if the parser stops responding', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  const { enhanceSpecs } = await import('./specs.ts');
  const source = 'it("safe fallback", () => {});';
  const r = rendered('', source);
  const done = enhanceSpecs(r, ref, { base: '', head: source });
  const frame = await connectFrame('spec-frame.html', () => {});
  vi.advanceTimersByTime(5_250);
  await done;
  expect(r.blocks[0].el.textContent).toContain(source);
  expect(r.content.classList.contains('mr-spec-file')).toBe(false);
  expect(frame.isConnected).toBe(false);
});
