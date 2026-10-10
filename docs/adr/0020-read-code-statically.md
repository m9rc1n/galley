---
status: Accepted
date: 2026-10-09
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [42, 43]
tags: [security, code]
---

# ADR 0020: Read test files and declarations statically, and never run repository code

## Context

Large reviews are easier when Galley says what each part is: a test file read as a plan of suites and cases, a source file opened with the functions and types that changed. Both need to understand JavaScript and TypeScript structure. The tempting shortcuts, running the tests or loading the module, would execute code from a fork in the reviewer's browser.

## Decision

- Test files and declarations are parsed with `@babel/parser` inside the sandboxed `spec-frame` ([ADR 0011](0011-sandbox-third-party-engines.md)). **Source is never executed**: callee names, string arguments and ranges are read from the syntax tree; dynamic names stay source expressions.
- Frame replies supply **structure only** (suites, cases, flags, declaration ranges), never HTML or replacement source. The reader keeps every original source line, line number and comment target.
- Galley **says what the source says, not what it does**: Added, Edited, Removed and Unchanged describe the diff. Galley never reports test results, coverage or correctness.
- Limits keep the reader responsive: 200,000 source characters, 10,000 diff rows and 500 declarations for a test plan. Unsupported syntax, files without recognisable cases and parser failures fall back to the source view.
- The reviewer can always switch to **Whole file** (Settings → Review → Test files), per file or for all.

## Consequences

- **Good:** structure helps reading without a new trust boundary.
- **Costs:** only JavaScript and TypeScript (with JSX) and common Jest, Vitest, Mocha and Playwright shapes are recognised.
- **Costs:** proposals that connect behaviour to test evidence ([RFC 0043](../rfcs/0043-test-evidence.md)) or follow references ([RFC 0042](../rfcs/0042-inspect-related-code.md)) must keep static, reviewer-confirmed links, never inferred results.

## Alternatives considered

- **Run tests in a sandbox:** shows results, but executes fork code and needs a runtime Galley does not have.
- **Regular expressions over the source:** no parser, but brittle on real test files and easy to fool.

## Enforcement

- `src/ui/spec-frame.test.ts`, `src/ui/specs.test.ts`, `src/ui/symbols.test.ts`, and `e2e/specs.mjs` in Chrome.
- Reviewers reject any `eval`, `Function` or dynamic `import()` of reviewed content.

## References

- `c33a240`, pull request [#32](https://github.com/m9rc1n/galley/pull/32); [User guide, Test files](../GUIDE.md#test-files).
