export function reviewTitle(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1];
}

export const changedOnly = false;
