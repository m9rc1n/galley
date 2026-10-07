import { ReaderError, type CommentTarget, type DocRef, type Thread } from './types.ts';

export interface DiffLine { oldLine?: number; newLine?: number; oldPos: number; newPos: number; hunk: number }

/** Only lines actually present in a platform patch may receive an inline comment. */
export function diffLines(patch = ''): DiffLine[] {
  const result: DiffLine[] = [];
  let oldLine = 0, newLine = 0, hunk = -1;
  for (const line of patch.split('\n')) {
    const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (match) { oldLine = Number(match[1]); newLine = Number(match[2]); hunk++; continue; }
    if (hunk < 0) continue;
    const positions = { oldPos: oldLine, newPos: newLine };
    if (line.startsWith('+')) result.push({ newLine: newLine++, ...positions, hunk });
    else if (line.startsWith('-')) result.push({ oldLine: oldLine++, ...positions, hunk });
    else if (line.startsWith(' ')) result.push({ oldLine: oldLine++, newLine: newLine++, ...positions, hunk });
  }
  return result;
}

export function diffRange(patch: string | undefined, target: CommentTarget): DiffLine[] | null {
  const key = target.side === 'base' ? 'oldLine' : 'newLine';
  const lines = diffLines(patch).filter((row) => row[key] !== undefined && row[key]! >= target.startLine && row[key]! <= target.endLine);
  if (lines.length !== target.endLine - target.startLine + 1 || lines.some((row) => row.hunk !== lines[0].hunk)) return null;
  return lines;
}

export function validateTarget(docs: DocRef[], target: CommentTarget): void {
  if (!docs.includes(target.doc) || !Number.isInteger(target.startLine) || !Number.isInteger(target.endLine) || target.startLine < 1 || target.endLine < target.startLine || (target.side !== 'base' && target.side !== 'head')) {
    throw new ReaderError('Select a paragraph in this review before commenting.');
  }
}

export function commentContext(target: CommentTarget, body: string): string {
  const path = target.side === 'base' ? target.doc.oldPath : target.doc.path;
  const context = `${path} · ${target.side === 'base' ? 'old' : 'new'} lines ${target.startLine}–${target.endLine}`;
  const quote = target.quote ? `\n\n${target.quote.split('\n').map((line) => `> ${line}`).join('\n')}` : '';
  return `${body.trim()}\n\n---\n${context}${quote}`;
}

export function requireBody(body: string): void {
  if (!body.trim()) throw new ReaderError('Write a comment before posting.');
}

/** Fields of GitHub's pull request review comments that the reader uses. */
export interface GitHubReviewComment {
  id: number;
  in_reply_to_id?: number;
  path: string;
  line?: number | null;
  side?: 'LEFT' | 'RIGHT' | null;
  subject_type?: 'line' | 'file';
  body?: string;
  user?: { login: string } | null;
  created_at: string;
  html_url: string;
}

/** Group review comments into threads (replies follow their root) for the documents in view. */
export function githubThreads(docs: DocRef[], comments: GitHubReviewComment[]): Thread[] {
  const byId = new Map<number, Thread>();
  const threads: Thread[] = [];
  for (const c of [...comments].sort((a, b) => a.id - b.id)) {
    const entry = { author: c.user?.login ?? 'ghost', body: c.body ?? '', createdAt: c.created_at, url: c.html_url };
    const root = c.in_reply_to_id === undefined ? undefined : byId.get(c.in_reply_to_id);
    if (root) {
      root.comments.push(entry);
      byId.set(c.id, root);
      continue;
    }
    const doc = docs.find((d) => d.path === c.path || d.oldPath === c.path);
    if (!doc) continue;
    const file = c.subject_type === 'file';
    const thread: Thread = {
      doc,
      side: c.side === 'LEFT' ? 'base' : 'head',
      line: file ? null : (c.line ?? null),
      outdated: !file && c.line == null,
      url: c.html_url,
      comments: [entry],
    };
    threads.push(thread);
    byId.set(c.id, thread);
  }
  return threads;
}

/** Fields of GitLab's merge request discussions that the reader uses. */
export interface GitLabDiscussion {
  notes: Array<{
    id: number;
    body: string;
    system?: boolean;
    resolved?: boolean;
    created_at: string;
    author?: { username: string } | null;
    position?: { new_path?: string; old_path?: string; new_line?: number | null; old_line?: number | null } | null;
  }>;
}

/** Diff discussions become threads; general merge request discussions have no place in a document. */
export function gitlabThreads(docs: DocRef[], discussions: GitLabDiscussion[], noteUrl: (id: number) => string): Thread[] {
  const threads: Thread[] = [];
  for (const discussion of discussions) {
    const notes = discussion.notes.filter((note) => !note.system);
    const first = notes[0];
    const position = first?.position;
    if (!first || !position) continue;
    const doc = docs.find((d) => d.path === position.new_path || d.oldPath === position.old_path);
    if (!doc) continue;
    const head = position.new_line != null;
    threads.push({
      doc,
      side: head ? 'head' : 'base',
      line: (head ? position.new_line : position.old_line) ?? null,
      resolved: Boolean(first.resolved),
      url: noteUrl(first.id),
      comments: notes.map((note) => ({ author: note.author?.username ?? 'unknown', body: note.body, createdAt: note.created_at, url: noteUrl(note.id) })),
    });
  }
  return threads;
}
