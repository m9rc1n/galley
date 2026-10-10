// Code is shown one line per block, so long lines wrap under their own indentation instead of
// disappearing past the column edge. Syntax colours are added afterwards by a highlighter that
// loads on demand in a sandboxed frame, without changing any line's text.
import { hostFor, sandbox } from './sandbox.ts';

const LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  javascript: 'javascript',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'bash',
  console: 'bash',
  py: 'python',
  python: 'python',
  rb: 'ruby',
  ruby: 'ruby',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  kotlin: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  csharp: 'csharp',
  'c#': 'csharp',
  php: 'php',
  lua: 'lua',
  r: 'r',
  pl: 'perl',
  perl: 'perl',
  m: 'objectivec',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  md: 'markdown',
  markdown: 'markdown',
  diff: 'diff',
  patch: 'diff',
  makefile: 'makefile',
  mk: 'makefile',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
};

const NAMES: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  yaml: 'YAML',
  ini: 'Config',
  bash: 'Shell',
  python: 'Python',
  ruby: 'Ruby',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  php: 'PHP',
  sql: 'SQL',
  css: 'CSS',
  scss: 'SCSS',
  xml: 'HTML/XML',
  markdown: 'Markdown',
  makefile: 'Makefile',
  dockerfile: 'Dockerfile',
};

/** Highlighter language for a fence info string ("ts", "yaml title=x") or a file path. */
export function languageOf(nameOrPath: string): string | null {
  const word = nameOrPath.trim().split(/\s+/)[0].toLowerCase();
  const file = word.slice(word.lastIndexOf('/') + 1);
  if (file === 'dockerfile' || file.startsWith('dockerfile.')) return 'dockerfile';
  if (file === 'makefile' || file === 'gnumakefile') return 'makefile';
  const key = file.includes('.') ? file.slice(file.lastIndexOf('.') + 1) : file;
  return LANGUAGES[key] ?? null;
}

export function languageName(language: string | null): string | null {
  return language ? (NAMES[language] ?? null) : null;
}

/** Wrapped lines continue under the line's own indentation plus two characters. */
export function setIndent(el: HTMLElement, text: string): void {
  let width = 0;
  for (const c of text) {
    if (c === ' ') width++;
    else if (c === '\t') width += 4 - (width % 4);
    else break;
  }
  if (width) el.style.setProperty('--indent', `${Math.min(width, 40)}ch`);
}

export function lineEl(doc: Document, tag: 'span' | 'ins' | 'del', className: string, text: string, ref: string): HTMLElement {
  const el = doc.createElement(tag);
  el.className = className;
  el.textContent = text;
  el.dataset.line = ref;
  setIndent(el, text);
  return el;
}

export interface CodeSource {
  language: string | null;
  base?: string;
  head?: string;
}

const sources = new WeakMap<HTMLElement, CodeSource>();
export interface CommentLines {
  base: Set<number>;
  head: Set<number>;
}
const comments = new WeakMap<HTMLElement, CommentLines>();

/** Only complete lines recognised as comments in both versions can become prose. */
export function commentLines(container: HTMLElement): CommentLines | undefined {
  return comments.get(container);
}

function isComment(line: DocumentFragment): boolean {
  if (!line.querySelector('.hljs-comment')) return false;
  const copy = line.cloneNode(true) as DocumentFragment;
  for (const comment of copy.querySelectorAll('.hljs-comment')) comment.remove();
  return !copy.textContent!.trim();
}

/** Remember the full text of each version, so tokens that span lines (comments, strings) colour correctly. */
export function registerCode(container: HTMLElement, source: CodeSource): void {
  sources.set(container, source);
  container.dataset.mrCode = '';
}

/** Rebuild an unchanged <pre> as one block per line. */
export function lineify(doc: Document, pre: HTMLElement): void {
  const code = pre.querySelector('code') ?? pre;
  if (code.querySelector('[data-line]')) return;
  const text = code.textContent!.replace(/\n$/, '');
  code.replaceChildren(...text.split('\n').map((line, i) => lineEl(doc, 'span', 'mr-cl', line, `h:${i}`)));
  registerCode(pre, { language: languageOf(pre.dataset.lang ?? ''), head: text });
}

/** highlight.js runs in its sandboxed frame (highlight-frame.ts), where a slow grammar cannot freeze the page. */
const highlighter = sandbox('highlight-frame.html', 8_000);

const TOKEN_CLASS = /^(?:hljs-[\w-]+|[a-z]+_)$/;
const MAX_HIGHLIGHT = 300_000;
const MAX_HIGHLIGHTED_HTML = 10_000_000;

/**
 * Split highlighted HTML into one fragment per line, re-opening spans that cross line breaks.
 * The HTML is parsed in an inert document and rebuilt from text and token classes only.
 */
export function splitHighlighted(doc: Document, html: string): DocumentFragment[] {
  const Parser = doc.defaultView?.DOMParser ?? DOMParser;
  const parsed = new Parser().parseFromString(`<pre>${html}</pre>`, 'text/html').body.firstElementChild!;
  const lines: DocumentFragment[] = [doc.createDocumentFragment()];
  const classes: string[] = [];
  let chain: Node[] = [lines[0]];
  const newline = () => {
    const line = doc.createDocumentFragment();
    lines.push(line);
    chain = [line];
    for (const name of classes) {
      const span = doc.createElement('span');
      if (name) span.className = name;
      chain[chain.length - 1].appendChild(span);
      chain.push(span);
    }
  };
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        child.textContent!.split('\n').forEach((part, i) => {
          if (i) newline();
          if (part) chain[chain.length - 1].appendChild(doc.createTextNode(part));
        });
      } else if (child.nodeType === 1) {
        const name = [...(child as Element).classList].filter((c) => TOKEN_CLASS.test(c)).join(' ');
        const span = doc.createElement('span');
        if (name) span.className = name;
        chain[chain.length - 1].appendChild(span);
        chain.push(span);
        classes.push(name);
        walk(child);
        classes.pop();
        chain.pop();
      }
    }
  };
  walk(parsed);
  return lines;
}

/** Colour every registered code block under `root`; lines whose text would change are left alone. */
export async function highlightCode(root: ParentNode): Promise<void> {
  const containers = [...root.querySelectorAll<HTMLElement>('[data-mr-code=""]')];
  for (const container of containers) {
    const source = sources.get(container);
    // Checked on every pass: closing the reader detaches its blocks, and a detached block would put
    // the frame in the page instead of the reader. Blocks skipped here keep their marker for later.
    if (!source?.language || !container.isConnected) continue;
    container.dataset.mrCode = 'done';
    const doc = container.ownerDocument;
    const host = hostFor(container);
    const versions: Record<string, DocumentFragment[] | null> = {};
    try {
      for (const [key, text] of [
        ['b', source.base],
        ['h', source.head],
      ] as const) {
        const reply = text !== undefined && text.length <= MAX_HIGHLIGHT ? await highlighter.request(host, { code: text, language: source.language }) : null;
        const html = reply?.html;
        versions[key] = typeof html === 'string' && html.length <= MAX_HIGHLIGHTED_HTML ? splitHighlighted(doc, html) : null;
      }
    } catch {
      // The highlighter stopped answering or was closed with the reader: the rest stays plain and readable.
      return;
    }
    const classified: CommentLines = { base: new Set(), head: new Set() };
    for (const [key, side] of [
      ['b', 'base'],
      ['h', 'head'],
    ] as const) {
      const text = source[side];
      if (text === undefined || !versions[key]) continue;
      const original = text.split('\n');
      versions[key]!.forEach((line, index) => {
        if (line.textContent === original[index] && isComment(line)) classified[side].add(index);
      });
    }
    comments.set(container, classified);
    // Only replies whose text matches the line exactly are used, so a reply cannot change what is shown.
    for (const el of container.querySelectorAll<HTMLElement>('[data-line]')) {
      const [side, index] = el.dataset.line!.split(':');
      const line = versions[side]?.[Number(index)];
      if (line && line.textContent === el.textContent) el.replaceChildren(line);
    }
  }
}
