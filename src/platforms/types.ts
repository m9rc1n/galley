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

/** Everything the reader needs about one pull/merge request. */
export interface ReviewSource {
  title: string;
  subtitle: string;
  /** Link back to the platform's own diff view. */
  diffUrl: string;
  docs: DocRef[];
  load(doc: DocRef): Promise<DocContents>;
  links(doc: DocRef): RepoLinks;
}

/** An error with a human explanation of what to do about it. */
export class ReaderError extends Error {
  constructor(
    message: string,
    readonly hint = '',
    readonly needsToken = false,
  ) {
    super(message);
  }
}
