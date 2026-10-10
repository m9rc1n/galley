// Keeps the documentation connected and honest.
//   node scripts/docs.mjs           check: front matter, ADR ↔ RFC links, indexes, relative links and anchors
//   node scripts/docs.mjs --write   regenerate the indexes in docs/adr/README.md and docs/rfcs/README.md
// `npm run check` (and so the pre-push hook) and CI run the check. Records are the source of truth:
// an index is never edited by hand, and a decision and the proposal behind it always link both ways.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import MarkdownIt from 'markdown-it';

export const ADR_STATUSES = ['Proposed', 'Accepted', 'Deprecated', 'Superseded', 'Rejected'];
export const RFC_STATUSES = ['Draft', 'Proposed', 'Accepted', 'Implemented', 'Postponed', 'Declined', 'Withdrawn', 'Superseded'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const RECORD_FILE = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
/** Sample repositories for the demo imitate other projects; their links point into those projects. */
const IGNORED = [/^demo\/samples\//, /^node_modules\//];

const md = new MarkdownIt({ html: true });

/**
 * The small YAML subset the records use: `key: value`, `key: [a, b]`, and `key:` followed by `- item`
 * lines. Values stay strings; numbers in lists are converted by the callers that expect numbers.
 */
export function parseFrontMatter(text) {
  const { yaml, body, lines } = splitFrontMatter(text);
  if (yaml === null) return { data: null, body, lines };
  const data = {};
  let list = null;
  for (const raw of yaml.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(scalar(item[1]));
      continue;
    }
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`Cannot read front matter line: ${raw}`);
    const [, key, value] = pair;
    if (value === '') {
      list = data[key] = [];
    } else {
      list = null;
      data[key] = value.startsWith('[') && value.endsWith(']') ? splitList(value.slice(1, -1)) : scalar(value);
    }
  }
  return { data, body, lines };
}

/** The front matter block, unread, and the document after it; `lines` is how many lines the block takes. */
function splitFrontMatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { yaml: null, body: text, lines: 0 };
  return { yaml: match[1], body: text.slice(match[0].length), lines: match[0].split('\n').length - 1 };
}

function scalar(value) {
  const v = value.trim();
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

function splitList(inner) {
  return inner.trim() ? inner.split(',').map(scalar) : [];
}

/** Heading anchors the way GitHub makes them: lower case, punctuation dropped, spaces to hyphens, repeats numbered. */
export function anchorsOf(markdown) {
  const seen = new Map();
  const anchors = new Set();
  const tokens = md.parse(splitFrontMatter(markdown).body, {});
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'heading_open') continue;
    const text = tokens[i + 1].children
      .filter((child) => child.type === 'text' || child.type === 'code_inline')
      .map((child) => child.content)
      .join('');
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
      .replace(/ /g, '-');
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  for (const [, id] of markdown.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(id);
  return anchors;
}

/** Every link and image destination outside code: Markdown links, and href/src in raw HTML. */
export function linksOf(markdown) {
  const links = [];
  const { body, lines } = splitFrontMatter(markdown);
  const fromHtml = (html, line) => {
    for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) links.push({ url, line });
  };
  for (const token of md.parse(body, {})) {
    const line = (token.map?.[0] ?? 0) + lines + 1;
    if (token.type === 'html_block') fromHtml(token.content, line);
    for (const child of token.children ?? []) {
      if (child.type === 'link_open') links.push({ url: child.attrGet('href'), line });
      else if (child.type === 'image') links.push({ url: child.attrGet('src'), line });
      else if (child.type === 'html_inline') fromHtml(child.content, line);
    }
  }
  return links;
}

/** Markdown files in the repository: tracked, plus new ones git would add. */
export function markdownFiles(root) {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '*.md'], { cwd: root, encoding: 'utf8' });
  return out
    .split('\0')
    .filter(Boolean)
    .filter((file) => existsSync(join(root, file)) && !IGNORED.some((pattern) => pattern.test(file)))
    .sort();
}

/** Relative links must reach a file in the repository, and an anchor into a Markdown file must name one of its headings. */
export function checkLinks(root, files) {
  const problems = [];
  const anchorCache = new Map();
  const anchors = (file) => {
    if (!anchorCache.has(file)) anchorCache.set(file, anchorsOf(readFileSync(file, 'utf8')));
    return anchorCache.get(file);
  };
  for (const file of files) {
    const path = join(root, file);
    for (const { url, line } of linksOf(readFileSync(path, 'utf8'))) {
      if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
      const [target, hash] = url.split('#');
      let decoded;
      try {
        decoded = decodeURIComponent(target.split('?')[0]);
      } catch {
        problems.push(`${file}:${line}: cannot decode link ${url}`);
        continue;
      }
      const destination = decoded ? (decoded.startsWith('/') ? join(root, decoded) : resolve(dirname(path), decoded)) : path;
      if (relative(root, destination).startsWith('..')) {
        problems.push(`${file}:${line}: ${url} leaves the repository`);
        continue;
      }
      if (!existsSync(destination)) {
        problems.push(`${file}:${line}: ${url} does not exist`);
        continue;
      }
      if (hash && destination.endsWith('.md') && statSync(destination).isFile() && !anchors(destination).has(decodeURIComponent(hash))) {
        problems.push(`${file}:${line}: ${url} names no heading in ${relative(root, destination)}`);
      }
    }
  }
  return problems;
}

/** ADRs or RFCs, read from `NNNN-slug.md` files: number, title (from the H1) and front matter. */
export function readRecords(root, folder, kind) {
  const records = [];
  const problems = [];
  const dir = join(root, folder);
  if (!existsSync(dir)) return { records, problems };
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.md') || name === 'README.md' || name === 'template.md') continue;
    const where = `${folder}/${name}`;
    const file = RECORD_FILE.exec(name);
    if (!file) {
      problems.push(`${where}: name records NNNN-short-title.md, in lower case`);
      continue;
    }
    const number = Number(file[1]);
    const text = readFileSync(join(dir, name), 'utf8');
    let front;
    try {
      front = parseFrontMatter(text);
    } catch (err) {
      problems.push(`${where}: ${err.message}`);
      continue;
    }
    const heading = new RegExp(`^# ${kind} ${file[1]}: (.+)$`, 'm').exec(front.body);
    if (!front.data) problems.push(`${where}: front matter is missing`);
    if (!heading) problems.push(`${where}: the first heading must be "# ${kind} ${file[1]}: Title"`);
    if (!front.data || !heading) continue;
    records.push({ number, file: name, title: heading[1].trim(), data: front.data, where });
  }
  return { records, problems };
}

const numbers = (value) => (Array.isArray(value) ? value : value ? [value] : []).map(Number);

/** Statuses, dates and the links between decisions and proposals, which must agree in both directions. */
export function checkRecords(adrs, rfcs) {
  const problems = [];
  const adrBy = new Map(adrs.map((record) => [record.number, record]));
  const rfcBy = new Map(rfcs.map((record) => [record.number, record]));
  for (const adr of adrs) {
    const { status, date } = adr.data;
    if (!ADR_STATUSES.includes(status)) problems.push(`${adr.where}: status must be one of ${ADR_STATUSES.join(', ')}`);
    if (!DATE.test(date ?? '')) problems.push(`${adr.where}: date must be YYYY-MM-DD`);
    for (const n of numbers(adr.data.rfcs)) {
      const rfc = rfcBy.get(n);
      if (!rfc) problems.push(`${adr.where}: RFC ${n} does not exist`);
      else if (!numbers(rfc.data.adrs).includes(adr.number)) problems.push(`${rfc.where}: list ADR ${adr.number} under adrs, since it cites this RFC`);
    }
    for (const n of numbers(adr.data.supersedes)) {
      const older = adrBy.get(n);
      if (!older) problems.push(`${adr.where}: superseded ADR ${n} does not exist`);
      else if (!numbers(older.data['superseded-by']).includes(adr.number))
        problems.push(`${older.where}: set superseded-by: ${adr.number}, since ADR ${adr.number} supersedes it`);
    }
    const newer = numbers(adr.data['superseded-by']);
    if (status === 'Superseded' && !newer.length) problems.push(`${adr.where}: a superseded decision names its successor in superseded-by`);
    for (const n of newer) if (!adrBy.has(n)) problems.push(`${adr.where}: superseding ADR ${n} does not exist`);
  }
  for (const rfc of rfcs) {
    const { status, created, discussion } = rfc.data;
    if (!RFC_STATUSES.includes(status)) problems.push(`${rfc.where}: status must be one of ${RFC_STATUSES.join(', ')}`);
    if (!DATE.test(created ?? '')) problems.push(`${rfc.where}: created must be YYYY-MM-DD`);
    if (discussion && !/^https:\/\//.test(discussion)) problems.push(`${rfc.where}: discussion must be an https link`);
    for (const n of numbers(rfc.data.adrs)) {
      const adr = adrBy.get(n);
      if (!adr) problems.push(`${rfc.where}: ADR ${n} does not exist`);
      else if (!numbers(adr.data.rfcs).includes(rfc.number))
        problems.push(`${adr.where}: list RFC ${rfc.number} under rfcs, since it records this RFC's decision`);
    }
  }
  return problems;
}

const pad = (n) => String(n).padStart(4, '0');
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|');
const recordLinks = (list, dir, all) =>
  numbers(list)
    .map((n) => {
      const record = all.find((r) => r.number === n);
      return record ? `[${pad(n)}](${dir}${record.file})` : pad(n);
    })
    .join(', ') || '—';

export function adrIndex(adrs, rfcs) {
  const rows = adrs.map((adr) => {
    const status = adr.data.status === 'Superseded' ? `Superseded by ${recordLinks(adr.data['superseded-by'], '', adrs)}` : adr.data.status;
    return `| [${pad(adr.number)}](${adr.file}) | ${cell(adr.title)} | ${status} | ${adr.data.date} | ${recordLinks(adr.data.rfcs, '../rfcs/', rfcs)} |`;
  });
  return ['| ADR | Decision | Status | Date | RFCs |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

export function rfcIndex(rfcs, adrs) {
  const rows = rfcs.map((rfc) => {
    const discussion = rfc.data.discussion ? `[#${rfc.data.discussion.split('/').pop()}](${rfc.data.discussion})` : '—';
    return `| [${pad(rfc.number)}](${rfc.file}) | ${cell(rfc.title)} | ${rfc.data.status} | ${cell(rfc.data.theme ?? '—')} | ${discussion} | ${recordLinks(rfc.data.adrs, '../adr/', adrs)} |`;
  });
  return ['| RFC | Proposal | Status | Theme | Discussion | ADRs |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
}

/** Replace what sits between `<!-- name:start -->` and `<!-- name:end -->`. */
export function replaceBetween(text, name, content) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from < 0 || to < from) throw new Error(`Markers ${start} … ${end} are missing`);
  return `${text.slice(0, from + start.length)}\n${content}\n${text.slice(to)}`;
}

/** Agent skills: a SKILL.md whose name is its folder's, with a description that says when to use it. */
export function checkSkills(root) {
  const problems = [];
  const dir = join(root, '.claude/skills');
  if (!existsSync(dir)) return problems;
  for (const name of readdirSync(dir).sort()) {
    const file = join(dir, name, 'SKILL.md');
    const where = relative(root, file);
    if (!existsSync(file)) {
      problems.push(`${where} is missing`);
      continue;
    }
    const { data } = parseFrontMatter(readFileSync(file, 'utf8'));
    if (!data) {
      problems.push(`${where}: front matter is missing`);
      continue;
    }
    if (data.name !== name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) problems.push(`${where}: name must be "${name}", in kebab case`);
    if (!data.description || data.description.length > 1024)
      problems.push(`${where}: description must say what the skill does and when to use it, in at most 1,024 characters`);
  }
  return problems;
}

export function run(root, { write = false } = {}) {
  const adr = readRecords(root, 'docs/adr', 'ADR');
  const rfc = readRecords(root, 'docs/rfcs', 'RFC');
  const problems = [...adr.problems, ...rfc.problems, ...checkRecords(adr.records, rfc.records), ...checkSkills(root)];
  const indexes = [
    ['docs/adr/README.md', 'adr-index', adrIndex(adr.records, rfc.records)],
    ['docs/rfcs/README.md', 'rfc-index', rfcIndex(rfc.records, adr.records)],
  ];
  for (const [file, marker, table] of indexes) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    let next;
    try {
      next = replaceBetween(text, marker, table);
    } catch (err) {
      problems.push(`${file}: ${err.message}`);
      continue;
    }
    if (next === text) continue;
    if (write) writeFileSync(path, next);
    else problems.push(`${file}: the index is out of date; run npm run docs:index`);
  }
  problems.push(...checkLinks(root, markdownFiles(root)));
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const problems = run(root, { write: process.argv.includes('--write') });
  if (problems.length) {
    console.error(`Documentation problems:\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Documentation: records, indexes and links are in order.');
}
