// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderMarkdown } from '../testing/render.ts';
import { languageName, languageOf, lineify, setIndent, splitHighlighted } from './code.ts';

it('picks a highlighter language from a fence label or a file path', () => {
  expect(languageOf('ts title="x.ts"')).toBe('typescript');
  expect(languageOf('src/app/Dockerfile')).toBe('dockerfile');
  expect(languageOf('config/ci.yml')).toBe('yaml');
  expect(languageOf('notes.unknown')).toBeNull();
  expect(languageName('typescript')).toBe('TypeScript');
  expect(languageName(null)).toBeNull();
});

it('recognises makefiles and Dockerfile variants, and leaves unsupported labels unnamed', () => {
  expect(languageOf('build/GNUmakefile')).toBe('makefile');
  expect(languageOf('Makefile')).toBe('makefile');
  expect(languageOf('Dockerfile.production')).toBe('dockerfile');
  expect(languageOf('  ')).toBeNull();
  expect(languageName('unknown')).toBeNull();
});

it('caps indentation, aligns tabs to four columns, and does not lineify a block twice', () => {
  const row = document.createElement('span');
  setIndent(row, ' \t  code');
  expect(row.style.getPropertyValue('--indent')).toBe('6ch');
  setIndent(row, `${' '.repeat(80)}code`);
  expect(row.style.getPropertyValue('--indent')).toBe('40ch');
  const pre = document.createElement('pre');
  pre.textContent = 'one\ntwo\n';
  lineify(document, pre);
  const first = pre.firstChild;
  lineify(document, pre);
  expect(pre.firstChild).toBe(first);
  expect(pre.querySelectorAll('[data-line]')).toHaveLength(2);
  expect(splitHighlighted(document, '<span class="unknown">a\nb</span><!-- ignored -->').map((l) => l.textContent)).toEqual(['a', 'b']);
});

it('splits highlighted code per line, re-opening tokens that span lines and dropping foreign markup', () => {
  const lines = splitHighlighted(
    document,
    '<span class="hljs-keyword">const</span> a = 1; <span class="hljs-comment">/* one\ntwo */</span><img src=x onerror=alert(1)><b class="evil">b</b>',
  );
  expect(lines).toHaveLength(2);
  expect(lines[0].textContent).toBe('const a = 1; /* one');
  expect(lines[1].textContent).toBe('two */b');
  expect(lines[1].firstChild?.nodeName).toBe('SPAN');
  expect((lines[1].firstChild as Element).className).toBe('hljs-comment');
  const box = document.createElement('div');
  box.append(...lines);
  expect(box.querySelectorAll('img, b, [onerror], .evil')).toHaveLength(0);
});

it('renders code blocks as one element per line, each tagged with its line for colouring', () => {
  const r = renderMarkdown('', '```yaml\nsteps:\n    - run: npm ci --ignore-scripts\n\n```\n', 'added');
  const rows = [...r.content.querySelectorAll<HTMLElement>('pre .mr-cl')];
  expect(rows.map((el) => el.textContent)).toStrictEqual(['steps:', '    - run: npm ci --ignore-scripts', '']);
  expect(rows.map((el) => el.dataset.line)).toStrictEqual(['h:0', 'h:1', 'h:2']);
  expect(rows[1].style.getPropertyValue('--indent')).toBe('4ch');
});

it('splits highlighted code in a document that belongs to no window', () => {
  const detached = document.implementation.createHTMLDocument('');
  expect(detached.defaultView).toBeNull();
  expect(splitHighlighted(detached, '<span class="hljs-keyword">const</span> a\nb').map((line) => line.textContent)).toEqual(['const a', 'b']);
});
