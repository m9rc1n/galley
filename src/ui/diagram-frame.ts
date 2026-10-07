// Mermaid, inside the sandboxed diagram-frame.html (see sandbox.ts). Diagrams are laid out here and
// never in the review page, so a flaw in Mermaid cannot reach GitHub, GitLab, the reviewer's session
// or Galley's token. The reader treats every reply as untrusted SVG.
import mermaid from 'mermaid';
import { listen, serve } from './sandbox-frame.ts';

export interface DiagramRequest {
  id: number;
  code: string;
  dark: boolean;
}
type Engine = Pick<typeof mermaid, 'initialize' | 'render'>;

/** The reader checks the source first; the frame repeats the size limit rather than trusting it. */
const MAX_SOURCE = 20_000;

export function isRequest(data: unknown): data is DiagramRequest {
  const request = data as Partial<DiagramRequest> | null;
  return typeof request?.id === 'number' && typeof request.code === 'string' && request.code.length <= MAX_SOURCE && typeof request.dark === 'boolean';
}

let serial = 0;

export async function renderRequest(engine: Engine, { code, dark }: DiagramRequest): Promise<string> {
  const config = {
    startOnLoad: false, securityLevel: 'strict' as const, htmlLabels: false,
    theme: dark ? 'dark' as const : 'default' as const,
    fontFamily: 'system-ui, sans-serif', suppressErrorRendering: true,
    maxTextSize: MAX_SOURCE, maxEdges: 300, flowchart: { htmlLabels: false },
  };
  // Diagrams cannot override any of these with directives or front matter. Requests are handled one
  // at a time, so Mermaid's global configuration cannot leak between themes.
  engine.initialize({ ...config, secure: ['secure', ...Object.keys(config), 'themeCSS', 'themeVariables', 'fontURL', 'layout', 'look', 'dompurifyConfig'] });
  const { svg } = await engine.render(`galley-diagram-${++serial}`, code);
  return svg;
}

export function serveDiagrams(port: MessagePort, engine: Engine = mermaid): void {
  serve(port, isRequest, async (request) => ({ svg: await renderRequest(engine, request) }));
}

listen((port) => serveDiagrams(port));
