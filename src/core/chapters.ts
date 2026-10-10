import { readingOrder, testPartners } from './order.ts';
import { quietPath } from './quiet.ts';
import type { DocRef } from '../platforms/types.ts';

export interface ReviewChapter {
  id: string;
  title: string;
  reason: string;
  introduction: string;
  files: DocRef[];
}

const pathOf = (doc: DocRef) => (doc.status === 'removed' ? doc.oldPath : doc.path);
/** Two folder levels keep a monorepo's package areas together, without guessing semantic concerns. */
const areaOf = (path: string) => path.split('/').slice(0, -1).slice(0, 2).join('/');

/** Every supplied file appears once. Tests follow the same source associations as suggested order. */
export function reviewChapters(docs: DocRef[], otherFiles: DocRef[] = []): ReviewChapter[] {
  const partners = testPartners(docs);
  const chapters = new Map<string, ReviewChapter>();
  const add = (doc: DocRef, id: string, title: string, reason: string) => {
    let chapter = chapters.get(id);
    if (!chapter) {
      chapter = { id, title, reason, introduction: '', files: [] };
      chapters.set(id, chapter);
    }
    chapter.files.push(doc);
  };
  for (const doc of readingOrder(docs)) {
    if (quietPath(doc)) {
      add(doc, 'supporting', 'Supporting files', 'Lockfiles, generated output, snapshots, images and vendored files, identified by their paths.');
      continue;
    }
    const subject = partners.get(doc) ?? doc;
    const area = areaOf(pathOf(subject));
    const kind = doc.kind === 'code' ? 'code' : 'docs';
    add(
      doc,
      `${kind}:${area}`,
      area || (kind === 'docs' ? 'Documents' : 'Root source files'),
      kind === 'docs'
        ? 'Documents grouped by their folder.'
        : 'Source files grouped by their folder; matching tests follow their source using names and the nearest folder.',
    );
  }
  for (const doc of otherFiles) add(doc, 'other', 'Other changed files', 'Formats the reader does not display. Open them in the platform diff.');
  return [...chapters.values()];
}
