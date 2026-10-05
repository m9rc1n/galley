import markdownit from 'markdown-it';
import footnote from 'markdown-it-footnote';
import type { Env, StateCore, Token } from 'markdown-it';

export type UnitKind = 'frontmatter' | 'heading' | 'paragraph' | 'code' | 'table' | 'html' | 'rule';

/**
 * A leaf block of a document (paragraph, heading, list-item text, code block, table…).
 * Units are the granularity at which changes are detected and highlighted.
 */
export interface Unit {
  id: number;
  kind: UnitKind;
  /** Equality key for the block diff. Whitespace-normalised, so re-wrapped paragraphs compare equal. */
  key: string;
  /** Normalised source text, used to score how similar two blocks are. */
  text: string;
  /** 0-based source line range [start, end). */
  lines: [number, number];
  inList: boolean;
  /** Heading level, 0 for everything else. */
  level: number;
  /** Markdown that renders this unit on its own; used to show removed blocks. */
  source: string;
}

export interface FrontMatter {
  raw: string;
  fields: Array<[string, string]>;
}

export interface ParsedDoc {
  /** Rendered HTML (not yet sanitised). Every unit carries a `data-mr-u` attribute. */
  html: string;
  units: Unit[];
  frontmatter: FrontMatter | null;
}

interface RenderEnv extends Env {
  units: Unit[];
  lines: string[];
  slugs: Map<string, number>;
  listDepth: number;
}

const FRONT_MATTER = /^(---|\+\+\+)[ \t]*\n([\s\S]*?)\n\1[ \t]*(?:\n|$)/;

export function splitFrontMatter(src: string): { body: string; frontmatter: FrontMatter | null; lineCount: number } {
  const m = FRONT_MATTER.exec(src);
  if (!m) return { body: src, frontmatter: null, lineCount: 0 };
  const block = m[0];
  const lineCount = block.split('\n').length - (block.endsWith('\n') ? 1 : 0);
  // Blank the block out instead of cutting it, so source line numbers stay valid.
  const body = '\n'.repeat(lineCount) + src.slice(block.length);
  return { body, frontmatter: { raw: m[2], fields: parseFields(m[2], m[1] === '+++' ? '=' : ':') }, lineCount };
}

function parseFields(raw: string, sep: ':' | '='): Array<[string, string]> {
  const fields: Array<[string, string]> = [];
  const keyLine = sep === ':' ? /^([\w.-]+)\s*:\s?(.*)$/ : /^([\w.-]+)\s*=\s?(.*)$/;
  for (const line of raw.split('\n')) {
    const m = keyLine.exec(line);
    if (m) {
      fields.push([m[1], unquote(m[2].trim())]);
    } else if (fields.length && line.trim()) {
      // Nested values and list items are folded into the previous field.
      const last = fields[fields.length - 1];
      const item = unquote(line.trim().replace(/^-\s*/, ''));
      last[1] = last[1] ? `${last[1]}, ${item}` : item;
    }
  }
  return fields;
}

function unquote(value: string): string {
  return /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value;
}

/** GitHub-style heading slug: lowercase, punctuation dropped, spaces become hyphens. */
export function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
}

export function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/**
 * True when an HTML block opens and closes its own tags, so it can be wrapped in a container.
 * Blocks like a lone `<details>` (closed several blocks later) must be rendered untouched.
 */
export function isBalancedHtml(html: string): boolean {
  const stack: string[] = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g)) {
    if (m[0].startsWith('<!--')) continue;
    const [, closing, rawName, selfClosing] = m;
    const name = rawName.toLowerCase();
    if (VOID_TAGS.has(name) || selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else {
      stack.push(name);
    }
  }
  return stack.length === 0;
}

const COMMENT_ONLY = /^\s*(?:<!--[\s\S]*?-->\s*)+$/;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function longestRun(text: string, char: string): number {
  let best = 0;
  let run = 0;
  for (const c of text) {
    run = c === char ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function inlineText(token: Token | undefined): string {
  if (!token?.children) return token?.content ?? '';
  return token.children.map((c) => (c.type === 'text' || c.type === 'code_inline' ? c.content : '')).join('');
}

function addUnit(env: RenderEnv, token: Token, kind: UnitKind, text: string, level: number, source: string): void {
  const id = env.units.length;
  const norm = normalize(text);
  env.units.push({
    id,
    kind,
    key: `${kind}${level || ''}:${norm}`,
    text: norm,
    lines: token.map ? [token.map[0], token.map[1]] : [0, 0],
    inList: env.listDepth > 0,
    level,
    source,
  });
  token.attrSet('data-mr-u', String(id));
}

function annotateUnits(state: StateCore): void {
  const env = state.env as RenderEnv;
  const tokens = state.tokens;
  env.listDepth = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    switch (t.type) {
      case 'bullet_list_open':
      case 'ordered_list_open':
        env.listDepth++;
        break;
      case 'bullet_list_close':
      case 'ordered_list_close':
        env.listDepth--;
        break;
      case 'heading_open': {
        const level = Number(t.tag.slice(1));
        const content = tokens[i + 1]?.content ?? '';
        addUnit(env, t, 'heading', content, level, `${'#'.repeat(level)} ${content}`);
        const base = slugify(inlineText(tokens[i + 1])) || 'section';
        const seen = env.slugs.get(base) ?? 0;
        env.slugs.set(base, seen + 1);
        t.attrSet('id', seen ? `${base}-${seen}` : base);
        break;
      }
      case 'paragraph_open': {
        const content = tokens[i + 1]?.content ?? '';
        addUnit(env, t, 'paragraph', content, 0, content);
        break;
      }
      case 'fence': {
        const fence = '`'.repeat(Math.max(3, longestRun(t.content, '`') + 1));
        addUnit(env, t, 'code', `${t.info}\n${t.content}`, 0, `${fence}${t.info}\n${t.content}${fence}`);
        break;
      }
      case 'code_block':
        addUnit(env, t, 'code', t.content, 0, `\`\`\`\n${t.content}\`\`\``);
        break;
      case 'table_open': {
        const src = t.map ? env.lines.slice(t.map[0], t.map[1]).join('\n') : '';
        // Strip blockquote markers and indentation so the table renders on its own.
        const standalone = src.split('\n').map((l) => l.replace(/^\s*(?:>\s?)*\s*/, '')).join('\n');
        addUnit(env, t, 'table', src, 0, standalone);
        break;
      }
      case 'html_block':
        if (!COMMENT_ONLY.test(t.content) && isBalancedHtml(t.content)) addUnit(env, t, 'html', t.content, 0, t.content);
        break;
      case 'hr':
        addUnit(env, t, 'rule', '---', 0, '---');
        break;
    }
  }
}

/** `- [ ] task` / `- [x] done` list items become disabled checkboxes, like on GitHub and GitLab. */
function taskLists(state: StateCore): void {
  const tokens = state.tokens;
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== 'inline' || tokens[i - 1].type !== 'paragraph_open' || tokens[i - 2].type !== 'list_item_open') continue;
    const first = inline.children?.[0];
    const m = first?.type === 'text' ? /^\[([ xX])\][ \t]+/.exec(first.content) : null;
    if (!first || !m) continue;
    first.content = first.content.slice(m[0].length);
    const box = new state.Token('html_inline', '', 0);
    box.content = `<input type="checkbox" class="mr-task" disabled${m[1] === ' ' ? '' : ' checked'}>`;
    inline.children!.unshift(box);
    tokens[i - 2].attrJoin('class', 'mr-task-item');
  }
}

/** GitHub / GitLab alerts: `> [!NOTE]`, `> [!WARNING]`, … */
function alerts(state: StateCore): void {
  const tokens = state.tokens;
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (tokens[i].type !== 'blockquote_open' || tokens[i + 1].type !== 'paragraph_open') continue;
    const inline = tokens[i + 2];
    const children = inline.children ?? [];
    const first = children[0];
    const m = first?.type === 'text' ? /^\[!(note|tip|important|warning|caution)\][ \t]*/i.exec(first.content) : null;
    if (!first || !m) continue;
    const kind = m[1].toLowerCase();
    tokens[i].attrJoin('class', `mr-alert mr-alert-${kind}`);
    tokens[i].attrSet('data-alert', kind[0].toUpperCase() + kind.slice(1));
    first.content = first.content.slice(m[0].length);
    if (!first.content) children.splice(0, children[1]?.type === 'softbreak' ? 2 : 1);
  }
}

function createMarkdown() {
  const md = markdownit({ html: true, linkify: true, typographer: true });
  // Keep smart quotes but never rewrite `--`, `...` or `(c)`: reviewers need the text as written.
  md.disable('replacements');
  md.use(footnote);
  md.core.ruler.push('mr_tasks', taskLists);
  md.core.ruler.push('mr_alerts', alerts);
  md.core.ruler.push('mr_units', annotateUnits);

  const rules = md.renderer.rules;
  const unitAttr = (t: Token) => {
    const id = t.attrGet('data-mr-u');
    return id === null ? '' : ` data-mr-u="${id}"`;
  };
  // Tight list items have hidden paragraphs; render them as spans so each item still maps to a unit.
  rules.paragraph_open = (tokens, idx, options, _env, self) =>
    tokens[idx].hidden ? `<span class="mr-tight"${unitAttr(tokens[idx])}>` : self.renderToken(tokens, idx, options);
  rules.paragraph_close = (tokens, idx, options, _env, self) =>
    tokens[idx].hidden ? '</span>' : self.renderToken(tokens, idx, options);
  rules.fence = (tokens, idx) => {
    const t = tokens[idx];
    const lang = t.info.trim().split(/\s+/)[0] ?? '';
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : '';
    return `<pre${unitAttr(t)}${langAttr}><code>${escapeHtml(t.content)}</code></pre>\n`;
  };
  rules.code_block = (tokens, idx) => `<pre${unitAttr(tokens[idx])}><code>${escapeHtml(tokens[idx].content)}</code></pre>\n`;
  rules.table_open = (tokens, idx) => `<div class="mr-table"${unitAttr(tokens[idx])}><table>\n`;
  rules.table_close = () => '</table></div>\n';
  rules.html_block = (tokens, idx) => {
    const t = tokens[idx];
    return t.attrGet('data-mr-u') === null ? t.content : `<div class="mr-html"${unitAttr(t)}>${t.content}</div>\n`;
  };
  return md;
}

const md = createMarkdown();

export function renderFrontMatter(fm: FrontMatter, id: number | null): string {
  const rows = fm.fields
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt> <dd>${escapeHtml(v)}</dd></div>\n`)
    .join('');
  const body = rows ? `<dl>\n${rows}</dl>` : `<pre><code>${escapeHtml(fm.raw)}</code></pre>`;
  const attr = id === null ? '' : ` data-mr-u="${id}"`;
  return `<details class="mr-meta"${attr}><summary>Front matter</summary>\n${body}</details>\n`;
}

export function parseDocument(src: string): ParsedDoc {
  const { body, frontmatter, lineCount } = splitFrontMatter(src.replace(/\r\n?/g, '\n'));
  const env: RenderEnv = { units: [], lines: body.split('\n'), slugs: new Map(), listDepth: 0 };
  if (frontmatter) {
    const text = normalize(frontmatter.raw);
    env.units.push({ id: 0, kind: 'frontmatter', key: `frontmatter:${text}`, text, lines: [0, lineCount], inList: false, level: 0, source: '' });
  }
  const tokens = md.parse(body, env);
  const html = md.renderer.render(tokens, md.options, env);
  return { html: (frontmatter ? renderFrontMatter(frontmatter, 0) : '') + html, units: env.units, frontmatter };
}

/** HTML for a single unit rendered on its own (no `data-mr-u` attributes). */
export function renderUnit(unit: Unit, doc: ParsedDoc): string {
  if (unit.kind === 'frontmatter') return doc.frontmatter ? renderFrontMatter(doc.frontmatter, null) : '';
  return md.render(unit.source, { units: [], lines: unit.source.split('\n'), slugs: new Map(), listDepth: 0 } satisfies RenderEnv)
    .replace(/ data-mr-u="\d+"/g, '');
}
