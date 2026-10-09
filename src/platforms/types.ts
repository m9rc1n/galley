import type { RepoLinks } from '../core/paths.ts';

export type DocStatus = 'added' | 'removed' | 'modified' | 'renamed';

/** A markdown file changed by the pull/merge request. */
export interface DocRef {
  path: string;
  oldPath: string;
  status: DocStatus;
  kind?: 'code';
}

export interface DocContents {
  base: string;
  head: string;
}

export interface CommentTarget {
  doc: DocRef;
  side: 'base' | 'head';
  /** One-based, inclusive source range of the selected paragraph(s). */
  startLine: number;
  endLine: number;
  quote: string;
}

export interface ThreadComment {
  /** The name people know them by: GitLab's display name, or the GitHub login (the API gives no name). */
  author: string;
  /** Their username, for @mentions in replies. */
  handle?: string;
  /** Markdown, written by any participant; rendered through the same sanitiser as documents. */
  body: string;
  createdAt: string;
  url: string;
}

/** An existing review thread, anchored to a line of one version of a document. */
export interface Thread {
  doc: DocRef;
  side: 'base' | 'head';
  /** One-based line in that version; null for file comments and threads whose line is gone. */
  line: number | null;
  outdated?: boolean;
  resolved?: boolean;
  url: string;
  comments: ThreadComment[];
  /** Continues this exact platform conversation. Never automatically retries a write. */
  reply?(body: string): Promise<{ url: string }>;
}

export interface CommentPlan {
  kind: 'inline' | 'file' | 'discussion';
  label: string;
  /** Posts an ordinary platform comment. Never automatically retries a write. */
  post(body: string): Promise<{ url: string; reply?: Thread['reply'] }>;
}

/** The pull or merge request itself: what its author wrote about the change. */
export interface ReviewOverview {
  kind: 'Pull request' | 'Merge request';
  title: string;
  /** Markdown, rendered through the same sanitiser as documents and comments. */
  description: string;
  author: string;
  url: string;
}

/** Everything the reader needs about one pull/merge request. */
export interface ReviewSource {
  title: string;
  subtitle: string;
  /** Link back to the platform's own diff view. */
  diffUrl: string;
  docs: DocRef[];
  /** Optional text source files, appended after documents when enabled. */
  codeDocs?: DocRef[];
  load(doc: DocRef): Promise<DocContents>;
  links(doc: DocRef): RepoLinks;
  /** Native platform review progress, if the current authentication supports it. */
  viewed?: {
    label: string;
    load(): Promise<string[]>;
    set(doc: DocRef, viewed: boolean): Promise<void>;
  };
  prepareComment?(target: CommentTarget): Promise<CommentPlan>;
  /** Review threads already on the pull or merge request. */
  loadThreads?(): Promise<Thread[]>;
  /** Its title and description, shown as the first document when the reader chooses (Review settings). */
  overview?: ReviewOverview;
}

/** An error with a human explanation of what to do about it. */
export class ReaderError extends Error {
  readonly hint: string;
  readonly needsToken: boolean;
  constructor(message: string, hint = '', needsToken = false) {
    super(message);
    this.hint = hint;
    this.needsToken = needsToken;
  }
}
