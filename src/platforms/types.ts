import type { RepoLinks } from '../core/paths.ts';

export type DocStatus = 'added' | 'removed' | 'modified' | 'renamed';

/** A markdown file changed by the pull/merge request. */
export interface DocRef {
  path: string;
  oldPath: string;
  status: DocStatus;
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

export interface CommentPlan {
  kind: 'inline' | 'file' | 'discussion';
  label: string;
  /** Posts an ordinary platform comment. Never automatically retries a write. */
  post(body: string): Promise<{ url: string }>;
}

/** Everything the reader needs about one pull/merge request. */
export interface ReviewSource {
  title: string;
  subtitle: string;
  /** Link back to the platform's own diff view. */
  diffUrl: string;
  docs: DocRef[];
  load(doc: DocRef): Promise<DocContents>;
  links(doc: DocRef): RepoLinks;
  /** Native platform review progress, if the current authentication supports it. */
  viewed?: {
    label: string;
    load(): Promise<string[]>;
    set(doc: DocRef, viewed: boolean): Promise<void>;
  };
  prepareComment?(target: CommentTarget): Promise<CommentPlan>;
}

/** An error with a human explanation of what to do about it. */
export class ReaderError extends Error {
  readonly hint: string;
  readonly needsToken: boolean;
  constructor(
    message: string,
    hint = '',
    needsToken = false,
  ) {
    super(message);
    this.hint = hint;
    this.needsToken = needsToken;
  }
}
