import { icons } from './icons.ts';

/**
 * Small builders both readers share, so the same control is built the same way everywhere
 * (docs/design/patterns.md): chips, settings rows, switches, selects and text fields.
 */

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Change kinds colour the dot; `own` is the reader's own (a hint of the accent), `unverified` a guess (a hollow dot). */
export type ChipKind = 'added' | 'modified' | 'removed' | 'moved' | 'own' | 'unverified';

/** A fact as a chip: a dot and a word, never colour alone. */
export function chip(kind: ChipKind | null, text: string): HTMLElement {
  const el = h('span', kind ? `mr-chip is-${kind}` : 'mr-chip');
  el.append(h('span', 'mr-dot'), text);
  return el;
}

let rows = 0;

/** A settings row: the label, with an optional explanation, on the left; the control on the right. */
export function setRow(label: string, control: HTMLElement, explain = ''): HTMLElement {
  const row = h('div', 'mr-set-row');
  const id = `mr-row-${++rows}`;
  const name = h('span', '', label);
  name.id = id;
  if (explain) name.append(h('small', '', explain));
  // The control is named by its row, whatever kind of control it is.
  const field = control.matches('select, input, button, [role="group"]') ? control : control.querySelector('select, input');
  field?.setAttribute('aria-labelledby', id);
  row.append(name, control);
  return row;
}

/** An on/off control: `role="switch"` with its state in `aria-checked`; its row names it. */
export function switchButton(act: string, checked: boolean): HTMLButtonElement {
  const b = h('button', 'mr-switch');
  b.type = 'button';
  b.dataset.act = act;
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', String(checked));
  return b;
}

/** A native select with the reader's chevron. */
export function selectField(select: HTMLSelectElement): HTMLElement {
  const box = h('div', 'mr-font-select');
  // biome-ignore lint/plugin: a bundled icon constant.
  box.insertAdjacentHTML('beforeend', icons.chevronDown);
  box.prepend(select);
  return box;
}

export function option(value: string, label: string, selected = false): HTMLOptionElement {
  const el = h('option', '', label);
  el.value = value;
  el.defaultSelected = selected;
  return el;
}

/** A one-line text field, styled like the select beside it. */
export function textField(name: string, value = '', most = 200): HTMLInputElement {
  const input = h('input', 'mr-field');
  input.name = name;
  input.defaultValue = value;
  input.maxLength = most;
  return input;
}
