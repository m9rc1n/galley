import { ORIGIN_NAMES, PROPOSED_KINDS, type Entity, type Evidence, type LensModel, type LensName, type Relation } from '../core/architecture.ts';
import { ANCHOR_STATES, MAX_LINKS, NOTE_HEADINGS, NOTE_KINDS, NOTE_NAMES, type AnchorState, type Note } from '../core/notes.ts';

/**
 * The repository reader's project views, built from plain data: architecture, infrastructure and
 * decisions (RFC 0049, Phase 3), the reader's own notes and their export (Phase 4), and a review's
 * project context (Phase 5). Interaction goes through data-act on the reader (repo-reader.ts).
 */

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function button(label: string, act: string, className = 'mr-btn mr-outline'): HTMLButtonElement {
  const b = h('button', className, label);
  b.type = 'button';
  b.dataset.act = act;
  return b;
}

export function external(label: string, href: string, className = ''): HTMLAnchorElement {
  const a = h('a', className, label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function option(value: string, label: string, selected = false): HTMLOptionElement {
  const el = h('option', '', label);
  el.value = value;
  el.defaultSelected = selected;
  return el;
}

/** Where things come from, as words and a style: proposals by the reader and guesses look different from sources. */
export function originBadge(origin: Entity['origin']): HTMLElement {
  return h('span', `mr-origin is-${origin}`, ORIGIN_NAMES[origin]);
}

/** How the reader reaches a piece of evidence: a listed document opens here, anything else on the platform. */
export interface EvidenceLinks {
  isDocument(path: string): boolean;
  /** The file on the platform at the commit read, at this line. */
  fileAt(path: string, line: number): string;
}

export function evidenceList(evidence: Evidence[], links: EvidenceLinks): HTMLElement {
  const list = h('ul', 'mr-repo-evidence');
  for (const item of evidence) {
    const li = h('li');
    const label = `${item.path}, line ${item.line}`;
    const to = links.isDocument(item.path) ? button(label, 'evidence', 'mr-repo-proof') : external(label, links.fileAt(item.path, item.line), 'mr-repo-proof');
    if (to instanceof HTMLButtonElement) {
      to.dataset.path = item.path;
      to.dataset.line = String(item.line);
    }
    li.append(to, ' ', h('q', '', item.quote));
    list.append(li);
  }
  return list;
}

// ---------------------------------------------------------------- lenses

export const LENSES: Array<['documents' | LensName, string]> = [
  ['documents', 'Documents'],
  ['architecture', 'Architecture'],
  ['infrastructure', 'Infrastructure'],
  ['decisions', 'Decisions'],
];

export function lensSwitch(current: 'documents' | LensName): HTMLElement {
  const group = h('div', 'mr-seg mr-lens-switch');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Map of');
  for (const [lens, label] of LENSES) {
    const b = button(label, 'lens', '');
    b.dataset.lens = lens;
    b.setAttribute('aria-pressed', String(lens === current));
    group.append(b);
  }
  return group;
}

const INTRO: Record<LensName, string> = {
  architecture: 'Services and components: what configuration declares, what you propose, and where documents name them.',
  infrastructure: 'Pipelines, jobs, environments and resources that configuration declares, and what you propose.',
  decisions: 'Decision records and what they state: their status, which supersede which, and the documents they link to or name.',
};

/** The state of configuration for the views that use it: unread until asked, then what was read and what was not. */
export interface ConfigState {
  state: 'idle' | 'reading' | 'done';
  files: number;
  read: number;
  commit: string;
  notes: string[];
}

export function configStatus(config: ConfigState): HTMLElement {
  const box = h('div', 'mr-lens-configs');
  box.setAttribute('role', 'status');
  if (!config.files) {
    box.append(
      h(
        'p',
        '',
        'No configuration files were found: Compose files, GitHub Actions workflows, .gitlab-ci.yml, Kubernetes manifests in k8s/ or deploy/, and Terraform.',
      ),
    );
    return box;
  }
  if (config.state === 'idle') {
    box.append(
      h(
        'p',
        '',
        `Galley found ${config.files} configuration file${config.files === 1 ? '' : 's'}. It reads them only when you ask, and never runs anything in them.`,
      ),
      button('Read configuration', 'read-configs', 'mr-btn mr-primary'),
    );
  } else if (config.state === 'reading') box.append(h('p', '', `Reading configuration… ${config.read} of ${config.files}`));
  else box.append(h('p', '', `Read ${config.read} of ${config.files} configuration file${config.files === 1 ? '' : 's'} at ${config.commit.slice(0, 7)}.`));
  for (const note of config.notes) box.append(h('p', 'mr-repo-limit', note));
  return box;
}

export interface LensOptions {
  lens: LensName;
  model: LensModel;
  focus: string | null;
  config: ConfigState;
  links: EvidenceLinks;
  /** The document being read, to anchor a proposal to; null when none is open. */
  reading: { path: string; title: string } | null;
}

function entityButton(entity: Entity): HTMLButtonElement {
  const b = button('', 'entity', 'mr-lens-entity');
  b.dataset.id = entity.id;
  b.append(h('span', 'mr-lens-name', entity.name), originBadge(entity.origin));
  return b;
}

function relationItem(relation: Relation, outgoing: boolean, other: Entity, links: EvidenceLinks): HTMLElement {
  const li = h('li', 'mr-lens-relation');
  const line = h('p');
  line.append(h('span', 'mr-lens-label', outgoing ? relation.label : `${relation.label} (from)`), ' ', entityButton(other), ' ', originBadge(relation.origin));
  // A connection the reader made can be removed; where a proposal was read about is part of the proposal.
  if (relation.origin === 'reader' && !relation.to.startsWith('doc:')) {
    const remove = button('Remove', 'remove-relation', 'mr-btn mr-lens-remove');
    remove.dataset.from = relation.from;
    remove.dataset.to = relation.to;
    remove.dataset.label = relation.label;
    line.append(' ', remove);
  }
  li.append(line);
  if (relation.evidence.length) li.append(evidenceList(relation.evidence, links));
  return li;
}

function focusCard(entity: Entity, options: LensOptions): HTMLElement {
  const card = h('div', 'mr-map-center mr-lens-focus');
  const title = h('h2', 'mr-map-title', entity.name);
  title.tabIndex = -1;
  card.append(title);
  const facts = h('p', 'mr-map-facts');
  facts.append(h('span', 'mr-repo-kind', entity.kind), originBadge(entity.origin));
  card.append(facts);
  if (entity.correctedFrom) card.append(h('p', 'mr-repo-limit', `The source says ${entity.correctedFrom}; you set ${entity.kind}.`));
  if (entity.detail) card.append(h('p', 'mr-lens-detail', entity.detail));
  for (const note of entity.notes) card.append(h('p', 'mr-repo-limit', note));
  if (entity.evidence.length) {
    card.append(h('h3', '', 'Where it is said'), evidenceList(entity.evidence, options.links));
  }
  if (entity.doc) {
    const read = button('Read', 'open', 'mr-btn mr-primary');
    read.dataset.path = entity.doc;
    const map = button('On the document map', 'doc-map', 'mr-btn mr-outline');
    map.dataset.path = entity.doc;
    const actions = h('div', 'mr-actions');
    actions.append(read, map);
    card.append(actions);
    return card;
  }
  const kind = h('label', 'mr-lens-kind', 'Type ');
  const select = h('select');
  select.dataset.act = 'entity-kind';
  select.dataset.id = entity.id;
  const original = entity.correctedFrom ?? entity.kind;
  select.dataset.original = original;
  for (const value of [...new Set([original, ...PROPOSED_KINDS])]) select.append(option(value, value, value === entity.kind));
  kind.append(select);
  card.append(kind);
  if (entity.origin === 'reader') {
    const remove = button('Remove this proposal', 'remove-entity', 'mr-btn mr-outline');
    remove.dataset.id = entity.id;
    card.append(remove);
  }
  const others = options.model.entities.filter((other) => other.id !== entity.id && !other.doc);
  if (others.length) {
    const form = h('form', 'mr-lens-connect');
    form.dataset.act = 'propose-relation';
    form.dataset.from = entity.id;
    const to = h('select');
    to.name = 'to';
    to.setAttribute('aria-label', 'Connect to');
    for (const other of others) to.append(option(other.id, `${other.name} (${other.kind})`));
    const label = h('input');
    label.name = 'label';
    label.defaultValue = 'uses';
    label.maxLength = 40;
    label.required = true;
    label.setAttribute('aria-label', 'Connection');
    const submit = h('button', 'mr-btn mr-outline', 'Connect');
    submit.type = 'submit';
    form.append(h('span', '', 'Connect to '), to, h('span', '', ' as '), label, submit);
    card.append(form);
  }
  return card;
}

export function lensView(options: LensOptions): HTMLElement {
  const { lens, model, links } = options;
  const view = h('div', 'mr-lens');
  view.append(h('p', 'mr-lens-intro', INTRO[lens]));
  if (lens !== 'decisions') {
    view.append(configStatus(options.config));
    view.append(h('p', 'mr-lens-caveat', `Declared means what these files ask for at ${options.config.commit.slice(0, 7)}, not what is running.`));
  }
  const focus = model.entities.find((entity) => entity.id === options.focus) ?? model.entities.find((entity) => !entity.doc) ?? model.entities[0];
  if (!focus) view.append(h('p', 'mr-repo-quiet', lens === 'decisions' ? 'No decision records among the documents read so far.' : 'Nothing to show yet.'));
  else {
    const grid = h('div', 'mr-map-grid mr-lens-grid');
    const list = h('section', 'mr-map-col');
    list.setAttribute('aria-label', 'In this view');
    list.append(h('h3', '', `In this view (${model.entities.length})`));
    let kind = '';
    const items = h('ul', 'mr-lens-list');
    for (const entity of model.entities) {
      if (entity.kind !== kind) {
        kind = entity.kind;
        items.append(h('li', 'mr-lens-group', kind));
      }
      const li = h('li');
      const b = entityButton(entity);
      if (entity === focus) b.setAttribute('aria-current', 'true');
      li.append(b);
      items.append(li);
    }
    list.append(items);
    const relations = h('section', 'mr-map-col');
    relations.setAttribute('aria-label', 'Connections');
    const touching = model.relations.filter((relation) => relation.from === focus.id || relation.to === focus.id);
    relations.append(h('h3', '', `Connections (${touching.length})`));
    const ul = h('ul', 'mr-lens-relations');
    for (const relation of touching) {
      const outgoing = relation.from === focus.id;
      const other = model.entities.find((entity) => entity.id === (outgoing ? relation.to : relation.from))!;
      ul.append(relationItem(relation, outgoing, other, links));
    }
    relations.append(touching.length ? ul : h('p', 'mr-repo-quiet', 'No connections found.'));
    grid.append(list, focusCard(focus, options), relations);
    view.append(grid);
  }
  if (lens !== 'decisions') {
    const form = h('form', 'mr-lens-propose');
    form.dataset.act = 'propose-entity';
    form.dataset.lens = lens;
    const name = h('input');
    name.name = 'name';
    name.required = true;
    name.maxLength = 80;
    name.placeholder = lens === 'architecture' ? 'A component, such as Renderer' : 'An environment or deployment unit';
    name.setAttribute('aria-label', 'Name');
    const kindSelect = h('select');
    kindSelect.name = 'kind';
    kindSelect.setAttribute('aria-label', 'Type');
    for (const value of PROPOSED_KINDS) kindSelect.append(option(value, value, value === (lens === 'architecture' ? 'Component' : 'Environment')));
    const submit = h('button', 'mr-btn mr-outline', 'Add');
    submit.type = 'submit';
    form.append(h('h3', '', 'Propose something the files do not show'), name, kindSelect);
    if (options.reading) {
      const about = h('label', 'mr-lens-about');
      const check = h('input');
      check.type = 'checkbox';
      check.name = 'anchor';
      check.defaultChecked = true;
      about.append(check, ` About ${options.reading.title}`);
      form.append(about);
    }
    form.append(submit, h('small', '', 'Proposals are marked as yours, and are kept with your notes when you save them.'));
    view.append(form);
  }
  return view;
}

// ---------------------------------------------------------------- notes

export interface NotesOptions {
  notes: Note[];
  /** Ids of notes chosen for export. */
  chosen: Set<string>;
  state: string;
  dirty: boolean;
  error: string | null;
  recovery: { at: string } | null;
  confirmDelete: boolean;
  /** What a note can be about: the document being read and its sections. */
  anchors: Array<{ value: string; label: string }>;
  anchorStates: Map<string, AnchorState>;
  /** Everything a note can be connected to, with a name to show: needed for its connections and while connecting. */
  targets: Array<{ id: string; label: string }>;
  editing: string | null;
  /** The note being connected to something: its list of choices is open. */
  connecting: string | null;
}

function kindPicker(selected: Note['kind'], name = 'kind'): HTMLElement {
  const group = h('fieldset', 'mr-note-kinds');
  group.append(h('legend', '', 'Kind'));
  for (const kind of NOTE_KINDS) {
    const label = h('label');
    const radio = h('input');
    radio.type = 'radio';
    radio.name = name;
    radio.value = kind;
    radio.defaultChecked = kind === selected;
    label.append(radio, ` ${NOTE_NAMES[kind]}`);
    group.append(label);
  }
  return group;
}

function textArea(value: string): HTMLTextAreaElement {
  const text = h('textarea');
  text.name = 'text';
  text.required = true;
  text.maxLength = 4_000;
  text.rows = 3;
  text.defaultValue = value;
  text.setAttribute('aria-label', 'Note');
  return text;
}

function groupInput(value: string, groups: string[]): HTMLElement {
  const label = h('label', 'mr-note-group', 'Question these alternatives answer ');
  const input = h('input');
  input.name = 'group';
  input.maxLength = 200;
  input.defaultValue = value;
  input.setAttribute('list', 'mr-note-groups');
  const list = h('datalist');
  list.id = 'mr-note-groups';
  for (const group of groups) list.append(option(group, group));
  label.append(input, list);
  return label;
}

function noteCard(note: Note, options: NotesOptions): HTMLElement {
  const groups = [...new Set(options.notes.map((other) => other.group).filter(Boolean))];
  if (options.editing === note.id) {
    const form = h('form', 'mr-note is-editing');
    form.dataset.act = 'save-note';
    form.dataset.id = note.id;
    const save = h('button', 'mr-btn mr-primary', 'Save note');
    save.type = 'submit';
    const actions = h('div', 'mr-actions');
    actions.append(save, button('Cancel', 'cancel-edit'));
    form.append(kindPicker(note.kind), textArea(note.text), groupInput(note.group, groups), actions);
    return form;
  }
  const card = h('article', `mr-note is-${note.kind}`);
  card.dataset.id = note.id;
  const head = h('header');
  const choose = h('label', 'mr-note-choose');
  const check = h('input');
  check.type = 'checkbox';
  check.dataset.act = 'choose-note';
  check.dataset.id = note.id;
  check.checked = options.chosen.has(note.id);
  choose.append(check, ' Include in export');
  head.append(h('span', 'mr-note-kind', NOTE_NAMES[note.kind]), h('span', 'mr-origin is-reader', 'Your note'), choose);
  card.append(head, h('p', 'mr-note-text', note.text));
  if (note.anchor) {
    const about = h('p', 'mr-note-about');
    const go = button(note.anchor.label, 'open', 'mr-repo-proof');
    go.dataset.path = note.anchor.path;
    if (note.anchor.heading) go.dataset.anchor = note.anchor.heading;
    about.append('About ', go);
    const state = options.anchorStates.get(note.id);
    if (state) {
      about.append(' · ', h('span', `mr-note-state is-${state}`, ANCHOR_STATES[state]));
      if (state === 'changed' || state === 'missing') {
        const again = state === 'changed' ? button('Reconfirm', 'reconfirm', 'mr-btn mr-outline') : button('Detach', 'detach', 'mr-btn mr-outline');
        again.dataset.id = note.id;
        about.append(' ', again);
      }
    }
    card.append(about);
  }
  const connected = note.links.map((id) => ({ id, label: options.targets.find((target) => target.id === id)?.label })).filter((link) => link.label);
  if (connected.length) {
    const list = h('ul', 'mr-note-links');
    for (const link of connected) {
      const li = h('li', '', `Tentatively connected to ${link.label} `);
      const remove = button('Disconnect', 'disconnect', 'mr-btn mr-lens-remove');
      remove.dataset.id = note.id;
      remove.dataset.link = link.id;
      li.append(remove);
      list.append(li);
    }
    card.append(list);
  }
  const foot = h('footer', 'mr-actions');
  if (options.connecting === note.id) {
    const connect = h('select');
    connect.dataset.act = 'connect-note';
    connect.dataset.id = note.id;
    connect.setAttribute('aria-label', 'Connect this note to');
    connect.append(option('', 'Choose…'));
    for (const target of options.targets) if (target.id !== note.id && !note.links.includes(target.id)) connect.append(option(target.id, target.label));
    const cancel = button('Cancel', 'cancel-connect');
    cancel.dataset.id = note.id;
    foot.append(connect, cancel);
  } else if (note.links.length < MAX_LINKS) {
    const connect = button('Connect…', 'connect');
    connect.dataset.id = note.id;
    foot.append(connect);
  }
  const edit = button('Edit', 'edit-note');
  edit.dataset.id = note.id;
  const remove = button('Delete', 'delete-note');
  remove.dataset.id = note.id;
  foot.append(edit, remove);
  card.append(foot);
  return card;
}

export function notesView(options: NotesOptions): HTMLElement {
  const view = h('section', 'mr-notes');
  view.setAttribute('aria-label', 'Your notes');
  const head = h('header', 'mr-notes-head');
  head.append(
    h('h1', 'mr-title', 'Your notes'),
    h('p', 'mr-repo-quiet', 'Private to this browser. Saved only when you choose Save, and shared only through an export you check first.'),
  );
  const actions = h('div', 'mr-actions');
  const status = h('span', 'mr-notes-state', options.state);
  status.setAttribute('role', 'status');
  const save = button('Save', 'save-notes', 'mr-btn mr-primary');
  save.disabled = !options.dirty;
  actions.append(status, save, button('Export…', 'export'), button('Delete all notes…', 'delete-notes'));
  head.append(actions);
  if (options.confirmDelete) {
    const confirm = h('div', 'mr-repo-limit mr-notes-confirm');
    confirm.append(
      h('span', '', 'Delete every note, proposal and type you set for this repository, here and in storage?'),
      button('Delete all notes', 'confirm-delete-notes', 'mr-btn mr-primary'),
      button('Keep them', 'cancel-delete-notes'),
    );
    head.append(confirm);
  }
  if (options.recovery) {
    const offer = h('div', 'mr-repo-limit mr-notes-recover');
    offer.append(
      h('span', '', `You have unsaved notes from ${options.recovery.at}.`),
      button('Recover', 'recover', 'mr-btn mr-primary'),
      button('Discard', 'discard-draft'),
    );
    head.append(offer);
  }
  if (options.error) head.append(h('p', 'mr-repo-limit', options.error));
  view.append(head);

  const form = h('form', 'mr-note-form');
  form.dataset.act = 'add-note';
  const about = h('label', 'mr-note-anchor', 'About ');
  const select = h('select');
  select.name = 'anchor';
  select.append(option('', 'No document'));
  for (const anchor of options.anchors) select.append(option(anchor.value, anchor.label, anchor === options.anchors[0]));
  about.append(select);
  const add = h('button', 'mr-btn mr-primary', 'Add note');
  add.type = 'submit';
  const groups = [...new Set(options.notes.map((note) => note.group).filter(Boolean))];
  form.append(kindPicker('idea'), textArea(''), groupInput('', groups), about, add);
  view.append(form);

  if (!options.notes.length)
    view.append(h('p', 'mr-repo-quiet', 'No notes yet. Ideas, questions, assumptions, next experiments and alternatives you add appear here.'));
  for (const kind of NOTE_KINDS) {
    const ofKind = options.notes.filter((note) => note.kind === kind);
    if (!ofKind.length) continue;
    const section = h('section', 'mr-notes-kind');
    section.append(h('h2', '', `${NOTE_HEADINGS[kind]} (${ofKind.length})`));
    if (kind === 'alternative') {
      // Alternatives that answer the same question sit side by side, to compare.
      for (const group of [...new Set(ofKind.map((note) => note.group))]) {
        const compare = h('div', 'mr-notes-compare');
        compare.append(h('h3', '', group || 'Alternatives without a question'));
        const row = h('div', 'mr-notes-row');
        for (const note of ofKind.filter((other) => other.group === group)) row.append(noteCard(note, options));
        compare.append(row);
        section.append(compare);
      }
    } else for (const note of ofKind) section.append(noteCard(note, options));
    view.append(section);
  }
  return view;
}

// ---------------------------------------------------------------- export

export interface ExportOptions {
  format: 'markdown' | 'mermaid';
  text: string;
  chosen: number;
  total: number;
  /** The platform's new-issue form with this text, or null when the text is too long to send in an address. */
  issue: string | null;
  platform: string;
}

export function exportDialog(options: ExportOptions): HTMLElement {
  const panel = h('div', 'mr-export-panel');
  const head = h('header');
  const close = button('Close', 'close-export', 'mr-btn mr-outline');
  head.append(h('h2', '', 'Export notes'), close);
  panel.append(head);
  panel.append(
    h(
      'p',
      'mr-repo-quiet',
      options.chosen
        ? `${options.chosen} of ${options.total} notes chosen. Only chosen notes are included: read the text before you share it.`
        : 'Choose notes with Include in export first. Nothing else is ever included.',
    ),
  );
  const formats = h('div', 'mr-seg');
  formats.setAttribute('role', 'group');
  formats.setAttribute('aria-label', 'Format');
  for (const [format, label] of [
    ['markdown', 'Markdown'],
    ['mermaid', 'Mermaid'],
  ] as const) {
    const b = button(label, 'export-format', '');
    b.dataset.format = format;
    b.setAttribute('aria-pressed', String(options.format === format));
    formats.append(b);
  }
  const preview = h('pre', 'mr-export-preview', options.text);
  preview.tabIndex = 0;
  preview.setAttribute('aria-label', 'What will be exported');
  const actions = h('div', 'mr-actions');
  const copy = button('Copy', 'copy-export', 'mr-btn mr-primary');
  const download = button('Download', 'download-export');
  copy.disabled = download.disabled = !options.chosen;
  actions.append(copy, download);
  panel.append(formats, preview, actions);
  const share = h('section', 'mr-export-share');
  share.append(h('h3', '', 'Share it as an issue'));
  if (!options.chosen) share.append(h('p', 'mr-repo-quiet', 'Choose notes to share first.'));
  else if (options.issue) {
    share.append(
      h('p', 'mr-repo-quiet', `Opens the new-issue form on ${options.platform} in a new tab, with this text. Nothing is posted until you submit it there.`),
      external('Open a new issue…', options.issue, 'mr-btn mr-outline'),
    );
  } else share.append(h('p', 'mr-repo-quiet', 'This text is too long to open in an issue form. Copy it instead.'));
  panel.append(share);
  return panel;
}

// ---------------------------------------------------------------- a review's project context

export interface ReviewRelated {
  path: string;
  title: string;
  kind: string | null;
  /** Changed in the review itself, or connected to a file the review changes. */
  flag: 'changed' | 'worth-checking';
  evidence: Array<{ path: string; line: number; text: string }>;
}

export interface ReviewOptions {
  title: string;
  revision: string;
  /** How much of the repository has been read: related documents come only from those. */
  status: HTMLElement;
  chapters: Array<{ title: string; files: Array<{ path: string; changedDoc: boolean; related: ReviewRelated[]; declares: string[] }> }>;
}

const FLAGS: Record<ReviewRelated['flag'], string> = {
  changed: 'Changed in this review',
  'worth-checking': 'Worth checking: it links to a file this review changes',
};

export function reviewView(options: ReviewOptions): HTMLElement {
  const view = h('section', 'mr-review-context');
  view.setAttribute('aria-label', 'This review');
  view.append(
    h('h1', 'mr-title', 'This review'),
    h(
      'p',
      'mr-subtitle',
      `Reading the repository at ${options.revision} for “${options.title}”. Documents that link to the files this review changes are listed with the link that connects them. Galley says what is worth checking; it never says a document is wrong.`,
    ),
    options.status,
  );
  for (const chapter of options.chapters) {
    const section = h('section', 'mr-review-chapter');
    section.append(h('h2', '', chapter.title));
    for (const file of chapter.files) {
      const box = h('div', 'mr-review-file');
      const head = h('p', 'mr-review-path');
      if (file.changedDoc) {
        const open = button(file.path, 'open', 'mr-repo-edge-doc');
        open.dataset.path = file.path;
        head.append(open, ' ', h('span', 'mr-review-flag is-changed', 'Changed document'));
      } else head.append(h('code', '', file.path));
      box.append(head);
      if (file.declares.length) box.append(h('p', 'mr-repo-quiet', `Declares ${file.declares.join(', ')}.`));
      if (!file.related.length) box.append(h('p', 'mr-repo-quiet', 'No document read so far links here.'));
      const list = h('ul', 'mr-repo-edges');
      for (const related of file.related) {
        const li = h('li', 'mr-repo-edge');
        const open = button(related.title, 'open', 'mr-repo-edge-doc');
        open.dataset.path = related.path;
        li.append(open);
        if (related.kind) li.append(h('span', 'mr-repo-kind', related.kind));
        li.append(h('span', `mr-review-flag is-${related.flag}`, FLAGS[related.flag]));
        const proofs = h('ul', 'mr-repo-evidence');
        for (const proof of related.evidence) {
          const item = h('li');
          const at = button('', 'evidence', 'mr-repo-proof');
          at.dataset.path = related.path;
          at.dataset.line = String(proof.line);
          at.append(h('q', '', proof.text), ` line ${proof.line}`);
          item.append(at);
          proofs.append(item);
        }
        li.append(proofs);
        list.append(li);
      }
      if (file.related.length) box.append(list);
      section.append(box);
    }
    view.append(section);
  }
  return view;
}
