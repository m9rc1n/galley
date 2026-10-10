import type { ConfigFormat } from '../core/discovery.ts';
import type { ConfigReading, DeclaredItem, DeclaredLink } from '../core/architecture.ts';
import { sandbox } from './sandbox.ts';

/** One frame reads every configuration file, one at a time; a file that stops it is discarded after five seconds. */
export const configParser = sandbox('config-frame.html', 5_000);

const KINDS = new Set(['service', 'workflow', 'job', 'stage', 'environment', 'workload', 'resource', 'module']);
const LABELS = new Set(['depends on', 'needs', 'deploys to', 'in stage', 'runs']);
const MAX_ITEMS = 400;

const short = (value: unknown, most: number): value is string => typeof value === 'string' && value.length <= most;
const lineIn = (value: unknown, lines: number) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= lines;

/** Frame replies supply structure only: names, kinds, keys and lines that fit the file. Anything else is refused. */
export function isReading(value: unknown, lines: number): value is ConfigReading {
  const reading = value as Partial<ConfigReading> | null;
  const items = reading?.items;
  const links = reading?.links;
  const notes = reading?.notes;
  return (
    Array.isArray(items) &&
    Array.isArray(links) &&
    Array.isArray(notes) &&
    items.length + links.length <= MAX_ITEMS &&
    notes.length <= 10 &&
    notes.every((note) => short(note, 200)) &&
    items.every(
      (item: Partial<DeclaredItem> | null) =>
        short(item?.key, 600) && short(item.name, 300) && KINDS.has(item.kind!) && lineIn(item.line, lines) && short(item.detail, 300),
    ) &&
    links.every((link: Partial<DeclaredLink> | null) => short(link?.from, 600) && short(link.to, 600) && LABELS.has(link.label!) && lineIn(link.line, lines))
  );
}

/** What a configuration file declares, read in the frame; null when the frame could not read it. */
export async function readConfiguration(host: ParentNode, path: string, format: ConfigFormat, text: string): Promise<ConfigReading | null> {
  try {
    const reply = await configParser.request(host, { path, format, text });
    return isReading(reply.reading, text.split('\n').length) ? reply.reading : null;
  } catch {
    return null;
  }
}
