import type { RepoDiscovery } from '../core/discovery.ts';
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
  /** Changed formats the reader cannot render; chapter maps still account for them. */
  otherFiles?: DocRef[];
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
  /** The repository's own docs at the review's base or head, opened over the review (Project library). */
  project?: ReviewProject;
}

/**
 * A repository read at one commit: its documents as they are, not a change. Review operations
 * (diffs, comments, Viewed) do not exist here; everything is read-only and pinned to `commit`.
 */
export interface RepositorySource {
  platform: 'GitHub' | 'GitLab';
  /** The repository on its site, whichever commit is read: `github:https://github.com/owner/repo`. */
  id: string;
  /** owner/repo, or the GitLab project path. */
  name: string;
  /** The branch, tag or commit the page showed; null for the default branch. */
  ref: string | null;
  /** Every read in this session is at this commit, until the reader refreshes. */
  commit: string;
  /** A commit page, or a review's base or head: there is nothing newer to check. */
  pinned: boolean;
  /** Where the reader was opened: one document, or a folder ('' for the whole repository). */
  start: { path: string; folder: boolean };
  /** The repository on the platform, at this commit. */
  url: string;
  /** The Markdown documents at the commit, within the listing budget (core/discovery.ts). */
  discover(): Promise<RepoDiscovery>;
  /** One document at the commit. */
  load(path: string): Promise<string>;
  links: RepoLinks;
  /** Resolve the same branch or tag again: a new snapshot when it has moved. */
  refresh(): Promise<RepositorySource>;
  /**
   * The platform's own new-issue form, filled in with this text, for the reader to check and submit there.
   * Opening it is a deliberate action; Galley never posts it.
   */
  newIssue(title: string, body: string): string;
}

/** A revision of the repository behind a review: the branch name and the commit the review uses. */
export interface ReviewRevision {
  ref: string;
  commit: string;
}

/** The repository behind a pull or merge request, to read its docs at the review's base or head (RFC 0049). */
export interface ReviewProject {
  base: ReviewRevision;
  head: ReviewRevision;
  open(revision: 'base' | 'head'): RepositorySource;
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
