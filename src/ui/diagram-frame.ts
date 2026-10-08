// Mermaid, inside the sandboxed diagram-frame.html (see sandbox.ts). Diagrams are laid out here and
// never in the review page, so a flaw in Mermaid cannot reach GitHub, GitLab, the reviewer's session
// or Galley's token. The reader treats every reply as untrusted SVG.
import mermaid from 'mermaid';
import { type DiagramPalette, isPalette } from './diagram-palette.ts';
import { listen, serve } from './sandbox-frame.ts';

export interface DiagramRequest {
  id: number;
  code: string;
  dark: boolean;
  palette?: DiagramPalette;
}
type Engine = Pick<typeof mermaid, 'initialize' | 'render'>;

/** The reader checks the source first; the frame repeats the size limit rather than trusting it. */
const MAX_SOURCE = 20_000;

export function isRequest(data: unknown): data is DiagramRequest {
  const request = data as Partial<DiagramRequest> | null;
  return typeof request?.id === 'number' && typeof request.code === 'string' && request.code.length <= MAX_SOURCE && typeof request.dark === 'boolean' && (request.palette === undefined || isPalette(request.palette));
}

const rgb = (hex: string) => hex.length === 4 ? [1, 2, 3].map((i) => parseInt(hex[i] + hex[i], 16)) : [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (channels: number[]) => `#${channels.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/** `a`, moved towards `b` by `t` (0–1). */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b);
  return toHex(x.map((v, i) => v * (1 - t) + y[i] * t));
}

/** Colours for charts: the accent's hue, turned around the colour wheel at an even, calm strength. */
export function chartColours(accent: string, dark: boolean, count = 12): string[] {
  const [r, g, b] = rgb(accent).map((v) => v / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const start = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const s = dark ? 0.42 : 0.38, l = dark ? 0.68 : 0.6;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  return Array.from({ length: count }, (_, i) => {
    const h = (start * 60 + i * 47) % 360 / 60, x = c * (1 - Math.abs(h % 2 - 1));
    const [R, G, B] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    return toHex([R, G, B].map((v) => (v + l - c / 2) * 255));
  });
}

/**
 * The page's figure style: shapes are cards on a soft canvas, lines are muted, labels are quiet, and
 * group titles are small capitals like the reader's own. Built only from validated hex colours.
 */
export function diagramTheme(p: DiagramPalette, dark: boolean): { themeVariables: Record<string, string | boolean>; themeCSS: string } {
  const canvas = p.code, card = dark ? p.soft : p.bg, ink = dark ? p.bg : '#ffffff';
  const line = mix(p.muted, p.bg, 0.15), border = mix(p.muted, p.bg, 0.55), note = mix(p.accent, p.bg, 0.86);
  const charts = chartColours(p.accent, dark);
  const themeVariables: Record<string, string | boolean> = {
    darkMode: dark, fontSize: '15px', background: canvas, textColor: p.fg, titleColor: p.fg, lineColor: line,
    primaryColor: card, primaryTextColor: p.fg, primaryBorderColor: border, secondaryColor: p.soft, secondaryTextColor: p.fg, secondaryBorderColor: border,
    tertiaryColor: canvas, tertiaryTextColor: p.fg, tertiaryBorderColor: border, mainBkg: card, nodeBorder: border, clusterBkg: canvas, clusterBorder: border, edgeLabelBackground: canvas,
    actorBkg: card, actorBorder: border, actorTextColor: p.fg, actorLineColor: p.rule, signalColor: line, signalTextColor: p.fg, labelBoxBkgColor: card, labelBoxBorderColor: border, labelTextColor: p.fg,
    loopTextColor: p.fg, noteBkgColor: note, noteTextColor: p.fg, noteBorderColor: note, activationBkgColor: p.soft, activationBorderColor: border, sequenceNumberColor: canvas,
    attributeBackgroundColorOdd: card, attributeBackgroundColorEven: canvas,
    sectionBkgColor: p.soft, sectionBkgColor2: p.soft, altSectionBkgColor: canvas, gridColor: p.rule, todayLineColor: p.accent,
    taskBkgColor: charts[0], taskBorderColor: charts[0], taskTextColor: ink, taskTextLightColor: p.fg, taskTextDarkColor: p.fg, taskTextOutsideColor: p.fg,
    activeTaskBkgColor: charts[1], activeTaskBorderColor: charts[1], doneTaskBkgColor: p.rule, doneTaskBorderColor: border, critBkgColor: charts[6], critBorderColor: charts[6],
    pieTitleTextColor: p.fg, pieSectionTextColor: ink, pieLegendTextColor: p.fg, pieStrokeColor: canvas, pieOuterStrokeColor: canvas,
  };
  charts.forEach((colour, i) => {
    themeVariables[`pie${i + 1}`] = colour;
    themeVariables[`cScale${i}`] = colour;
    themeVariables[`cScaleLabel${i}`] = ink;
    themeVariables[`cScalePeer${i}`] = mix(colour, p.fg, 0.2);
  });
  // Text over a line gets a halo of the canvas colour, so labels never collide with what they label.
  const halo = `paint-order: stroke; stroke: ${canvas}; stroke-width: 5px; stroke-linejoin: round;`;
  const themeCSS = `
    .node rect, .node polygon, .node circle, .node ellipse, .node path { fill: ${card}; stroke: ${border}; stroke-width: 1.25px; }
    .node rect { rx: 10px; ry: 10px; }
    .flowchart-link, .edgePaths .path, .transition, .relation { stroke: ${line}; stroke-width: 1.5px; }
    .marker, .arrowMarkerPath, [id$="barbEnd"] path, [id$="barbEnd-margin"] path { fill: ${line}; stroke: ${line}; }
    .edgeLabel rect, .edgeLabel .background, .labelBkg { opacity: 1; fill: ${canvas}; background-color: ${canvas}; }
    .edgeLabel text, .edgeLabel tspan { fill: ${p.muted}; font-size: 13px; }
    .cluster rect { fill: none; stroke: ${border}; stroke-width: 1px; stroke-dasharray: 4 4; rx: 14px; ry: 14px; }
    .cluster-label text, .cluster text { fill: ${p.muted}; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; ${halo} }
    rect.actor { fill: ${card}; stroke: ${border}; stroke-width: 1.25px; rx: 10px; ry: 10px; filter: none; }
    text.actor, text.actor > tspan { fill: ${p.fg}; font-weight: 600; }
    .actor-line { stroke: ${p.rule}; stroke-width: 1px; stroke-dasharray: 3 4; }
    .messageLine0, .messageLine1 { stroke: ${line}; stroke-width: 1.25px; }
    .messageText { fill: ${p.fg}; font-size: 14px; }
    .note { fill: ${note}; stroke: none; rx: 8px; ry: 8px; }
    .noteText, .noteText > tspan { fill: ${p.fg}; font-size: 13.5px; }
    .state-start { fill: ${p.fg}; stroke: ${p.fg}; }
    .classGroup rect, .classGroup line { fill: ${card}; stroke: ${border}; }
    .entityBox { fill: ${card}; stroke: ${border}; }
    .pieCircle { stroke: ${canvas}; stroke-width: 2px; opacity: 1; }
    .pieOuterCircle { stroke: none; }
    .pieTitleText { fill: ${p.fg}; font-size: 15px; font-weight: 600; }
    .legend text { fill: ${p.fg}; font-size: 13px; }
    .grid .tick line { stroke: ${p.rule}; }
    .tick text { fill: ${p.muted}; }
  `;
  return { themeVariables, themeCSS };
}

let serial = 0;

export async function renderRequest(engine: Engine, { code, dark, palette }: DiagramRequest): Promise<string> {
  const config = {
    startOnLoad: false, securityLevel: 'strict' as const, htmlLabels: false, look: 'classic' as const,
    theme: palette ? 'base' as const : dark ? 'dark' as const : 'default' as const,
    ...(palette ? diagramTheme(palette, dark) : {}),
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', suppressErrorRendering: true,
    maxTextSize: MAX_SOURCE, maxEdges: 300,
    flowchart: { htmlLabels: false, curve: 'rounded' as const, padding: 14, nodeSpacing: 44, rankSpacing: 52 },
    sequence: { mirrorActors: false, actorMargin: 64, boxMargin: 12, messageMargin: 36, noteMargin: 12, width: 130, height: 44 },
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
