// The demo runs the real reader against sample files, so it can be tried without the extension.
// The page itself imitates a merge request: the raw diff reviewers read today, and the Read button.
//   ?closed  start with the reader closed      ?doc=N  open the Nth document first
import { structuredPatch } from 'diff';
import type { DocRef, ReviewSource } from '../src/platforms/types.ts';
import { Launcher } from '../src/ui/launcher.ts';
import { openReader } from '../src/ui/reader.ts';

const docs: DocRef[] = [
  { path: 'docs/rfcs/0042-reading-first-reviews.md', oldPath: 'docs/rfcs/0042-reading-first-reviews.md', status: 'modified' },
  { path: 'README.md', oldPath: 'README.md', status: 'modified' },
  { path: 'docs/adr/0007-render-markdown-in-the-browser.md', oldPath: 'docs/adr/0007-render-markdown-in-the-browser.md', status: 'added' },
];

async function text(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function contents(doc: DocRef) {
  const [base, head] = await Promise.all([
    doc.status === 'added' ? '' : text(`samples/base/${doc.oldPath}`),
    doc.status === 'removed' ? '' : text(`samples/head/${doc.path}`),
  ]);
  return { base, head };
}

const source: ReviewSource = {
  title: 'Docs: reading-first reviews',
  subtitle: 'acme/handbook · !128',
  diffUrl: location.href,
  docs,
  load: contents,
  links: () => ({ raw: (path) => `samples/head/${path}`, blob: (path) => `samples/head/${path}` }),
};

function cell(tr: HTMLTableRowElement, value: string | number, className = ''): void {
  const td = tr.insertCell();
  td.textContent = String(value);
  if (className) td.className = className;
}

/** Draw the monospace diff of the first document, the way review tools show it today. */
async function drawDiff(): Promise<void> {
  const patches = await Promise.all(
    docs.map(async (doc) => {
      const { base, head } = await contents(doc);
      return structuredPatch(doc.oldPath, doc.path, base, head, '', '', { context: 3 });
    }),
  );
  const files = document.getElementById('files')!;
  patches.forEach((patch, i) => {
    let added = 0;
    let removed = 0;
    for (const hunk of patch.hunks) for (const line of hunk.lines) line[0] === '+' ? added++ : line[0] === '-' && removed++;
    const li = document.createElement('li');
    if (i === 0) li.className = 'on';
    const name = document.createElement('span');
    name.textContent = docs[i].path.split('/').pop()!;
    const stat = document.createElement('span');
    stat.className = 'stat';
    stat.innerHTML = `<span class="a">+${added}</span> <span class="d">−${removed}</span>`;
    li.append(name, stat);
    files.append(li);
  });

  document.getElementById('file-head')!.textContent = docs[0].path;
  const body = document.getElementById('diff') as HTMLTableSectionElement;
  for (const hunk of patches[0].hunks) {
    const header = body.insertRow();
    header.className = 'hunk';
    cell(header, '', 'n');
    cell(header, '', 'n');
    cell(header, `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;
    for (const line of hunk.lines) {
      const sign = line[0];
      if (sign === '\\') continue;
      const tr = body.insertRow();
      tr.className = sign === '+' ? 'add' : sign === '-' ? 'del' : '';
      cell(tr, sign === '+' ? '' : oldLine++, 'n');
      cell(tr, sign === '-' ? '' : newLine++, 'n');
      cell(tr, `${sign === ' ' ? ' ' : sign} ${line.slice(1)}`);
    }
  }
}

const params = new URLSearchParams(location.search);
const open = () => openReader(source, { start: Number(params.get('doc') ?? 0) });
new Launcher().show('demo', docs.length, open);
void drawDiff();
if (!params.has('closed')) open();
