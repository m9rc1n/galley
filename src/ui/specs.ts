import type { DocContents, DocRef } from '../platforms/types.ts';
import type { RenderedBlock, RenderedDoc } from './render.ts';
import type { SpecDefinition } from './spec-frame.ts';
import { hostFor, sandbox } from './sandbox.ts';
import { wordDiff } from '../core/worddiff.ts';

/** One parser frame for test structure and for the declarations of other source files (symbols.ts). */
export const parser = sandbox('spec-frame.html', 5_000);

export function isSpecPath(path: string): boolean {
  return /(?:\.(?:test|spec)|(?:^|\/)(?:tests?|specs?|__tests__)\/.*)\.[cm]?[jt]sx?$/i.test(path);
}

/** Frame replies supply structure, never HTML or replacement source. */
function definitions(value: unknown, lines: number): value is SpecDefinition[] {
  return (
    Array.isArray(value) &&
    value.length <= 500 &&
    value.every(
      (item: SpecDefinition | null) =>
        item &&
        ['suite', 'case', 'setup'].includes(item.kind) &&
        typeof item.title === 'string' &&
        item.title.length <= 2_000 &&
        typeof item.flag === 'string' &&
        /^(?:(?:only|skip|todo|each)(?: · )?)*$/.test(item.flag) &&
        Number.isInteger(item.start) &&
        Number.isInteger(item.end) &&
        item.start >= 0 &&
        item.end >= item.start &&
        item.end < lines &&
        Number.isInteger(item.depth) &&
        item.depth >= 0 &&
        item.depth <= 30,
    )
  );
}

/** Declaration lines with the name replaced by §: `it(§, async () => {`, `});`, `it.todo(§);`. A callee with a
 * parameter table (`it.each([…])`) or a body on the same line says more than the heading, so it never matches. */
const OPENS = /^[\w$.]+\(\s*(?:§\s*,\s*)?(?:async\s+)?(?:function\s*)?\([^()]*\)\s*(?:=>\s*)?\{$/;
const CLOSES = /^\}\s*\)\s*;?$/;
const TITLE_ONLY = /^[\w$.]+\(\s*§\s*(?:,\s*(?:async\s+)?(?:function\s*)?\([^()]*\)\s*(?:=>\s*)?\{\s*\})?\s*\)\s*;?$/;

function element(doc: Document, tag: string, className: string, text?: string): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

interface Group {
  definition: SpecDefinition;
  old?: SpecDefinition;
  rows: RenderedBlock[];
  start: number;
  status: string;
  side: 'base' | 'head';
  context: string[];
}

/** Match declarations by name first, then by substantive unchanged source in a renamed case.
 * A complete rewrite with a new name stays an explicit removal and addition. */
function groups(r: RenderedDoc, base: SpecDefinition[], head: SpecDefinition[]): Group[] {
  const unused = new Set(base);
  const context = (definition: SpecDefinition, all: SpecDefinition[]) =>
    all
      .filter((parent) => parent.kind === 'suite' && parent.depth < definition.depth && parent.start <= definition.start && parent.end >= definition.end)
      .map((parent) => parent.title);
  const rows = (definition: SpecDefinition, side: 'base' | 'head') =>
    r.blocks.filter((block) => {
      const line = block[side]?.lines[0];
      return line !== undefined && line >= definition.start && line <= definition.end;
    });
  const result: Group[] = [];
  for (const definition of head) {
    const current = rows(definition, 'head');
    const parents = context(definition, head);
    const candidates = [...unused].filter((old) => old.kind === definition.kind && old.depth === definition.depth);
    const old =
      candidates.find((old) => old.title === definition.title && JSON.stringify(context(old, base)) === JSON.stringify(parents)) ??
      candidates.find((old) =>
        current.some((block) => block.kind === 'same' && block.base!.lines[0] >= old.start && block.base!.lines[0] <= old.end && /[\w]/.test(block.base!.text)),
      );
    if (old) unused.delete(old);
    const selected = new Set([...current, ...(old ? rows(old, 'base') : [])]);
    const all = r.blocks.filter((block) => selected.has(block));
    result.push({
      definition,
      old,
      rows: all,
      start: r.blocks.indexOf(all[0]),
      side: 'head',
      context: parents,
      status: !old ? 'Added' : all.some((block) => block.kind !== 'same') ? 'Edited' : 'Unchanged',
    });
  }
  for (const definition of unused) {
    const oldRows = rows(definition, 'base').filter((block) => block.kind === 'removed');
    result.push({ definition, rows: oldRows, start: r.blocks.indexOf(oldRows[0]), status: 'Removed', side: 'base', context: context(definition, base) });
  }
  return result.filter((entry) => entry.start >= 0).sort((a, b) => a.start - b.start || a.definition.depth - b.definition.depth);
}

/** "line 4" or "old lines 4–9", counted from 1. */
function lineLabel(entry: Group): string {
  const { start, end } = entry.definition;
  return `${entry.side === 'base' ? 'old ' : ''}${start === end ? `line ${start + 1}` : `lines ${start + 1}–${end + 1}`}`;
}

/** A test's name. A renamed test shows the rename the way a document shows an edit. */
function titleOf(doc: Document, entry: Group): HTMLElement {
  const title = element(doc, 'span', 'mr-spec-name');
  const before = entry.old?.title;
  if (before === undefined || before === entry.definition.title) {
    title.textContent = entry.definition.title;
    return title;
  }
  for (const op of wordDiff(before, entry.definition.title))
    title.append(op.type === 'eq' ? doc.createTextNode(op.text) : element(doc, op.type, op.type === 'del' ? 'mr-del' : 'mr-ins', op.text));
  return title;
}

/** Status, flags and lines, quietly, after the name. */
function metaOf(doc: Document, entry: Group, tests?: number): HTMLElement {
  const meta = element(doc, 'span', 'mr-spec-meta');
  const { status, definition } = entry;
  if (definition.kind !== 'suite' || status !== 'Unchanged') meta.append(element(doc, 'span', `mr-spec-status is-${status.toLowerCase()}`, status));
  for (const flag of definition.flag.split(' · ').filter(Boolean))
    meta.append(
      element(doc, 'span', `mr-spec-flag is-${flag}`, flag === 'each' ? 'Parameterized' : flag === 'todo' ? 'To do' : flag === 'skip' ? 'Skipped' : 'Only'),
    );
  if (tests !== undefined) meta.append(element(doc, 'span', 'mr-spec-lines', `${tests} test${tests === 1 ? '' : 's'}`));
  meta.append(element(doc, 'span', 'mr-spec-lines', lineLabel(entry)));
  return meta;
}

/**
 * Add a test plan and a hierarchy around the existing rows, keeping their order and source mappings:
 * a summary with every test and its status at the top, then each suite with its tests nested inside.
 */
export function presentSpecs(r: RenderedDoc, ref: DocRef, base: SpecDefinition[], head: SpecDefinition[]): void {
  const doc = r.content.ownerDocument;
  const stream = r.content.querySelector<HTMLElement>('.mr-code-lines')!;
  const entries = groups(r, base, head);
  const cases = entries.filter((entry) => entry.definition.kind === 'case');
  if (!cases.length) return;
  // A reviewer may already be writing while the parser loads. Keep inline editors with their row.
  const editors = new Map<HTMLElement, HTMLElement[]>();
  let preceding: HTMLElement | undefined;
  for (const child of stream.children) {
    if (child.classList.contains('mr-code-line')) preceding = child as HTMLElement;
    else if (preceding && child.classList.contains('mr-composer')) editors.set(preceding, [...(editors.get(preceding) ?? []), child as HTMLElement]);
  }
  r.content.classList.add('mr-spec-file');
  stream.className = 'mr-spec-stream';
  stream.replaceChildren();

  // The plan: how many tests, what happened to them, and every one of them in its suite.
  const plan = element(doc, 'header', 'mr-spec-plan');
  const top = element(doc, 'div', 'mr-spec-plan-top');
  const current = cases.filter((entry) => entry.status !== 'Removed').length;
  const suites = head.filter((definition) => definition.kind === 'suite').length;
  const intro = element(doc, 'div', 'mr-spec-plan-intro');
  intro.append(
    element(doc, 'p', 'mr-spec-summary', `${current} test${current === 1 ? '' : 's'}${suites ? ` in ${suites} suite${suites === 1 ? '' : 's'}` : ''}`),
  );
  top.append(intro);
  const counts = element(doc, 'p', 'mr-spec-counts');
  for (const status of ['Added', 'Edited', 'Removed', 'Unchanged']) {
    const count = cases.filter((entry) => entry.status === status).length;
    if (count) counts.append(element(doc, 'span', `mr-spec-count is-${status.toLowerCase()}`, `${count} ${status.toLowerCase()}`));
  }
  const todo = cases.filter((entry) => entry.definition.flag.includes('todo')).length;
  if (todo) counts.append(element(doc, 'span', 'mr-spec-count is-todo', `${todo} to do`));
  const outline = element(doc, 'nav', 'mr-spec-outline');
  outline.setAttribute('aria-label', 'Tests in this file');
  const browse = element(doc, 'details', 'mr-spec-browse');
  browse.append(element(doc, 'summary', '', 'Browse tests'), outline);
  plan.append(top, counts, browse, element(doc, 'p', 'mr-spec-note', 'A reading view of the source. Galley doesn’t run your tests.'));
  // Keep the view switch outside the plan: it must remain available in the whole-file view too.
  const view = element(doc, 'div', 'mr-spec-view');
  const options = element(doc, 'div', 'mr-seg mr-spec-view-options');
  options.dataset.setting = 'tests';
  options.setAttribute('role', 'group');
  options.setAttribute('aria-label', `Test file view: ${ref.path}`);
  for (const [value, label] of [
    ['plan', 'Test plan'],
    ['source', 'Whole file (raw)'],
  ]) {
    const button = element(doc, 'button', '', label) as HTMLButtonElement;
    button.type = 'button';
    button.dataset.value = value;
    button.setAttribute('aria-pressed', String(value === 'plan'));
    if (value === 'source') button.title = 'Every source line, including imports, setup and unchanged code';
    options.append(button);
  }
  view.append(options);
  r.content.prepend(view, plan);

  let code: HTMLElement;
  let removedRows: Set<RenderedBlock> | undefined;
  let depth = 0;
  let cursor = 0;
  const section = (entry?: Group) => {
    const kind = entry ? entry.definition.kind : 'support';
    const wrapper = element(doc, 'section', `mr-spec-section is-${kind}`);
    const continuation = !entry && cursor > 0;
    if (continuation) wrapper.classList.add('is-continuation');
    depth = entry ? entry.definition.depth : depth;
    wrapper.style.setProperty('--spec-depth', String(depth));
    wrapper.dataset.depth = String(depth);
    removedRows = entry?.status === 'Removed' ? new Set(entry.rows) : undefined;
    if (entry?.status === 'Removed' && ref.status !== 'removed') wrapper.classList.add('is-removed');
    const heading = element(doc, 'header', 'mr-spec-heading');
    if (entry) {
      const { definition, status } = entry;
      wrapper.dataset.title = definition.title;
      wrapper.dataset.context = entry.context.join(' › ');
      // Status drives the glyph and tint; `is-removed` alone means "hidden in Clean mode".
      wrapper.dataset.status = status.toLowerCase();
      if (definition.flag.includes('todo')) wrapper.classList.add('is-todo');
      if (definition.kind === 'suite') {
        const tests = cases.filter(
          (other) => other.side === entry.side && other.definition.start >= definition.start && other.definition.end <= definition.end,
        ).length;
        const title = element(doc, 'h2', 'mr-spec-title');
        title.append(titleOf(doc, entry));
        heading.append(element(doc, 'p', 'mr-spec-kicker', 'Suite'), title, metaOf(doc, entry, tests));
        const label = element(doc, 'p', 'mr-spec-outline-suite');
        label.append(titleOf(doc, entry));
        label.style.setProperty('--spec-depth', String(definition.depth));
        outline.append(label);
      } else {
        // The name is the heading; the whole heading opens and closes the test's code.
        const title = element(doc, 'h3', 'mr-spec-title');
        const toggle = element(doc, 'button', 'mr-spec-toggle') as HTMLButtonElement;
        toggle.type = 'button';
        toggle.setAttribute('aria-expanded', 'true');
        toggle.append(element(doc, 'span', 'mr-spec-glyph'), titleOf(doc, entry), metaOf(doc, entry), element(doc, 'span', 'mr-spec-chevron'));
        toggle.addEventListener('click', () => {
          const closed = wrapper.classList.toggle('is-collapsed');
          toggle.setAttribute('aria-expanded', String(!closed));
          r.content.dispatchEvent(new doc.defaultView!.Event('galley:context', { bubbles: true }));
        });
        title.append(toggle);
        heading.append(title);
      }
      if (definition.kind === 'case') {
        const link = element(doc, 'button', 'mr-spec-link', definition.title) as HTMLButtonElement;
        link.type = 'button';
        link.dataset.status = status.toLowerCase();
        link.style.setProperty('--spec-depth', String(definition.depth));
        if (definition.flag.includes('todo')) {
          link.classList.add('is-todo');
          link.append(element(doc, 'span', 'mr-spec-flag is-todo', 'To do'));
        }
        link.append(element(doc, 'span', `mr-spec-status is-${status.toLowerCase()}`, status));
        if (status === 'Removed' && ref.status !== 'removed') link.classList.add('is-removed');
        link.addEventListener('click', () => {
          wrapper.classList.remove('is-collapsed');
          const toggle = heading.querySelector<HTMLElement>('.mr-spec-toggle')!;
          toggle.setAttribute('aria-expanded', 'true');
          wrapper.scrollIntoView({ block: 'start', behavior: 'instant' });
          toggle.focus({ preventScroll: true });
          r.content.dispatchEvent(new doc.defaultView!.Event('galley:context', { bubbles: true }));
        });
        outline.append(link);
      }
    } else if (!continuation) heading.append(element(doc, 'h3', 'mr-spec-title', 'Imports & setup'));
    code = element(doc, 'div', 'mr-code-lines');
    if (!continuation) wrapper.append(heading);
    wrapper.append(code);
    stream.append(wrapper);
  };
  section();
  for (const [index, block] of r.blocks.entries()) {
    while (cursor < entries.length && entries[cursor].start === index) section(entries[cursor++]);
    // Old-only sections must never hide a following unchanged or updated source row in Clean mode.
    if (removedRows && !removedRows.has(block)) section();
    // A test file is read whole: no line is folded away as unchanged, whatever the Context setting.
    block.el.dataset.mrSpecContext = '';
    code!.append(block.el);
    code!.append(...(editors.get(block.el) ?? []));
  }
  // The heading already says what a declaration's first and last lines say: the name, and where the body
  // opens and closes. In the plan those lines are left out, renamed or not. A line that says more (async,
  // a timeout, a parameter table) stays, and Source restores every line.
  for (const entry of entries) {
    const versions = [
      ['head', entry.side === 'head' ? entry.definition : undefined],
      ['base', entry.side === 'base' ? entry.definition : entry.old],
    ] as const;
    for (const edge of ['start', 'end'] as const) {
      const lines = versions.flatMap(([side, definition]) => {
        const block = definition && entry.rows.find((block) => block[side]?.lines[0] === definition[edge]);
        if (!block) return [];
        const text = block[side]!.text.trim().replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/, '§');
        const pattern = definition.start === definition.end ? TITLE_ONLY : edge === 'start' ? OPENS : CLOSES;
        return [{ block, text, plain: pattern.test(text) }];
      });
      if (lines.every((line) => line.plain && line.text === lines[0].text)) for (const { block } of lines) block.el.dataset.mrSpecBoilerplate = '';
    }
  }
  // Blank lines at the edges of a section only space out the source, added or removed ones too; in the
  // plan the cards do that.
  const blockOf = new Map(r.blocks.map((block) => [block.el, block]));
  const blank = (row: Element) => {
    const block = blockOf.get(row as HTMLElement)!;
    return !(block.head ?? block.base)!.text.trim();
  };
  for (const lines of stream.querySelectorAll('.mr-code-lines')) {
    const rows = [...lines.children].filter((row) => blockOf.has(row as HTMLElement));
    for (const edge of [rows, [...rows].reverse()])
      for (const row of edge) {
        if (!blank(row)) break;
        (row as HTMLElement).dataset.mrSpecBoilerplate = '';
      }
  }
  // A stretch of nothing but blank lines between two tests is not worth a box of its own.
  for (const blank of stream.querySelectorAll<HTMLElement>('.mr-spec-section.is-continuation')) {
    if ([...blank.querySelectorAll('.mr-code-text')].some((text) => text.textContent!.trim())) continue;
    const next = blank.nextElementSibling?.querySelector(':scope > .mr-code-lines');
    if (next) next.prepend(...blank.querySelector('.mr-code-lines')!.childNodes);
    else blank.previousElementSibling!.querySelector(':scope > .mr-code-lines')!.append(...blank.querySelector('.mr-code-lines')!.childNodes);
    blank.remove();
  }
  // A test that is all title, such as it.todo('…'), has no code to show in the plan.
  for (const section of stream.querySelectorAll('.mr-spec-section'))
    section.classList.toggle(
      'is-bare',
      [...section.querySelectorAll<HTMLElement>('.mr-code-line')].every((row) => 'mrSpecBoilerplate' in row.dataset),
    );
  // The initial supporting section is empty when the file starts with a test declaration.
  const first = stream.firstElementChild!;
  if (!first.querySelector('.mr-code-line')) first.remove();
  else {
    const title = first.querySelector('.mr-spec-title')!;
    const toggle = element(doc, 'button', 'mr-spec-toggle mr-spec-support-toggle') as HTMLButtonElement;
    toggle.type = 'button';
    const collapsed = !first.querySelector('[data-mr-change]');
    first.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.append(element(doc, 'span', 'mr-spec-chevron'), element(doc, 'span', 'mr-spec-name', title.textContent!));
    toggle.addEventListener('click', () => {
      const closed = first.classList.toggle('is-collapsed');
      toggle.setAttribute('aria-expanded', String(!closed));
      r.content.dispatchEvent(new doc.defaultView!.Event('galley:context', { bubbles: true }));
    });
    title.replaceChildren(toggle);
  }
}

/** Unsupported, invalid or expensive files remain the existing source diff. */
export async function enhanceSpecs(r: RenderedDoc, ref: DocRef, contents: DocContents): Promise<void> {
  if (!isSpecPath(ref.path) || Math.max(contents.base.length, contents.head.length) > 200_000 || r.blocks.length > 10_000) return;
  try {
    const reply = await parser.request(hostFor(r.content), { ...contents, jsx: /\.[jt]sx$/i.test(ref.path) });
    if (!r.content.isConnected) return;
    if (!definitions(reply.base, contents.base.split('\n').length) || !definitions(reply.head, contents.head.split('\n').length)) return;
    presentSpecs(r, ref, reply.base, reply.head);
  } catch {
    // The original source view is already usable, including its comments and line numbers.
  }
}
