---
paths:
  - "src/**/*.test.ts"
  - "src/testing/**"
  - "e2e/**"
  - "vitest.config.ts"
  - "scripts/*.test.mjs"
---

# Tests

- Every source file stays at 100% statements, branches, functions and lines; no coverage-ignore comments. Unreachable code is deleted (ADR 0017). Load the `galley-tests` skill.
- Test titles describe behaviour a reviewer would notice. A bug fix starts with the failing test.
- Stub with `vi.stubGlobal`, `vi.spyOn` or `mockFetch`; never assign globals by hand. No sleeps: `vi.waitFor()` or fake timers.
- Never weaken or delete an assertion to make a check pass.
