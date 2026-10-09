// The demo runs the real reader against sample files, so it can be tried without the extension.
// The page itself imitates a merge request: the raw diff reviewers read today, and the Read button.
//   ?closed  start closed   ?doc=N  start at file N   ?code-only / ?diagram-error  exercise fallbacks
import { structuredPatch } from 'diff';
import type { DocRef, ReviewSource, Thread } from '../src/platforms/types.ts';
import { Launcher } from '../src/ui/launcher.ts';
import { openReader } from '../src/ui/reader.ts';

const params = new URLSearchParams(location.search);

const docs: DocRef[] = [
  { path: 'docs/rfcs/0042-reading-first-reviews.md', oldPath: 'docs/rfcs/0042-reading-first-reviews.md', status: 'modified' },
  { path: 'README.md', oldPath: 'README.md', status: 'modified' },
  { path: 'docs/adr/0007-render-markdown-in-the-browser.md', oldPath: 'docs/adr/0007-render-markdown-in-the-browser.md', status: 'added' },
];

const codeDocs: DocRef[] = [
  { path: 'src/review.ts', oldPath: 'src/review.ts', status: 'modified', kind: 'code' },
  { path: 'src/options.json', oldPath: 'src/options.json', status: 'added', kind: 'code' },
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
  return { base, head: params.has('diagram-error') && doc === docs[0] ? head.replace(/```mermaid[\s\S]*?```/, '```mermaid\nnot a valid diagram\n```') : head };
}

const source: ReviewSource = {
  title: 'Docs: reading-first reviews',
  subtitle: 'acme/handbook · !128',
  diffUrl: location.href,
  overview: {
    kind: 'Merge request',
    title: 'Docs: reading-first reviews',
    author: 'Dana Whitfield',
    url: `${location.origin}/merge_requests/128`,
    description: [
      'Adds **RFC 0042**, which proposes reviewing documentation changes as readable articles instead of raw diffs.',
      '',
      '### What to look at',
      '- The goals and non-goals: are they the right scope for this quarter?',
      '- The rollout plan, especially the two-week dogfood.',
      '',
      'Closes #311.',
    ].join('\n'),
  },
  docs: params.has('code-only') ? [] : docs,
  codeDocs,
  load: contents,
  async prepareComment(target) {
    return {
      kind: 'inline',
      label: 'Post demo comment (stays in this browser)',
      async post(body) {
        const comments = JSON.parse(sessionStorage.getItem('galley:demo-comments') ?? '[]');
        comments.push({ ...target, body });
        sessionStorage.setItem('galley:demo-comments', JSON.stringify(comments));
        return { url: '#demo-comment', reply: demoReply('#demo-comment') };
      },
    };
  },
  async loadThreads() {
    if (!source.docs.length) return [];
    const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
    const [rfc, readme] = docs;
    const threads: Thread[] = [
      {
        doc: rfc,
        side: 'head',
        line: 13,
        url: '#thread-1',
        comments: [
          {
            author: 'Dana Whitfield',
            handle: 'dana',
            body: 'Love this framing. Could we link the **skim-reading** study here?',
            createdAt: ago(26),
            url: '#thread-1',
          },
          {
            author: 'Lee Okafor',
            handle: 'lee',
            body: 'Good idea, I will add it as a footnote in the next revision.',
            createdAt: ago(3),
            url: '#thread-1-reply',
          },
        ],
      },
      {
        doc: rfc,
        side: 'head',
        line: 21,
        url: '#thread-2',
        comments: [
          {
            author: 'Samantha Konstantinopoulou-Reyes',
            handle: 'sam',
            body: 'Does “source of truth” also cover comments written in the reader?',
            createdAt: ago(5),
            url: '#thread-2',
          },
        ],
      },
      {
        doc: readme,
        side: 'head',
        line: null,
        url: '#thread-3',
        comments: [{ author: 'Kim Park', handle: 'kim', body: 'The install section reads much better now.', createdAt: ago(50), url: '#thread-3' }],
      },
    ];
    const replies: Array<{ thread: string; body: string; createdAt: string }> = JSON.parse(sessionStorage.getItem('galley:demo-replies') ?? '[]');
    for (const thread of threads) {
      thread.reply = demoReply(thread.url);
      thread.comments.push(
        ...replies
          .filter((reply) => reply.thread === thread.url)
          .map((reply) => ({ author: 'You', body: reply.body, createdAt: reply.createdAt, url: thread.url })),
      );
    }
    return threads;
  },
  links: () => ({ raw: (path) => `samples/head/${path}`, blob: (path) => `samples/head/${path}` }),
};

function demoReply(thread: string): NonNullable<Thread['reply']> {
  return async (body) => {
    const replies = JSON.parse(sessionStorage.getItem('galley:demo-replies') ?? '[]');
    replies.push({ thread, body: body.trim(), createdAt: new Date().toISOString() });
    sessionStorage.setItem('galley:demo-replies', JSON.stringify(replies));
    return { url: thread };
  };
}

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
    const plus = document.createElement('span');
    plus.className = 'a';
    plus.textContent = `+${added}`;
    const minus = document.createElement('span');
    minus.className = 'd';
    minus.textContent = `−${removed}`;
    stat.append(plus, ' ', minus);
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

const open = () => openReader(source, { start: Number(params.get('doc') ?? 0) });
new Launcher().show('demo', source.docs.length || codeDocs.length, open);
void drawDiff();
if (!params.has('closed')) open();
