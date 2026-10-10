import { reviewChapters, type ReviewChapter } from '../core/chapters.ts';
import { testPartners } from '../core/order.ts';
import type { DocRef } from '../platforms/types.ts';
import { platformLink } from './render.ts';

export interface ChapterFileState {
  viewed: boolean;
  folded: boolean;
  hidden: boolean;
  unavailable: boolean;
  current: boolean;
  unsupported: boolean;
}

interface Options {
  root: HTMLElement;
  toggle: HTMLButtonElement;
  mount: HTMLElement;
  beforeOpen(): void;
  navigate(doc: DocRef): void;
  reorder(docs: DocRef[] | null): void;
  state(doc: DocRef): ChapterFileState;
  diffUrl(): string;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}
function button(text: string, action: () => void, className = 'mr-chapter-button'): HTMLButtonElement {
  const el = node('button', className, text);
  el.type = 'button';
  el.addEventListener('click', action);
  return el;
}

/** An optional map: no file is hidden by grouping, and only explicit Viewed actions count as progress. */
export class ChapterMap {
  private chapters: ReviewChapter[] = [];
  private docs: DocRef[] = [];
  private other: DocRef[] = [];
  private partners = new Map<DocRef, DocRef>();
  private editing = false;
  private flat = false;
  private custom = 0;
  private focus: HTMLElement;
  private readonly expanded = new Set<string>();
  private readonly overlay = node('div', 'mr-chapters');
  private readonly panel = node('section', 'mr-chapters-panel');
  private readonly content = node('div', 'mr-chapters-content');
  private readonly route = node('section', 'mr-chapter-route');
  private readonly routeText = node('span', 'mr-chapter-route-text');
  private readonly next = button('Next chapter', () => this.stepChapter(), 'mr-chapter-button mr-chapter-next');
  private readonly first = button('Start here', () =>
    this.start(this.chapters.find((item) => item.files.some((doc) => !this.options.state(doc).viewed && !this.options.state(doc).unsupported))!),
  );
  private readonly edit = button('Edit chapters', () => {
    this.editing = !this.editing;
    this.flat = false;
    this.build();
    this.edit.focus();
  });
  private readonly files = button('All files', () => {
    this.flat = !this.flat;
    this.build();
    this.files.focus();
  });
  private readonly progress = node('p', 'mr-chapters-progress');
  private readonly feedback = node('p', 'mr-chapters-feedback');

  constructor(private readonly options: Options) {
    this.focus = options.toggle;
    this.overlay.hidden = this.route.hidden = true;
    const backdrop = button('', () => this.close(), 'mr-chapters-backdrop');
    backdrop.setAttribute('aria-label', 'Close review chapters');
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'mr-chapters-title');
    const header = node('header', 'mr-chapters-header');
    const title = node('h2', '', 'Review chapters');
    title.id = 'mr-chapters-title';
    header.append(
      title,
      button('Close', () => this.close()),
    );
    const intro = node('p', 'mr-chapters-intro', 'A path through the change. Every file remains available.');
    const tools = node('div', 'mr-chapters-tools');
    tools.append(this.first, this.files, this.edit);
    const footer = node('footer', 'mr-chapters-footer');
    footer.append(
      button(
        'New chapter',
        () => {
          const chapter: ReviewChapter = { id: `custom:${++this.custom}`, title: 'New chapter', reason: 'Grouped by you.', introduction: '', files: [] };
          this.chapters.push(chapter);
          this.expanded.add(chapter.id);
          this.editing = true;
          this.flat = false;
          this.build();
          this.content.querySelector<HTMLInputElement>(`[data-chapter="${chapter.id}"] input`)!.focus();
        },
        'mr-chapter-button mr-chapter-new',
      ),
      button('Reset chapters', () => {
        this.chapters = reviewChapters(this.docs, this.other);
        this.expanded.clear();
        this.build();
        this.options.reorder(null);
        this.edit.focus();
        this.announce('Suggested chapters restored. File order follows your reading settings.');
      }),
      node('p', '', 'Names, introductions and grouping changes stay in this session.'),
    );
    this.feedback.setAttribute('role', 'status');
    this.feedback.setAttribute('aria-live', 'polite');
    this.panel.append(header, intro, this.progress, tools, this.content, footer, this.feedback);
    this.overlay.append(backdrop, this.panel);
    this.overlay.addEventListener('click', (event) => event.stopPropagation());
    options.root.append(this.overlay);
    this.route.append(
      button('Chapters', () => this.open()),
      this.routeText,
      this.next,
    );
    this.route.addEventListener('click', (event) => event.stopPropagation());
    options.mount.before(this.route);
    options.toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      this.open();
    });
    this.panel.addEventListener(
      'toggle',
      (event) => {
        const details = event.target as HTMLDetailsElement;
        if (details.open) this.expanded.add(details.dataset.chapter!);
        else this.expanded.delete(details.dataset.chapter!);
      },
      true,
    );
  }

  setSource(docs: DocRef[], other: DocRef[]): void {
    this.docs = docs;
    this.other = other;
    this.partners = testPartners(docs);
    this.chapters = reviewChapters(docs, other);
    this.options.toggle.hidden = docs.length + other.length < 2;
    this.build();
  }

  open(): void {
    if (this.options.toggle.hidden) return;
    this.options.beforeOpen();
    const active = (this.options.root.getRootNode() as Document | ShadowRoot).activeElement;
    this.focus = active instanceof HTMLElement ? active : this.options.toggle;
    this.build();
    this.overlay.hidden = false;
    this.options.toggle.setAttribute('aria-expanded', 'true');
    this.options.root.classList.add('chapters-open');
    for (const el of this.background()) el.inert = true;
    this.panel.querySelector<HTMLButtonElement>('button')!.focus();
  }

  close(): void {
    if (this.overlay.hidden) return;
    this.overlay.hidden = true;
    this.options.root.classList.remove('chapters-open');
    this.options.toggle.setAttribute('aria-expanded', 'false');
    for (const el of this.background()) el.inert = false;
    this.focus.focus({ preventScroll: true });
  }

  /** Consume reader shortcuts while this dialog is open; preserve native editing and button keys. */
  onKey(event: KeyboardEvent): boolean {
    if (this.overlay.hidden) return false;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Tab') {
      const controls = [...this.panel.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')].filter(
        (el) => !el.matches(':disabled') && el.getClientRects().length,
      );
      const active = (this.options.root.getRootNode() as Document | ShadowRoot).activeElement;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    return true;
  }

  private background(): NodeListOf<HTMLElement> {
    return this.options.root.querySelectorAll('.mr-topbar, .mr-main, .mr-toc, .mr-resume, .mr-select-chip');
  }

  private start(chapter: ReviewChapter): void {
    const doc =
      chapter.files.find((doc) => !this.options.state(doc).viewed && !this.options.state(doc).unsupported) ??
      chapter.files.find((doc) => !this.options.state(doc).unsupported)!;
    this.close();
    this.options.navigate(doc);
  }

  private stepChapter(): void {
    const index = this.chapters.findIndex((chapter) => chapter.files.some((doc) => this.options.state(doc).current));
    this.start(this.nextChapter(index)!);
  }

  private nextChapter(index: number): ReviewChapter | undefined {
    return this.chapters.slice(index + 1).find((chapter) => chapter.files.some((doc) => !this.options.state(doc).unsupported));
  }

  private announce(text: string): void {
    this.feedback.textContent = text;
  }

  update(): void {
    const all = [...this.docs, ...this.other];
    const viewed = all.filter((doc) => this.options.state(doc).viewed).length;
    this.progress.textContent = `${all.length} changed files · ${viewed} explicitly viewed`;
    this.first.disabled = !all.some((doc) => !this.options.state(doc).viewed && !this.options.state(doc).unsupported);
    this.first.textContent = viewed ? 'Continue here' : 'Start here';
    this.route.hidden = all.length < 6;
    const current = this.chapters.findIndex((chapter) => chapter.files.some((doc) => this.options.state(doc).current));
    this.routeText.textContent =
      current < 0 ? `${this.chapters.length} chapters · ${all.length} files` : `${current + 1} of ${this.chapters.length} · ${this.chapters[current].title}`;
    this.next.disabled = current < 0 || !this.nextChapter(current);
    const byId = new Map(this.chapters.map((chapter) => [chapter.id, chapter]));
    for (const section of this.content.querySelectorAll<HTMLElement>('[data-chapter]')) {
      const chapter = byId.get(section.dataset.chapter!)!;
      section.querySelector('.mr-chapter-title')!.textContent = chapter.title;
      section.querySelector('.mr-chapter-progress')!.textContent =
        `${chapter.files.filter((doc) => this.options.state(doc).viewed).length} of ${chapter.files.length} viewed`;
    }
    for (const option of this.content.querySelectorAll<HTMLOptionElement>('[data-chapter-destination] option'))
      option.textContent = byId.get(option.value)!.title;
    for (const item of this.content.querySelectorAll<HTMLElement>('[data-file]')) {
      const doc = all[Number(item.dataset.file)];
      const state = this.options.state(doc);
      item.classList.toggle('is-current', state.current);
      if (state.current) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
      const status = [state.viewed ? 'Viewed' : 'Not viewed'];
      if (state.unsupported) status.push('Platform only');
      if (state.hidden) status.push('Code files off');
      if (state.unavailable) status.push('Failed to load');
      if (state.folded) status.push('Folded');
      item.querySelector('.mr-chapter-file-state')!.textContent = status.join(' · ');
    }
  }

  private file(doc: DocRef): HTMLElement {
    const state = this.options.state(doc);
    const row = node('li', 'mr-chapter-file');
    row.dataset.file = String([...this.docs, ...this.other].indexOf(doc));
    const link = state.unsupported
      ? node('a', 'mr-chapter-file-link')
      : button(
          '',
          () => {
            this.close();
            this.options.navigate(doc);
          },
          'mr-chapter-file-link',
        );
    if (link instanceof HTMLAnchorElement) {
      const url = this.options.diffUrl();
      const href = platformLink(url, url);
      if (href) link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', () => this.close());
    }
    link.append(node('span', 'mr-chapter-path', doc.path), node('span', 'mr-chapter-file-state'));
    const partner = this.partners.get(doc);
    if (partner) link.append(node('small', '', `Test for ${partner.path} · matched by name and nearest folder`));
    if (doc.status === 'renamed') link.append(node('small', '', `Renamed from ${doc.oldPath}`));
    else if (doc.status === 'removed') link.append(node('small', '', 'Deleted'));
    row.append(link);
    return row;
  }

  private build(): void {
    this.content.replaceChildren();
    this.edit.textContent = this.editing ? 'Done editing' : 'Edit chapters';
    this.edit.setAttribute('aria-pressed', String(this.editing));
    this.files.textContent = this.flat ? 'Chapter map' : 'All files';
    this.files.setAttribute('aria-pressed', String(this.flat));
    if (this.flat) {
      const list = node('ul', 'mr-chapter-files');
      list.append(...[...this.docs, ...this.other].map((doc) => this.file(doc)));
      this.content.append(list);
    } else {
      this.chapters.forEach((chapter, index) => {
        const details = node('details', 'mr-chapter');
        details.dataset.chapter = chapter.id;
        details.open = this.expanded.has(chapter.id) || chapter.files.some((doc) => this.options.state(doc).current);
        const summary = node('summary');
        summary.append(node('span', 'mr-chapter-title'), node('span', 'mr-chapter-progress'));
        const body = node('div', 'mr-chapter-body');
        body.append(node('p', 'mr-chapter-reason', chapter.reason));
        if (chapter.introduction) body.append(node('p', 'mr-chapter-introduction', chapter.introduction));
        if (this.editing) {
          const label = node('label', '', 'Chapter name');
          const input = node('input');
          input.value = chapter.title;
          input.maxLength = 80;
          input.addEventListener('input', () => {
            chapter.title = input.value.trim() || 'Untitled chapter';
            this.update();
          });
          label.append(input);
          const introduction = node('label', '', 'What to look at (optional)');
          const textarea = node('textarea');
          textarea.value = chapter.introduction;
          textarea.maxLength = 500;
          textarea.addEventListener('input', () => {
            chapter.introduction = textarea.value;
          });
          introduction.append(textarea);
          const controls = node('div', 'mr-chapter-edit-order');
          for (const [step, name] of [
            [-1, 'Earlier'],
            [1, 'Later'],
          ] as const) {
            const move = button(name, () => {
              [this.chapters[index], this.chapters[index + step]] = [this.chapters[index + step], chapter];
              this.applyOrder();
              this.build();
              this.edit.focus();
              this.announce(`${chapter.title} moved ${name.toLowerCase()}.`);
            });
            move.disabled = index + step < 0 || index + step >= this.chapters.length;
            move.setAttribute('aria-label', `Move ${chapter.title} ${name.toLowerCase()}`);
            controls.append(move);
          }
          body.append(label, introduction, controls);
        }
        const list = node('ul', 'mr-chapter-files');
        list.append(...chapter.files.map((doc) => this.file(doc)));
        body.append(list);
        const start = button('Read chapter', () => this.start(chapter));
        start.disabled = !chapter.files.some((doc) => !this.options.state(doc).unsupported);
        body.append(start);
        if (!chapter.files.length) body.append(node('p', 'mr-chapter-reason', 'No files yet. Move a file here while editing.'));
        details.append(summary, body);
        this.content.append(details);
      });
      if (this.editing) this.buildAssignment();
    }
    this.update();
  }

  private buildAssignment(): void {
    const form = node('form', 'mr-chapter-assignment');
    const fileLabel = node('label', '', 'Move file');
    const file = node('select');
    for (const [index, doc] of [...this.docs, ...this.other].entries()) {
      const option = node('option', '', doc.path);
      option.value = String(index);
      file.append(option);
    }
    fileLabel.append(file);
    const destinationLabel = node('label', '', 'To chapter');
    const destination = node('select');
    destination.dataset.chapterDestination = '';
    for (const chapter of this.chapters) {
      const option = node('option', '', chapter.title);
      option.value = chapter.id;
      destination.append(option);
    }
    destinationLabel.append(destination);
    const move = node('button', 'mr-chapter-button', 'Move file');
    move.type = 'submit';
    form.append(fileLabel, destinationLabel, move);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const doc = [...this.docs, ...this.other][Number(file.value)];
      const target = this.chapters.find((chapter) => chapter.id === destination.value)!;
      for (const chapter of this.chapters) chapter.files = chapter.files.filter((file) => file !== doc);
      target.files.push(doc);
      target.reason = 'Grouped by you.';
      this.expanded.add(target.id);
      this.applyOrder();
      this.build();
      this.edit.focus();
      this.announce(`${doc.path} moved to ${target.title}.`);
    });
    this.content.append(form);
  }

  private applyOrder(): void {
    this.options.reorder(this.chapters.flatMap((chapter) => chapter.files).filter((doc) => !this.options.state(doc).unsupported));
  }
}
