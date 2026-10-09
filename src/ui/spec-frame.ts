// Test declarations, and the declarations of other JavaScript and TypeScript files, are parsed in an
// isolated frame. Source is never executed, and an expensive parse cannot block the reader. The reader
// keeps every original source line and comment target.
import { parse } from '@babel/parser';
import type { Node, CallExpression, Expression, Statement } from '@babel/types';
import { listen, serve } from './sandbox-frame.ts';

export interface SpecDefinition {
  kind: 'suite' | 'case' | 'setup';
  title: string;
  start: number;
  end: number;
  depth: number;
  flag: string;
}

/** A declaration a reviewer would name: a function, a class and its methods, or a type. */
export interface SymbolDefinition {
  kind: 'function' | 'class' | 'method' | 'interface' | 'type' | 'enum';
  name: string;
  /** Zero-based lines, from a leading doc comment to the end of the declaration. */
  start: number;
  end: number;
  /** The class a method belongs to; empty at the top level. */
  parent: string;
}

const MAX_SOURCE = 200_000;
const MAX_SYMBOLS = 1_000;
const HOOKS: Record<string, string> = {
  beforeEach: 'Before each test',
  afterEach: 'After each test',
  beforeAll: 'Before the suite',
  afterAll: 'After the suite',
  before: 'Before the suite',
  after: 'After the suite',
};
const MODIFIERS = new Set(['only', 'skip', 'todo', 'concurrent', 'sequential', 'fails', 'failing', 'each', 'parallel', 'serial']);

/** Unwrap modifiers and parameter tables without evaluating arguments. */
function callName(node: Node): string[] {
  if (node.type === 'Identifier') return [node.name];
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') return [...callName(node.object), node.property.name];
  if (node.type === 'CallExpression') return callName(node.callee);
  if (node.type === 'TaggedTemplateExpression') return callName(node.tag);
  return [];
}

function declaration(node: CallExpression, text: string, depth: number): SpecDefinition | null {
  const parts = callName(node.callee);
  if (parts[0] === 'Deno') parts.shift();
  let kind: SpecDefinition['kind'];
  if (parts[0] === 'test' && Object.hasOwn(HOOKS, parts[1])) parts.shift();
  const root = parts.shift()!;
  if (root === 'test' && parts[0] === 'describe') {
    parts.shift();
    kind = 'suite';
  } else if (['describe', 'context', 'suite'].includes(root)) kind = 'suite';
  else if (['it', 'test', 'specify'].includes(root)) kind = 'case';
  else if (Object.hasOwn(HOOKS, root)) kind = 'setup';
  else return null;
  if (parts.some((part) => !MODIFIERS.has(part))) return null;
  const title = node.arguments[0];
  const name =
    kind === 'setup'
      ? HOOKS[root]
      : title?.type === 'StringLiteral'
        ? title.value
        : title?.type === 'TemplateLiteral' && !title.expressions.length
          ? title.quasis[0].value.cooked!
          : title
            ? text.slice(title.start!, title.end!)
            : 'Unnamed test';
  return {
    kind,
    title: name,
    start: node.loc!.start.line - 1,
    end: node.loc!.end.line - 1,
    depth,
    flag: parts.filter((part) => ['skip', 'only', 'todo', 'each'].includes(part)).join(' · '),
  };
}

/** Only standalone declarations, including conditional/looped declarations, become headings.
 * Calls in strings, comments, expressions or test bodies cannot manufacture test cases. */
export function parseSpecs(text: string, jsx = false): SpecDefinition[] | null {
  if (text.length > MAX_SOURCE) return null;
  try {
    const tree = parse(text, { sourceType: 'unambiguous', plugins: jsx ? ['typescript', 'jsx'] : ['typescript'], attachComment: false });
    const definitions: SpecDefinition[] = [];
    const pending: Array<{ node: Node; depth: number }> = tree.program.body.map((node) => ({ node, depth: 0 })).reverse();
    while (pending.length) {
      const { node, depth } = pending.pop()!;
      if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
        const call = node.expression;
        const definition = declaration(call, text, depth);
        if (definition) {
          definitions.push(definition);
          if (definitions.length > 500) return null;
          // A suite can contain suites, cases and hooks. Test and hook bodies stay source code.
          const callback = call.arguments.at(-1);
          if (definition.kind === 'suite' && (callback?.type === 'ArrowFunctionExpression' || callback?.type === 'FunctionExpression'))
            pending.push({ node: callback.body, depth: depth + 1 });
        }
        continue;
      }
      const children: Array<Statement | Expression> =
        node.type === 'BlockStatement'
          ? node.body
          : node.type === 'IfStatement'
            ? [node.consequent, ...(node.alternate ? [node.alternate] : [])]
            : node.type === 'ForOfStatement' || node.type === 'ForInStatement' || node.type === 'ForStatement'
              ? [node.body]
              : [];
      for (const child of children.reverse()) pending.push({ node: child, depth });
    }
    return definitions;
  } catch {
    return null;
  }
}

const isFunction = (node: Node | null | undefined) => node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';

function keyName(key: Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'PrivateName') return `#${key.id.name}`;
  if (key.type === 'StringLiteral') return key.value;
  return null;
}

/** Top-level declarations and class members, by line. Bodies are not searched: their changes belong to them. */
export function parseSymbols(text: string, jsx = false): SymbolDefinition[] | null {
  if (text.length > MAX_SOURCE) return null;
  try {
    const tree = parse(text, { sourceType: 'unambiguous', plugins: jsx ? ['typescript', 'jsx'] : ['typescript'] });
    const symbols: SymbolDefinition[] = [];
    const lines = (node: Node) => ({
      start: Math.min(node.loc!.start.line, ...(node.leadingComments ?? []).map((comment) => comment.loc!.start.line)) - 1,
      end: node.loc!.end.line - 1,
    });
    const add = (kind: SymbolDefinition['kind'], name: string, at: { start: number; end: number }, parent = '') => {
      // Overloads come before their implementation: one declaration, from the first signature to the body.
      const last = symbols.at(-1);
      if (last?.kind === kind && last.name === name && last.parent === parent) last.end = at.end;
      else symbols.push({ kind, name, ...at, parent });
    };
    for (const statement of tree.program.body) {
      const node =
        (statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration') && statement.declaration
          ? statement.declaration
          : statement;
      const at = lines(statement);
      if (node.type === 'FunctionDeclaration' || node.type === 'TSDeclareFunction') add('function', node.id?.name ?? 'default', at);
      else if (node.type === 'ClassDeclaration') {
        const name = node.id?.name ?? 'default';
        add('class', name, at);
        for (const member of node.body.body) {
          const method =
            member.type === 'ClassMethod' ||
            member.type === 'ClassPrivateMethod' ||
            member.type === 'TSDeclareMethod' ||
            ((member.type === 'ClassProperty' || member.type === 'ClassPrivateProperty') && isFunction(member.value));
          const key = !('key' in member)
            ? null
            : 'computed' in member && member.computed
              ? `[${text.slice(member.key.start!, member.key.end!)}]`
              : keyName(member.key);
          if (method && key) add('method', key, lines(member), name);
        }
      } else if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          const init = declarator.init;
          if (declarator.id.type !== 'Identifier' || !init) continue;
          // `memo(() => …)` and `forwardRef(function …)` are components, named by their variable.
          if (isFunction(init) || (init.type === 'CallExpression' && init.arguments.some(isFunction)))
            add('function', declarator.id.name, node.declarations.length === 1 ? at : lines(declarator));
          else if (init.type === 'ClassExpression') add('class', declarator.id.name, node.declarations.length === 1 ? at : lines(declarator));
        }
      } else if (node.type === 'TSInterfaceDeclaration') add('interface', node.id.name, at);
      else if (node.type === 'TSTypeAliasDeclaration') add('type', node.id.name, at);
      else if (node.type === 'TSEnumDeclaration') add('enum', node.id.name, at);
      if (symbols.length > MAX_SYMBOLS) return null;
    }
    return symbols;
  } catch {
    return null;
  }
}

interface SpecRequest {
  id: number;
  base: string;
  head: string;
  jsx: boolean;
  /** Declarations of an ordinary source file instead of test structure. */
  symbols?: boolean;
}

export function isSpecRequest(data: unknown): data is SpecRequest {
  const request = data as Partial<SpecRequest> | null;
  return (
    typeof request?.id === 'number' &&
    typeof request.base === 'string' &&
    typeof request.head === 'string' &&
    typeof request.jsx === 'boolean' &&
    (request.symbols === undefined || typeof request.symbols === 'boolean') &&
    request.base.length <= MAX_SOURCE &&
    request.head.length <= MAX_SOURCE
  );
}

export function serveSpecs(port: MessagePort): void {
  serve(port, isSpecRequest, async ({ base, head, jsx, symbols }) =>
    symbols ? { base: parseSymbols(base, jsx), head: parseSymbols(head, jsx) } : { base: parseSpecs(base, jsx), head: parseSpecs(head, jsx) },
  );
}

listen(serveSpecs);
