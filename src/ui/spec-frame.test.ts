import { expect, it } from 'vitest';
import { isSpecRequest, parseSpecs, parseSymbols, serveSpecs } from './spec-frame.ts';

it('reads nested suites, test names and lifecycle hooks with exact source ranges', () => {
  const source = [
    'import { describe, it } from "vitest";',
    'describe("Uploads", () => {',
    '  beforeEach(() => reset());',
    '  afterEach(() => cleanup());',
    '  beforeAll(() => connect());',
    '  afterAll(() => disconnect());',
    '  context(`At capacity`, function () {',
    '    it("waits for room", async () => {',
    '      expect(await upload()).toBe(false);',
    '    });',
    '  });',
    '});',
  ].join('\n');
  expect(parseSpecs(source)).toEqual([
    { kind: 'suite', title: 'Uploads', start: 1, end: 11, depth: 0, flag: '' },
    { kind: 'setup', title: 'Before each test', start: 2, end: 2, depth: 1, flag: '' },
    { kind: 'setup', title: 'After each test', start: 3, end: 3, depth: 1, flag: '' },
    { kind: 'setup', title: 'Before the suite', start: 4, end: 4, depth: 1, flag: '' },
    { kind: 'setup', title: 'After the suite', start: 5, end: 5, depth: 1, flag: '' },
    { kind: 'suite', title: 'At capacity', start: 6, end: 10, depth: 1, flag: '' },
    { kind: 'case', title: 'waits for room', start: 7, end: 9, depth: 2, flag: '' },
  ]);
});

it('supports parameter tables, modifiers, Playwright suites and Mocha hooks without evaluating names', () => {
  const source = [
    'test.describe.parallel("Browser", () => {',
    '  test.beforeEach(() => start());',
    '  test.afterEach(() => stop());',
    '  test.only.each([[1], [2]])("accepts %i", () => {});',
    '  test.each`a | b\n  1 | 2`("adds $a", () => {});',
    '  test.skip("later", () => {});',
    '  test.todo("planned");',
    '  test.concurrent("together", () => {});',
    '});',
    'suite("Server", () => {',
    '  before(() => connect());',
    '  after(() => close());',
    '  specify(caseName, () => {});',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: The fixture must retain an unevaluated dynamic test name.
    '  it(`handles ${value}`, () => {});',
    '});',
    'Deno.test("native", () => {});',
    'test();',
    'describe("without a body");',
  ].join('\n');
  expect(parseSpecs(source)!.map(({ kind, title, flag }) => [kind, title, flag])).toEqual([
    ['suite', 'Browser', ''],
    ['setup', 'Before each test', ''],
    ['setup', 'After each test', ''],
    ['case', 'accepts %i', 'only · each'],
    ['case', 'adds $a', 'each'],
    ['case', 'later', 'skip'],
    ['case', 'planned', 'todo'],
    ['case', 'together', ''],
    ['suite', 'Server', ''],
    ['setup', 'Before the suite', ''],
    ['setup', 'After the suite', ''],
    ['case', 'caseName', ''],
    // biome-ignore lint/suspicious/noTemplateCurlyInString: The expected name is the literal source expression.
    ['case', '`handles ${value}`', ''],
    ['case', 'native', ''],
    ['case', 'Unnamed test', ''],
    ['suite', 'without a body', ''],
  ]);
});

it('ignores strings, comments, helpers and calls inside test bodies instead of inventing behavior', () => {
  const source = [
    '// it("fake comment", () => {});',
    'const text = "test(\\"fake string\\", () => {})";',
    'const helper = () => it("helper", () => {});',
    'beforeEach(() => test("in setup", () => {}));',
    'it("real", () => { test("inside a test", () => {}); });',
    'it.unknown("unsupported", () => {});',
    'it["skip"]("computed", () => {});',
    '(() => {})();',
    'other("not a test");',
    'toString("not a hook");',
    'const assigned = test("not standalone", () => {});',
  ].join('\n');
  expect(parseSpecs(source)!.map((definition) => definition.title)).toEqual(['Before each test', 'real']);
  expect((globalThis as Record<string, unknown>).executed).toBeUndefined();
  expect(parseSpecs('globalThis.executed = true; test("never executed", () => {});')![0].title).toBe('never executed');
  expect((globalThis as Record<string, unknown>).executed).toBeUndefined();
});

it('finds declarations in conditional and looped blocks, retaining dynamic names as source', () => {
  const source = [
    'if (enabled) test("enabled", () => {}); else test("disabled", () => {});',
    'if (extra) { it("extra", () => {}); }',
    'for (const item of items) { it(item.name, () => {}); }',
    'for (const name in names) test(name, () => {});',
    'for (let i = 0; i < 2; i++) test("loop", () => {});',
    'describe("expression body", () => it("not a statement", () => {}));',
  ].join('\n');
  expect(parseSpecs(source)!.map((definition) => definition.title)).toEqual(['enabled', 'disabled', 'extra', 'item.name', 'name', 'loop', 'expression body']);
});

it('parses TypeScript and JSX when appropriate, and declines invalid or excessive input', () => {
  expect(parseSpecs('const value: number = 1; it("typed", () => {});')![0].title).toBe('typed');
  const jsx = 'it("component", () => { render(<Button />); });';
  expect(parseSpecs(jsx)).toBeNull();
  expect(parseSpecs(jsx, true)![0].title).toBe('component');
  expect(parseSpecs('it("unfinished", () => {')).toBeNull();
  expect(parseSpecs('x'.repeat(200_001))).toBeNull();
  expect(parseSpecs('it("case", () => {});\n'.repeat(501))).toBeNull();
  expect(parseSpecs('')).toEqual([]);
});

it('validates the frame request and returns structures for both versions over a port', async () => {
  const request = { id: 1, base: 'it("old", () => {});', head: 'it("new", () => {});', jsx: false };
  expect(isSpecRequest(request)).toBe(true);
  for (const invalid of [
    null,
    {},
    { ...request, id: '1' },
    { ...request, base: 1 },
    { ...request, head: null },
    { ...request, jsx: null },
    { ...request, symbols: 'yes' },
    { ...request, base: 'x'.repeat(200_001) },
    { ...request, head: 'x'.repeat(200_001) },
  ])
    expect(isSpecRequest(invalid)).toBe(false);
  const channel = new MessageChannel();
  serveSpecs(channel.port2);
  const reply = new Promise<MessageEvent['data']>((resolve) => {
    channel.port1.onmessage = ({ data }) => resolve(data);
  });
  channel.port1.postMessage(request);
  expect(await reply).toMatchObject({ id: 1, base: [{ title: 'old' }], head: [{ title: 'new' }] });
  const declarations = new Promise<MessageEvent['data']>((resolve) => {
    channel.port1.onmessage = ({ data }) => resolve(data);
  });
  channel.port1.postMessage({ id: 2, base: 'function old() {}', head: 'function next() {}', jsx: false, symbols: true });
  expect(await declarations).toMatchObject({ id: 2, base: [{ kind: 'function', name: 'old' }], head: [{ kind: 'function', name: 'next' }] });
  channel.port1.close();
  channel.port2.close();
});

it('names the declarations of a source file, with their doc comments, methods and overloads', () => {
  const source = [
    "import { a } from 'a';",
    '/** Limits each client. */',
    'export function limit(client: string): number;',
    'export function limit(client: string, extra?: number) {',
    '  return 1;',
    '}',
    'export default class Limiter {',
    '  #count = 0;',
    '  request(id: string) {',
    '    return id;',
    '  }',
    '  #reset() {}',
    "  'quoted'() {}",
    '  handle = () => this.#reset();',
    '  [computed]() {}',
    '  static {',
    '    init();',
    '  }',
    '}',
    'export const Card = memo(() => null), helper = function () {}, plain = 1;',
    'const Model = class {}, unused = 2;',
    'interface Options {',
    '  perMinute: number;',
    '}',
    'export type Id = string;',
    'enum Mode { On, Off }',
    'export { a };',
    'export default function () {}',
  ].join('\n');
  expect(parseSymbols(source)).toEqual([
    { kind: 'function', name: 'limit', start: 1, end: 5, parent: '' },
    { kind: 'class', name: 'Limiter', start: 6, end: 18, parent: '' },
    { kind: 'method', name: 'request', start: 8, end: 10, parent: 'Limiter' },
    { kind: 'method', name: '#reset', start: 11, end: 11, parent: 'Limiter' },
    { kind: 'method', name: 'quoted', start: 12, end: 12, parent: 'Limiter' },
    { kind: 'method', name: 'handle', start: 13, end: 13, parent: 'Limiter' },
    { kind: 'method', name: '[computed]', start: 14, end: 14, parent: 'Limiter' },
    { kind: 'function', name: 'Card', start: 19, end: 19, parent: '' },
    { kind: 'function', name: 'helper', start: 19, end: 19, parent: '' },
    { kind: 'class', name: 'Model', start: 20, end: 20, parent: '' },
    { kind: 'interface', name: 'Options', start: 21, end: 23, parent: '' },
    { kind: 'type', name: 'Id', start: 24, end: 24, parent: '' },
    { kind: 'enum', name: 'Mode', start: 25, end: 25, parent: '' },
    { kind: 'function', name: 'default', start: 27, end: 27, parent: '' },
  ]);
  expect(parseSymbols('export default class { 1() {} }\nconst [a] = [() => 1];\nlet b;\nconst Solo = class {};')).toEqual([
    { kind: 'class', name: 'default', start: 0, end: 0, parent: '' },
    { kind: 'class', name: 'Solo', start: 3, end: 3, parent: '' },
  ]);
  expect(parseSymbols('const view = () => <div />;', true)).toEqual([{ kind: 'function', name: 'view', start: 0, end: 0, parent: '' }]);
  expect(parseSymbols('function (')).toBeNull();
  expect(parseSymbols('x'.repeat(200_001))).toBeNull();
  expect(parseSymbols('function f() {}\nfunction g() {}\n'.repeat(501))).toBeNull();
});
