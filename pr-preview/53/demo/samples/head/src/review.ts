export function reviewTitle(path: string): string {
  const segments = path.split("/");
  return segments.at(-1) ?? path;
}

export const changedOnly = true;

export const reviewOptions = { includeCodeFiles: false, showChangedParagraphs: true, keepCommentTargetPinned: true };
