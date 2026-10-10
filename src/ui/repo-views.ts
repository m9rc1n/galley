import { ORIGIN_NAMES, PROPOSED_KINDS, type Entity, type Evidence, type LensModel, type LensName, type Origin, type Relation } from '../core/architecture.ts';
import { ANCHOR_STATES, MAX_LINKS, MAX_NOTE_CHARS, NOTE_HEADINGS, NOTE_KINDS, NOTE_NAMES, type AnchorState, type Note } from '../core/notes.ts';
import { chip, h, option, selectField, setRow, switchButton, textField, type ChipKind } from './dom.ts';
import { icons } from './icons.ts';

/**
 * The repository reader's project views, built from plain data with the reader's own components
 * (docs/design/patterns.md): chips for facts, settings rows for fields, the composer card for writing,
 * thread cards for notes, and a sheet for export. Architecture, infrastructure and decisions are RFC
 * 0049's Phase 3; notes and their export Phase 4; a review's project context Phase 5. Interaction goes
 * through data-act on the reader (repo-reader.ts).
 */

export { h };

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

const ORIGIN_CHIPS: Record<Origin, ChipKind | null> = { documented: null, declared: null, reader: 'own', suggested: 'unverified' };

/** Where something comes from, as a chip: the reader's own carry the accent, guesses a hollow dot. */
export function originChip(origin: Origin): HTMLElement {
  return chip(ORIGIN_CHIPS[origin], ORIGIN_NAMES[origin]);
}

/** Facts in a row, as in a document's byline. */
function facts(...chips: HTMLElement[]): HTMLElement {
  const row = h('span', 'mr-file-meta mr-repo-facts');
  row.append(...chips);
  return row;
}

/** A form's actions, as in the comment editor: a status line when there is something to say, then the buttons. */
function composeActions(status: string, ...buttons: HTMLElement[]): HTMLElement {
  const actions = h('div', 'mr-compose-actions');
  if (status) actions.append(h('p', 'mr-comment-status', status));
  actions.append(...buttons);
  return actions;
}

function submit(label: string): HTMLButtonElement {
  const b = h('button', 'mr-btn mr-primary mr-submit', label);
  b.type = 'submit';
  return b;
}

function select(name: string, values: Array<[string, string]>, chosen: string): HTMLSelectElement {
  const el = h('select');
  el.name = name;
  for (const [value, label] of values) el.append(option(value, label, value === chosen));
  return el;
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

/** The map's views, as a segmented control. */
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

/** Like the map's own status: what was read, the action that reads more, and what could not be read. */
export function configStatus(config: ConfigState): HTMLElement {
  const box = h('div', 'mr-map-status mr-lens-configs');
  box.setAttribute('role', 'status');
  const files = `${config.files} configuration file${config.files === 1 ? '' : 's'}`;
  if (!config.files)
    box.append(
      h(
        'p',
        '',
        'No configuration files were found: Compose files, GitHub Actions workflows, .gitlab-ci.yml, Kubernetes manifests in k8s/ or deploy/, and Terraform.',
      ),
    );
  else if (config.state === 'idle')
    box.append(
      h('p', '', `Galley found ${files}. It reads them only when you ask, and never runs anything in them.`),
      button('Read configuration', 'read-configs'),
    );
  else if (config.state === 'reading') box.append(h('p', '', `Reading configuration… ${config.read} of ${config.files}`));
  else box.append(h('p', '', `Read ${config.read} of ${files} at ${config.commit.slice(0, 7)}.`));
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

/** An entity in a list, like a document in the documents menu: its name, and where it comes from. */
function entityItem(entity: Entity): HTMLButtonElement {
  const b = button('', 'entity', 'mr-menu-item mr-lens-entity');
  b.dataset.id = entity.id;
  const name = h('span', 'mr-menu-name');
  name.append(h('span', 'mr-path-name', entity.name));
  b.append(name, originChip(entity.origin));
  return b;
}

/** A connection, like an edge on the document map: what it is, the other end, its origin and evidence. */
function relationItem(relation: Relation, outgoing: boolean, other: Entity, links: EvidenceLinks): HTMLElement {
  const li = h('li', 'mr-repo-edge mr-lens-relation');
  const to = button(other.name, 'entity', 'mr-repo-edge-doc');
  to.dataset.id = other.id;
  li.append(
    h('span', 'mr-lens-label', outgoing ? relation.label : `${relation.label} (from)`),
    to,
    facts(originChip(other.origin), originChip(relation.origin)),
  );
  // A connection the reader made can be removed; where a proposal was read about is part of the proposal.
  if (relation.origin === 'reader' && !relation.to.startsWith('doc:')) {
    const remove = button('Remove', 'remove-relation', 'mr-reply-to');
    remove.dataset.from = relation.from;
    remove.dataset.to = relation.to;
    remove.dataset.label = relation.label;
    li.append(remove);
  }
  if (relation.evidence.length) li.append(evidenceList(relation.evidence, links));
  return li;
}

function focusCard(entity: Entity, options: LensOptions): HTMLElement {
  const card = h('div', 'mr-map-center mr-lens-focus');
  const title = h('h2', 'mr-map-title', entity.name);
  title.tabIndex = -1;
  card.append(title);
  const kind = h('p', 'mr-map-facts');
  kind.append(chip(null, entity.kind), originChip(entity.origin));
  card.append(kind);
  if (entity.correctedFrom) card.append(h('p', 'mr-repo-limit', `The source says ${entity.correctedFrom}; you set ${entity.kind}.`));
  if (entity.detail) card.append(h('p', 'mr-lens-detail', entity.detail));
  for (const note of entity.notes) card.append(h('p', 'mr-repo-limit', note));
  if (entity.evidence.length) card.append(h('h3', '', 'Where it is said'), evidenceList(entity.evidence, options.links));
  if (entity.doc) {
    const read = button('Read', 'open', 'mr-btn mr-primary');
    read.dataset.path = entity.doc;
    const map = button('On the document map', 'doc-map');
    map.dataset.path = entity.doc;
    const actions = h('div', 'mr-actions');
    actions.append(read, map);
    card.append(actions);
    return card;
  }
  const original = entity.correctedFrom ?? entity.kind;
  const type = select(
    'kind',
    [...new Set([original, ...PROPOSED_KINDS])].map((value) => [value, value]),
    entity.kind,
  );
  type.dataset.act = 'entity-kind';
  type.dataset.id = entity.id;
  type.dataset.original = original;
  card.append(setRow('Type', selectField(type), entity.origin === 'reader' ? 'Your proposal' : `The source says ${original}`));
  if (entity.origin === 'reader') {
    const remove = button('Remove this proposal', 'remove-entity');
    remove.dataset.id = entity.id;
    card.append(remove);
  }
  const others = options.model.entities.filter((other) => other.id !== entity.id && !other.doc);
  if (others.length) {
    const form = h('form', 'mr-lens-connect');
    form.dataset.act = 'propose-relation';
    form.dataset.from = entity.id;
    form.setAttribute('aria-label', 'Connect to another item');
    const label = textField('label', 'uses', 40);
    label.required = true;
    form.append(
      setRow(
        'Connect to',
        selectField(
          select(
            'to',
            others.map((other) => [other.id, `${other.name} (${other.kind})`]),
            '',
          ),
        ),
      ),
      setRow('As', label, 'What it does to the other: uses, reads, deploys to'),
      composeActions('', submit('Connect')),
    );
    card.append(form);
  }
  return card;
}

/** Something the files do not show, written like a comment: a composer card with its fields. */
function proposeForm(lens: 'architecture' | 'infrastructure', reading: LensOptions['reading']): HTMLElement {
  const form = h('form', 'mr-composer mr-lens-propose');
  form.dataset.act = 'propose-entity';
  form.dataset.lens = lens;
  form.setAttribute('aria-label', 'Propose something the files do not show');
  const name = textField('name', '', 80);
  name.required = true;
  name.placeholder = lens === 'architecture' ? 'A component, such as Renderer' : 'An environment or deployment unit';
  form.append(
    h('p', 'mr-comment-target', 'Propose something the files do not show'),
    setRow('Name', name),
    setRow(
      'Type',
      selectField(
        select(
          'kind',
          PROPOSED_KINDS.map((value) => [value, value]),
          lens === 'architecture' ? 'Component' : 'Environment',
        ),
      ),
    ),
  );
  if (reading) form.append(setRow(`About ${reading.title}`, switchButton('propose-about', true), 'Ties the proposal to the document you are reading'));
  form.append(composeActions('Marked as yours, and kept with your notes when you save them.', submit('Add')));
  return form;
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
      const b = entityItem(entity);
      if (entity === focus) b.setAttribute('aria-current', 'true');
      li.append(b);
      items.append(li);
    }
    list.append(items);
    const relations = h('section', 'mr-map-col');
    relations.setAttribute('aria-label', 'Connections');
    const touching = model.relations.filter((relation) => relation.from === focus.id || relation.to === focus.id);
    relations.append(h('h3', '', `Connections (${touching.length})`));
    const ul = h('ul', 'mr-repo-edges mr-lens-relations');
    for (const relation of touching) {
      const outgoing = relation.from === focus.id;
      const other = model.entities.find((entity) => entity.id === (outgoing ? relation.to : relation.from))!;
      ul.append(relationItem(relation, outgoing, other, links));
    }
    relations.append(touching.length ? ul : h('p', 'mr-repo-quiet', 'No connections found.'));
    grid.append(list, focusCard(focus, options), relations);
    view.append(grid);
  }
  if (lens !== 'decisions') view.append(proposeForm(lens, options.reading));
  return view;
}

// ---------------------------------------------------------------- notes

export interface NotesOptions {
  notes: Note[];
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

/** The fields a note has besides its text: its kind, and for alternatives the question they answer. */
function noteFields(kind: Note['kind'], group: string, groups: string[]): HTMLElement[] {
  const kinds = select(
    'kind',
    NOTE_KINDS.map((value) => [value, NOTE_NAMES[value]]),
    kind,
  );
  kinds.dataset.act = 'note-kind';
  const question = textField('group', group);
  question.setAttribute('list', 'mr-note-groups');
  const list = h('datalist');
  list.id = 'mr-note-groups';
  for (const value of groups) list.append(option(value, value));
  const groupRow = setRow('Question it answers', question, 'Alternatives to the same question sit side by side');
  groupRow.classList.add('mr-note-group');
  groupRow.hidden = kind !== 'alternative';
  groupRow.append(list);
  return [setRow('Kind', selectField(kinds)), groupRow];
}

function noteText(value: string, placeholder: string): HTMLTextAreaElement {
  const text = h('textarea');
  text.name = 'text';
  text.required = true;
  text.maxLength = MAX_NOTE_CHARS;
  text.rows = 2;
  text.defaultValue = value;
  text.placeholder = placeholder;
  text.setAttribute('aria-label', 'Note');
  return text;
}

/** Your note, as a thread card with a hint of the accent: what it says, what it is about, and what you can do with it. */
function noteCard(note: Note, options: NotesOptions, groups: string[]): HTMLElement {
  if (options.editing === note.id) {
    const form = h('form', 'mr-composer mr-note-composer');
    form.dataset.act = 'save-note';
    form.dataset.id = note.id;
    form.setAttribute('aria-label', 'Edit note');
    const cancel = button('Cancel', 'cancel-edit', 'mr-btn mr-cancel');
    form.append(
      h('p', 'mr-comment-target', `Edit ${NOTE_NAMES[note.kind].toLowerCase()}`),
      noteText(note.text, ''),
      ...noteFields(note.kind, note.group, groups),
      composeActions('', cancel, submit('Save note')),
    );
    return form;
  }
  const card = h('aside', 'mr-thread is-own mr-note');
  card.dataset.id = note.id;
  card.setAttribute('aria-label', `${NOTE_NAMES[note.kind]}: ${note.text.split('\n')[0]}`);
  const meta = h('div', 'mr-thread-meta');
  meta.append(h('span', 'mr-thread-author', NOTE_NAMES[note.kind]));
  const body = h('div', 'mr-thread-body');
  body.append(h('p', 'mr-note-text', note.text));
  card.append(meta, body);
  if (note.anchor) {
    const about = h('p', 'mr-note-about');
    const go = button(note.anchor.label, 'open', 'mr-repo-proof');
    go.dataset.path = note.anchor.path;
    if (note.anchor.heading) go.dataset.anchor = note.anchor.heading;
    about.append('About ', go);
    // Whether the section is as it was when the note was written, and what to do when it is not.
    const state = options.anchorStates.get(note.id);
    if (state) {
      about.append(' · ', h('span', `mr-note-state is-${state}`, ANCHOR_STATES[state]));
      if (state === 'changed' || state === 'missing') {
        const again = state === 'changed' ? button('Reconfirm', 'reconfirm', 'mr-reply-to') : button('Detach', 'detach', 'mr-reply-to');
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
      const li = h('li', '', `Tentatively connected to ${link.label}`);
      const remove = button('Disconnect', 'disconnect', 'mr-reply-to');
      remove.dataset.id = note.id;
      remove.dataset.link = link.id;
      li.append(remove);
      list.append(li);
    }
    card.append(list);
  }
  if (options.connecting === note.id) {
    const connect = select(
      'connect',
      [
        ['', 'Choose…'],
        ...options.targets
          .filter((target) => target.id !== note.id && !note.links.includes(target.id))
          .map((target): [string, string] => [target.id, target.label]),
      ],
      '',
    );
    connect.dataset.act = 'connect-note';
    connect.dataset.id = note.id;
    const cancel = button('Cancel', 'cancel-connect', 'mr-reply-to');
    cancel.dataset.id = note.id;
    const row = setRow('Connect to', selectField(connect));
    row.append(cancel);
    card.append(row);
  }
  const foot = h('div', 'mr-thread-foot');
  const actions: Array<[string, string]> = [
    ...(options.connecting !== note.id && note.links.length < MAX_LINKS ? [['Connect…', 'connect'] as [string, string]] : []),
    ['Edit', 'edit-note'],
    ['Delete', 'delete-note'],
  ];
  for (const [label, act] of actions) {
    const b = button(label, act, 'mr-reply-to');
    b.dataset.id = note.id;
    foot.append(b);
  }
  card.append(foot);
  return card;
}

export function notesView(options: NotesOptions): HTMLElement {
  const view = h('section', 'mr-notes');
  view.setAttribute('aria-label', 'Your notes');
  const head = h('header', 'mr-notes-head');
  head.append(
    h('h1', 'mr-title', 'Your notes'),
    h('p', 'mr-subtitle', 'Private to this browser. Saved only when you choose Save, and shared only through an export you check first.'),
  );
  // Like a document's byline: the state on the left, the actions on the right.
  const byline = h('div', 'mr-byline');
  const state = h('span', 'mr-notes-state', options.state);
  state.setAttribute('role', 'status');
  const meta = h('span', 'mr-file-meta');
  meta.append(state);
  const save = button('Save', 'save-notes', 'mr-btn mr-primary');
  save.disabled = !options.dirty;
  const exporting = button('Export…', 'export');
  exporting.setAttribute('aria-haspopup', 'dialog');
  exporting.setAttribute('aria-expanded', 'false');
  const actions = h('span', 'mr-file-actions mr-notes-actions');
  actions.append(save, exporting, button('Delete all notes…', 'delete-notes'));
  byline.append(meta, actions);
  head.append(byline);
  if (options.confirmDelete) {
    const confirm = composeActions(
      'Delete every note, proposal and type you set for this repository, here and in storage?',
      button('Keep them', 'cancel-delete-notes', 'mr-btn mr-cancel'),
      button('Delete all notes', 'confirm-delete-notes', 'mr-btn mr-primary'),
    );
    confirm.classList.add('mr-notes-confirm');
    confirm.setAttribute('role', 'group');
    confirm.setAttribute('aria-label', 'Delete all notes');
    head.append(confirm);
  }
  if (options.error) {
    const error = h('p', 'mr-repo-limit mr-notes-error', options.error);
    error.setAttribute('role', 'alert');
    head.append(error);
  }
  view.append(head);

  const groups = [...new Set(options.notes.map((note) => note.group).filter(Boolean))];
  const form = h('form', 'mr-composer mr-note-composer');
  form.dataset.act = 'add-note';
  form.setAttribute('aria-label', 'New note');
  const about = select(
    'anchor',
    [['', 'No document'], ...options.anchors.map((anchor): [string, string] => [anchor.value, anchor.label])],
    options.anchors[0]?.value ?? '',
  );
  form.append(
    h('p', 'mr-comment-target', 'New note'),
    noteText('', 'An idea, a question, an assumption, a next experiment or an alternative'),
    ...noteFields('idea', '', groups),
    setRow('About', selectField(about)),
    composeActions('', submit('Add note')),
  );
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
        for (const note of ofKind.filter((other) => other.group === group)) row.append(noteCard(note, options, groups));
        compare.append(row);
        section.append(compare);
      }
    } else for (const note of ofKind) section.append(noteCard(note, options, groups));
    view.append(section);
  }
  // An unsaved draft from an earlier visit is offered like a place to continue from: a quiet pill at the bottom.
  if (options.recovery) {
    const offer = h('div', 'mr-resume mr-notes-recover');
    offer.setAttribute('role', 'status');
    const discard = button('×', 'discard-draft', 'mr-resume-close');
    discard.setAttribute('aria-label', 'Discard unsaved notes');
    discard.title = 'Discard unsaved notes';
    offer.append(h('span', 'mr-resume-text', `You have unsaved notes from ${options.recovery.at}.`), button('Recover', 'recover', 'mr-resume-go'), discard);
    view.append(offer);
  }
  return view;
}

// ---------------------------------------------------------------- export

export interface ExportOptions {
  format: 'markdown' | 'mermaid';
  text: string;
  /** Every note, with whether it is included. */
  notes: Array<{ id: string; label: string; about: string; chosen: boolean }>;
  /** The platform's new-issue form with this text, or null when the text is too long to send in an address. */
  issue: string | null;
  platform: string;
}

/** Export as a sheet, like the settings: a row and a switch for each note, the format, the preview, then the ways out. */
export function exportSheet(options: ExportOptions): HTMLElement[] {
  const chosen = options.notes.filter((note) => note.chosen).length;
  const heading = h('header', 'mr-settings-heading');
  const title = h('div');
  const name = h('h2', '', 'Export notes');
  name.id = 'mr-export-title';
  title.append(
    name,
    h(
      'p',
      '',
      chosen
        ? `${chosen} of ${options.notes.length} notes included. Read the text before you share it.`
        : 'Include the notes to export. Nothing else is ever included.',
    ),
  );
  const close = button('', 'close-export', 'mr-btn mr-icon-btn');
  close.setAttribute('aria-label', 'Close export (Esc)');
  close.title = 'Close export (Esc)';
  // biome-ignore lint/plugin: a bundled icon constant.
  close.innerHTML = icons.close;
  heading.append(title, close);

  const body = h('div', 'mr-settings-body');
  const include = h('section', 'mr-settings-section');
  include.setAttribute('aria-label', 'Notes to include');
  for (const note of options.notes) {
    const toggle = switchButton('choose-note', note.chosen);
    toggle.dataset.id = note.id;
    include.append(setRow(note.label, toggle, note.about));
  }
  if (!options.notes.length) include.append(h('p', 'mr-settings-note', 'You have no notes for this repository yet.'));

  const output = h('section', 'mr-settings-section');
  output.setAttribute('aria-label', 'Format');
  const formats = h('div', 'mr-seg');
  formats.setAttribute('role', 'group');
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
  const copy = button('Copy', 'copy-export', 'mr-btn mr-primary');
  const download = button('Download', 'download-export');
  copy.disabled = download.disabled = !chosen;
  const take = h('div', 'mr-export-actions');
  take.append(copy, download);
  output.append(setRow('Format', formats, 'Markdown reads as text; Mermaid draws the notes as a diagram'), preview, take);

  const share = h('section', 'mr-settings-section');
  share.setAttribute('aria-label', 'Share it as an issue');
  const explain = !chosen
    ? 'Include notes to share first.'
    : options.issue
      ? `Opens the new-issue form on ${options.platform} in a new tab, with this text. Nothing is posted until you submit it there.`
      : 'This text is too long to open in an issue form. Copy it instead.';
  share.append(
    setRow('Share it as an issue', chosen && options.issue ? external('Open a new issue…', options.issue, 'mr-btn mr-outline') : h('span'), explain),
  );

  body.append(
    include,
    output,
    share,
    h('p', 'mr-settings-note', 'Only the notes you include leave this browser, and only when you copy, download or open an issue.'),
  );
  return [heading, body];
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

/** A flag says what is true, never that a document is wrong: changed is a change, worth checking is a plain fact. */
function flagChip(flag: ReviewRelated['flag']): HTMLElement {
  return flag === 'changed' ? chip('modified', 'Changed in this review') : chip(null, 'Worth checking: it links to a file this review changes');
}

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
        head.append(open, facts(chip('modified', 'Changed document')));
      } else head.append(h('code', '', file.path));
      box.append(head);
      if (file.declares.length) box.append(h('p', 'mr-repo-quiet', `Declares ${file.declares.join(', ')}.`));
      if (!file.related.length) box.append(h('p', 'mr-repo-quiet', 'No document read so far links here.'));
      const list = h('ul', 'mr-repo-edges');
      for (const related of file.related) {
        const li = h('li', 'mr-repo-edge');
        const open = button(related.title, 'open', 'mr-repo-edge-doc');
        open.dataset.path = related.path;
        li.append(open, facts(...(related.kind ? [chip(null, related.kind)] : []), flagChip(related.flag)));
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
