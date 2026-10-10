// Configuration is read in an isolated frame: the YAML parser never runs in the page, nothing in a file
// is executed or followed, and an expensive file cannot block the reader (ADR 0011). The frame says what
// a file declares, with the line it says it on; the reader validates every reply (configs.ts).
import { isMap, isScalar, isSeq, LineCounter, parseAllDocuments, type Node, type Pair } from 'yaml';
import { MAX_CONFIG_CHARS, type ConfigReading, type DeclaredItem, type DeclaredKind, type DeclaredLabel, type DeclaredLink } from '../core/architecture.ts';
import type { ConfigFormat } from '../core/discovery.ts';
import { listen, serve } from './sandbox-frame.ts';

export const MAX_DECLARED = 400;
export const FORMATS: ConfigFormat[] = ['compose', 'workflow', 'gitlab-ci', 'kubernetes', 'terraform'];

/** GitLab CI keys that configure the pipeline rather than name a job. */
const GITLAB_KEYWORDS = new Set(['stages', 'variables', 'default', 'include', 'workflow', 'image', 'services', 'before_script', 'after_script', 'cache']);

class Reader {
  readonly items: DeclaredItem[] = [];
  readonly links: DeclaredLink[] = [];
  readonly notes: string[] = [];
  private readonly seen = new Set<string>();
  private readonly lines: LineCounter;
  // Plain fields rather than parameter properties, so Node can load this file as it is (scripts/repo-report.mjs).
  constructor(lines: LineCounter) {
    this.lines = lines;
  }

  /** Every node read from the file carries its source range. */
  line(node: Node): number {
    return this.lines.linePos(node.range![0]).line;
  }

  item(key: string, name: string, kind: DeclaredKind, line: number, detail = ''): void {
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (this.items.length + this.links.length >= MAX_DECLARED) throw new RangeError('too many declarations');
    this.items.push({ key, name, kind, line, detail });
  }

  link(from: string, to: string, label: DeclaredLabel, line: number): void {
    if (this.items.length + this.links.length >= MAX_DECLARED) throw new RangeError('too many declarations');
    this.links.push({ from, to, label, line });
  }
}

const text = (node: unknown): string | null => (isScalar(node) && node.value !== null && typeof node.value !== 'object' ? String(node.value) : null);

function get(node: unknown, key: string): unknown {
  return isMap(node) ? node.get(key, true) : undefined;
}

function pairs(node: unknown): Array<Pair<unknown, unknown>> {
  return isMap(node) ? (node.items as Array<Pair<unknown, unknown>>) : [];
}

/** A scalar, or a list of scalars (or of maps with `field`), as names: `needs: build` and `needs: [build, test]`. */
function names(node: unknown, field?: string): Array<{ name: string; node: Node }> {
  const one = (value: unknown) => {
    const name = text(value) ?? (field ? text(get(value, field)) : null);
    return name === null ? [] : [{ name, node: value as Node }];
  };
  return isSeq(node) ? node.items.flatMap(one) : one(node);
}

/** An environment written as a name or as a map with a name. */
function environment(read: Reader, node: unknown, from: string, line: number): void {
  const name = text(node) ?? text(get(node, 'name'));
  if (name === null) return;
  read.item(`environment:${name}`, name, 'environment', read.line(node as Node));
  read.link(from, `environment:${name}`, 'deploys to', line);
}

function compose(read: Reader, root: unknown): void {
  const services = get(root, 'services');
  if (!isMap(services)) {
    read.notes.push('No services are declared.');
    return;
  }
  for (const { key, value } of pairs(services)) {
    const name = text(key);
    if (name === null) continue;
    const line = read.line(key as Node);
    const image = text(get(value, 'image'));
    read.item(`service:${name}`, name, 'service', line, image ? `image ${image}` : get(value, 'build') ? 'built from the repository' : '');
    const dependsOn = get(value, 'depends_on');
    const targets = isMap(dependsOn) ? pairs(dependsOn).map((pair) => ({ name: text(pair.key), node: pair.key as Node })) : names(dependsOn);
    for (const target of targets) if (target.name !== null) read.link(`service:${name}`, `service:${target.name}`, 'depends on', read.line(target.node));
  }
}

function workflow(read: Reader, root: unknown, path: string): void {
  const file = path.slice(path.lastIndexOf('/') + 1);
  const title = text(get(root, 'name')) ?? file;
  const self = `workflow:${path}`;
  read.item(self, title, 'workflow', 1, file);
  const jobs = get(root, 'jobs');
  for (const { key, value } of pairs(jobs)) {
    const id = text(key);
    if (id === null) continue;
    const job = `job:${path}:${id}`;
    const line = read.line(key as Node);
    read.item(job, id, 'job', line, text(get(value, 'name')) ?? '');
    read.link(self, job, 'runs', line);
    for (const need of names(get(value, 'needs'))) read.link(job, `job:${path}:${need.name}`, 'needs', read.line(need.node));
    environment(read, get(value, 'environment'), job, line);
  }
  if (!isMap(jobs)) read.notes.push('No jobs are declared.');
}

function gitlabCi(read: Reader, root: unknown, path: string): void {
  if (get(root, 'include') !== undefined) read.notes.push('Included files are not read.');
  for (const { key, value } of pairs(root)) {
    const id = text(key);
    if (id === null || GITLAB_KEYWORDS.has(id) || id.startsWith('.') || !isMap(value)) continue;
    const job = `job:${path}:${id}`;
    const line = read.line(key as Node);
    const stage = text(get(value, 'stage'));
    read.item(job, id, 'job', line, stage ? `stage ${stage}` : '');
    if (stage) {
      read.item(`stage:${stage}`, stage, 'stage', read.line(get(value, 'stage') as Node));
      read.link(job, `stage:${stage}`, 'in stage', line);
    }
    for (const need of names(get(value, 'needs'), 'job')) read.link(job, `job:${path}:${need.name}`, 'needs', read.line(need.node));
    environment(read, get(value, 'environment'), job, line);
  }
}

function kubernetes(read: Reader, root: unknown): void {
  const kind = text(get(root, 'kind'));
  const metadata = get(root, 'metadata');
  const name = text(get(metadata, 'name'));
  if (!kind || !name || !text(get(root, 'apiVersion'))) return;
  const namespace = text(get(metadata, 'namespace'));
  read.item(`workload:${namespace ?? 'default'}/${kind}/${name}`, name, 'workload', read.line(root as Node), `${kind}${namespace ? ` in ${namespace}` : ''}`);
}

/** Terraform blocks by their header line; expressions and references between them are not read. */
function terraform(read: Reader, source: string, path: string): void {
  const folder = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
  source.split('\n').forEach((line, i) => {
    const resource = /^\s*resource\s+"([\w-]+)"\s+"([\w-]+)"/.exec(line);
    if (resource) read.item(`resource:${folder}/${resource[1]}.${resource[2]}`, `${resource[1]}.${resource[2]}`, 'resource', i + 1, resource[1]);
    const module = /^\s*module\s+"([\w-]+)"/.exec(line);
    if (module) read.item(`module:${folder}/${module[1]}`, module[1], 'module', i + 1);
  });
  read.notes.push('References between Terraform resources are not read.');
}

/** What one configuration file declares. Malformed files say so instead of being guessed at. */
export function readConfig(path: string, format: ConfigFormat, source: string): ConfigReading {
  const lines = new LineCounter();
  const read = new Reader(lines);
  try {
    if (format === 'terraform') terraform(read, source, path);
    else {
      // The syntax tree is walked as written: aliases stay aliases and are never expanded or followed.
      const usable = parseAllDocuments(source, { lineCounter: lines, prettyErrors: false, uniqueKeys: false }).filter((doc) => !doc.errors.length);
      if (!usable.length) return { items: [], links: [], notes: ['This file could not be read as YAML.'] };
      for (const doc of usable) {
        const root = doc.contents;
        if (format === 'compose') compose(read, root);
        else if (format === 'workflow') workflow(read, root, path);
        else if (format === 'gitlab-ci') gitlabCi(read, root, path);
        else kubernetes(read, root);
      }
      if (format === 'kubernetes' && !read.items.length) read.notes.push('No Kubernetes objects are declared.');
    }
  } catch {
    read.notes.push(`Only the first ${MAX_DECLARED} declarations are read.`);
  }
  return { items: read.items, links: read.links, notes: read.notes };
}

interface ConfigRequest {
  id: number;
  path: string;
  format: ConfigFormat;
  text: string;
}

export function isConfigRequest(data: unknown): data is ConfigRequest {
  const request = data as Partial<ConfigRequest> | null;
  return (
    typeof request?.id === 'number' &&
    typeof request.path === 'string' &&
    request.path.length <= 1_000 &&
    FORMATS.includes(request.format as ConfigFormat) &&
    typeof request.text === 'string' &&
    request.text.length <= MAX_CONFIG_CHARS
  );
}

export function serveConfigs(port: MessagePort): void {
  serve(port, isConfigRequest, async ({ path, format, text }) => ({ reading: readConfig(path, format, text) }));
}

listen(serveConfigs);
