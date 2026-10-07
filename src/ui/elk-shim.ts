// Stands in for elkjs in the production diagram bundle (see scripts/build.mjs). elkjs is 1.4 MB, and with
// Mermaid in the same file the bundle would pass the 5 MB that addons.mozilla.org scans. So it ships as
// elk.js, next to diagram-frame.js, and is loaded the first time Mermaid lays a diagram out. The script
// runs in the same sandboxed frame, under the same CSP as diagram-frame.js.
interface Engine {
  layout(graph: unknown, options?: unknown): Promise<unknown>;
}
type Constructor = new (options?: unknown) => Engine;

let loading: Promise<Constructor> | undefined;

function load(): Promise<Constructor> {
  loading ??= new Promise<Constructor>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'elk.js';
    script.onload = () => {
      const defined = (globalThis as { __galleyELK?: Constructor & { default?: Constructor } }).__galleyELK;
      const elk = defined?.default ?? defined;
      if (elk) resolve(elk);
      else reject(new Error('elk.js did not define the layout engine'));
    };
    script.onerror = () => reject(new Error('elk.js did not load'));
    document.head.append(script);
  });
  // A failure is not remembered: the next diagram tries again.
  loading.catch(() => {
    loading = undefined;
  });
  return loading;
}

export default class ELK {
  private readonly options: unknown;
  private engine?: Promise<Engine>;

  constructor(options?: unknown) {
    this.options = options;
  }

  layout(graph: unknown, options?: unknown): Promise<unknown> {
    this.engine ??= load().then((Elk) => new Elk(this.options));
    return this.engine.then(
      (loaded) => loaded.layout(graph, options),
      (error) => {
        this.engine = undefined;
        throw error;
      },
    );
  }
}
