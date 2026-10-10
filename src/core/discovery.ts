import { isMarkdownPath } from './paths.ts';

/** A file or folder from a platform's tree listing. */
export interface TreeEntry {
  path: string;
  type: string;
  /** GitHub's id for a folder, used to list it on its own. */
  sha?: string;
  size?: number;
}

/** A Markdown document found in a repository listing. */
export interface RepoDoc {
  path: string;
  /** Bytes, when the listing says; oversized documents are left out of the map without reading them. */
  size?: number;
}

export interface RepoDiscovery {
  /** By path, so revisiting a repository shows the same order. */
  docs: RepoDoc[];
  /** What the listing could not cover, in plain words. Empty when the whole repository was listed. */
  limits: string[];
  /** Configuration files the infrastructure view can read statically, when asked; and what it cannot cover. */
  configs: { files: RepoDoc[]; limits: string[] };
}

/** Configuration formats read statically for the infrastructure view (config-frame.ts). */
export type ConfigFormat = 'compose' | 'workflow' | 'gitlab-ci' | 'kubernetes' | 'terraform';

/** Most configuration files listed for one repository. */
export const MAX_CONFIGS = 60;
/** Folders listed one by one for configuration when the whole tree was too large. */
export const CONFIG_ROOTS = ['.github', 'k8s', 'kubernetes', 'deploy', 'deployments', 'infra', 'infrastructure', 'terraform', 'manifests'];
const MAX_CONFIG_ROOTS = 4;

/** The configuration format a path holds, by name and folder alone; the frame confirms it by reading. */
export function configFormat(path: string): ConfigFormat | null {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (/^(?:docker-)?compose(?:\.[\w-]+)?\.ya?ml$/i.test(name)) return 'compose';
  if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)) return 'workflow';
  if (path === '.gitlab-ci.yml') return 'gitlab-ci';
  if (/\.tf$/i.test(name)) return 'terraform';
  // Helm chart templates are not YAML until rendered; they are left out rather than misread.
  if (/\.ya?ml$/i.test(name) && /(?:^|\/)(?:k8s|kubernetes|manifests|deploy|deployments?)\//i.test(path) && !/(?:^|\/)templates\//.test(path))
    return 'kubernetes';
  return null;
}

/**
 * Folders where projects tend to keep specs, decisions and guides. They are listed first when a
 * repository is too large to list in full. A hint, not a convention: Markdown anywhere is found.
 */
export const DOC_ROOTS = [
  'docs',
  'doc',
  'documentation',
  'specs',
  'spec',
  'adr',
  'adrs',
  'decisions',
  'rfcs',
  'rfc',
  'design',
  'architecture',
  'runbooks',
  'handbook',
  'guides',
];
/** Most documents listed for one repository; beyond this the list says how many were left out. */
export const MAX_DOCS = 2_000;
/** Most documentation folders listed one by one when the whole tree was too large. */
export const MAX_DOC_ROOTS = 6;

/** Dependencies and their READMEs, copied into a repository: listed last, and first to be left out. */
const VENDORED = /(?:^|\/)(?:node_modules|vendor|third[_-]party|bower_components)\//i;

function roots(root: TreeEntry[], names: string[], most: number): TreeEntry[] {
  const folders = root.filter((entry) => entry.type === 'tree' && !entry.path.includes('/'));
  return names.flatMap((name) => folders.filter((entry) => entry.path.toLowerCase() === name)).slice(0, most);
}

/** Top-level documentation folders, in DOC_ROOTS order, at most MAX_DOC_ROOTS. */
export function docRoots(root: TreeEntry[]): TreeEntry[] {
  return roots(root, DOC_ROOTS, MAX_DOC_ROOTS);
}

/** Top-level folders that usually hold configuration, in CONFIG_ROOTS order, at most four. */
export function configRoots(root: TreeEntry[]): TreeEntry[] {
  return roots(root, CONFIG_ROOTS, MAX_CONFIG_ROOTS);
}

function rank(path: string): number {
  if (VENDORED.test(path)) return 3;
  if (!path.includes('/')) return 0;
  return DOC_ROOTS.includes(path.slice(0, path.indexOf('/')).toLowerCase()) ? 1 : 2;
}

const byPath = (a: RepoDoc, b: RepoDoc) => (a.path < b.path ? -1 : 1);

/**
 * The Markdown documents and configuration files in a listing. Past MAX_DOCS, documentation folders are
 * kept before the rest; past MAX_CONFIGS, configuration files are kept by path.
 */
export function collectDocs(entries: TreeEntry[], limits: string[], configLimits: string[] = []): RepoDiscovery {
  const found = new Map<string, RepoDoc>();
  const configs = new Map<string, RepoDoc>();
  for (const entry of entries) {
    if (entry.type !== 'blob') continue;
    const into = isMarkdownPath(entry.path) ? found : configFormat(entry.path) ? configs : null;
    if (!into || into.has(entry.path)) continue;
    into.set(entry.path, entry.size === undefined ? { path: entry.path } : { path: entry.path, size: entry.size });
  }
  let files = [...configs.values()].sort(byPath);
  if (files.length > MAX_CONFIGS) {
    configLimits.push(`Reading the first ${MAX_CONFIGS} of ${files.length.toLocaleString('en')} configuration files, by path.`);
    files = files.slice(0, MAX_CONFIGS);
  }
  let docs = [...found.values()];
  if (docs.length > MAX_DOCS) {
    limits.push(`Listing the first ${MAX_DOCS.toLocaleString('en')} of ${docs.length.toLocaleString('en')} Markdown files, documentation folders first.`);
    docs = docs.sort((a, b) => rank(a.path) - rank(b.path) || byPath(a, b)).slice(0, MAX_DOCS);
  }
  return { docs: docs.sort(byPath), limits, configs: { files, limits: configLimits } };
}
