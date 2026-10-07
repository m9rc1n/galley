import DOMPurify from 'dompurify';
import type { Unit } from '../core/markdown.ts';
import type { RenderedBlock } from './render.ts';
import { hostFor, sandbox } from './sandbox.ts';

export interface DiagramVersion {
  side: 'base' | 'head';
  source: string;
  view: HTMLElement;
  sourceDetails: HTMLDetailsElement;
}
export interface Diagram {
  el: HTMLElement;
  versions: DiagramVersion[];
}

/** Use trusted parsed units, never a data-lang attribute supplied by raw HTML. */
export function mermaidSource(unit?: Unit): string | null {
  if (unit?.kind !== 'code') return null;
  const match = /^(`{3,})mermaid(?:[^\S\n][^\n]*)?\n([\s\S]*)\1$/i.exec(unit.source);
  return match?.[2] ?? null;
}

/** Diagrams show whole versions; line-diff markup cannot be parsed as Mermaid. */
export function prepareDiagram(doc: Document, block: RenderedBlock): Diagram | null {
  if (mermaidSource(block.base) === null && mermaidSource(block.head) === null) return null;
  const el = doc.createElement('figure');
  el.className = `${block.el.className} mr-diagram`.trim();
  if (block.el.dataset.mrChange) el.dataset.mrChange = block.el.dataset.mrChange;
  const versions: DiagramVersion[] = [];
  const add = (unit: Unit, side: 'base' | 'head', label: string) => {
    const source = mermaidSource(unit);
    const version = doc.createElement('div');
    version.className = 'mr-diagram-version';
    version.dataset.mrSide = side;
    const caption = doc.createElement('p');
    caption.className = 'mr-diagram-caption'; caption.textContent = label;
    version.append(caption);
    const view = doc.createElement('div');
    view.className = 'mr-diagram-view'; view.setAttribute('aria-label', `${label} Mermaid diagram`);
    view.textContent = 'Rendering diagram…';
    const sourceDetails = doc.createElement('details');
    const summary = doc.createElement('summary'); summary.textContent = 'View source';
    sourceDetails.className = 'mr-diagram-source'; sourceDetails.append(summary);
    const pre = doc.createElement('pre'), code = doc.createElement('code');
    code.textContent = source ?? unit.source;
    pre.append(code); sourceDetails.append(pre);
    if (source !== null) {
      version.append(view, sourceDetails);
      versions.push({ side, source, view, sourceDetails });
    } else {
      version.append(pre);
    }
    el.append(version);
  };
  if (block.kind === 'modified' && block.base && block.head) {
    add(block.base, 'base', 'Before'); add(block.head, 'head', 'After');
  } else if (block.head) add(block.head, 'head', block.kind === 'added' ? 'New diagram' : 'Diagram');
  else if (block.base) add(block.base, 'base', 'Removed diagram');
  block.el.replaceWith(el);
  block.el = el;
  return { el, versions };
}

/** Lock configuration to the reader and prevent diagrams from loading external assets. */
export function diagramCode(source: string): string {
  if (source.length > 20_000) throw new Error('This diagram is too large to render.');
  const code = source
    .replace(/^\s*---[^\S\n]*\n[\s\S]*?\n---[^\S\n]*(?:\n|$)/, '')
    .replace(/%%\{[\s\S]*?\}%%/g, '');
  for (const metadata of code.matchAll(/@\s*\{[^}]*\}/g)) {
    if (/\b(?:img|icon)\b|\\/i.test(metadata[0])) throw new Error('External images and icon packs are not supported.');
  }
  // Permit ordinary colours and line styles, but not CSS that can request resources.
  for (const command of code.split(/[\n;]/)) {
    if (/^\s*(?:classDef|style|linkStyle)\s/i.test(command) && /[\\{}@]|url\s*\(|(?:https?:)?\/\//i.test(command)) throw new Error('External diagram styles are not supported.');
  }
  return code;
}

/** SVG is displayed as an inert image, after independent SVG sanitisation. */
export function diagramImage(doc: Document, svg: string): string {
  const purifier = DOMPurify(doc.defaultView!);
  purifier.addHook('uponSanitizeAttribute', (_node, data) => {
    if (['href', 'xlink:href', 'src'].includes(data.attrName) && !data.attrValue.startsWith('#')) data.keepAttr = false;
  });
  const clean = purifier.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['image', 'foreignObject', 'a'], ALLOW_DATA_ATTR: false });
  // Styles are confined to the image. Only fragment references can survive in CSS.
  const local = clean.replace(/url\(\s*(['"]?)([^)]*?)\1\s*\)/gi, (_match, _quote, url: string) => /^#[\w-]+$/.test(url) ? `url(${url})` : 'none');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(local)}`;
}

/** Mermaid runs in its sandboxed frame (diagram-frame.ts); the first request also loads the engine. */
const engine = sandbox('diagram-frame.html', 20_000);
const MAX_SVG_CHARS = 2_000_000;
let queue: Promise<void> = Promise.resolve();
const rendered = new WeakMap<Diagram, { dark: boolean; token: number }>();

/** The reply is untrusted: it must be a bounded string, and diagramImage sanitises it. */
async function requestSvg(el: Element, code: string, dark: boolean): Promise<string> {
  const { svg } = await engine.request(hostFor(el), { code, dark });
  if (typeof svg !== 'string' || svg.length > MAX_SVG_CHARS) throw new Error('Mermaid could not render this diagram.');
  return svg;
}

/** Sequential jobs, so a result for an old theme or a closed document is never shown. */
export function renderDiagrams(diagrams: Diagram[], dark: boolean, changed: () => void): void {
  for (const diagram of diagrams) {
    const previous = rendered.get(diagram);
    if (previous?.dark === dark) continue;
    const state = { dark, token: (previous?.token ?? 0) + 1 };
    rendered.set(diagram, state);
    for (const version of diagram.versions) {
      queue = queue.then(async () => {
        if (rendered.get(diagram) !== state || !diagram.el.isConnected) return;
        const doc = diagram.el.ownerDocument;
        try {
          const svg = await requestSvg(diagram.el, diagramCode(version.source), dark);
          if (rendered.get(diagram) !== state || !diagram.el.isConnected) return;
          const image = doc.createElement('img');
          image.alt = `${version.side === 'base' ? 'Old' : 'New'} version of Mermaid diagram. View source below.`;
          image.src = diagramImage(doc, svg);
          version.view.replaceChildren(image);
          version.view.dataset.state = 'ready';
          image.addEventListener('load', changed, { once: true });
        } catch (err) {
          if (rendered.get(diagram) !== state || !diagram.el.isConnected) return;
          version.view.dataset.state = 'error';
          version.view.textContent = `${err instanceof Error && /not supported|too large/.test(err.message) ? err.message : 'Could not render this Mermaid diagram.'} The source is available below.`;
          version.sourceDetails.open = true;
        } finally { changed(); }
      }).catch(() => { /* Keep later diagrams usable if a document is closed during rendering. */ });
    }
  }
}
