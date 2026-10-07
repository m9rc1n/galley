import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Shim = typeof import('./elk-shim.ts');

/** The shim keeps the loading state in the module, so every test starts from a fresh copy. */
async function freshShim(): Promise<Shim> {
  vi.resetModules();
  return import('./elk-shim.ts');
}

function appended(): HTMLScriptElement[] {
  return vi.mocked(document.head.append).mock.calls.flat() as HTMLScriptElement[];
}

/** Stands in for the browser loading the script: no network in unit tests. */
const finish = (script: HTMLScriptElement, outcome: 'load' | 'error') => script.dispatchEvent(new Event(outcome));

describe('the ELK stand-in for the diagram bundle', () => {
  beforeEach(() => {
    vi.spyOn(document.head, 'append').mockImplementation(() => {});
  });
  afterEach(() => {
    delete (globalThis as { __galleyELK?: unknown }).__galleyELK;
  });

  it('loads elk.js once, however many layouts are asked for, and lays out with the engine it defines', async () => {
    const created: unknown[] = [];
    class Engine {
      constructor(readonly options: unknown) {
        created.push(options);
      }
      async layout(graph: object, options: unknown) {
        return { ...graph, laidOutWith: options };
      }
    }
    (globalThis as { __galleyELK?: unknown }).__galleyELK = Engine;
    const { default: ELK } = await freshShim();
    const elk = new ELK({ defaultLayoutOptions: { direction: 'DOWN' } });

    const first = elk.layout({ id: 'a' }, { x: 1 });
    const second = elk.layout({ id: 'b' });
    expect(appended()).toHaveLength(1);
    expect(appended()[0].getAttribute('src')).toBe('elk.js');
    finish(appended()[0], 'load');

    expect(await first).toEqual({ id: 'a', laidOutWith: { x: 1 } });
    expect(await second).toEqual({ id: 'b', laidOutWith: undefined });
    expect(created).toEqual([{ defaultLayoutOptions: { direction: 'DOWN' } }]);
    await elk.layout({ id: 'c' });
    expect(appended()).toHaveLength(1);
  });

  it('accepts an engine exported as default, the way the bundle wraps a CommonJS module', async () => {
    class Engine {
      async layout() {
        return 'laid out';
      }
    }
    (globalThis as { __galleyELK?: unknown }).__galleyELK = { default: Engine };
    const { default: ELK } = await freshShim();
    const result = new ELK().layout({});
    finish(appended()[0], 'load');
    expect(await result).toBe('laid out');
  });

  it('fails a diagram when elk.js does not load, and tries again for the next one', async () => {
    const { default: ELK } = await freshShim();
    const elk = new ELK();

    const failed = elk.layout({});
    finish(appended()[0], 'error');
    await expect(failed).rejects.toThrow('did not load');

    class Engine {
      async layout() {
        return 'laid out';
      }
    }
    (globalThis as { __galleyELK?: unknown }).__galleyELK = Engine;
    const retried = elk.layout({});
    expect(appended()).toHaveLength(2);
    finish(appended()[1], 'load');
    expect(await retried).toBe('laid out');
  });

  it('fails a diagram when elk.js loads but defines nothing', async () => {
    const { default: ELK } = await freshShim();
    const result = new ELK().layout({});
    finish(appended()[0], 'load');
    await expect(result).rejects.toThrow('did not define');
  });
});
