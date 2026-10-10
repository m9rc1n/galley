---
paths:
  - "src/ui/render.ts"
  - "src/ui/sandbox*.ts"
  - "src/ui/*-frame.*"
  - "src/ui/diagrams.ts"
  - "src/ui/code.ts"
  - "src/core/paths.ts"
  - "src/core/limits.ts"
  - "src/platforms/**"
  - "src/background/**"
  - "src/manifest.json"
  - "lint/**"
  - "scripts/build.mjs"
---

# Near a trust boundary

- Load the `security-boundaries` skill; the boundaries and their tests are in `docs/architecture/security-model.md`.
- Write the hostile test first: content that attempts the attack, asserting it fails.
- Tokens stay in `src/background/` and `src/popup/`; the worker makes only calls allowed in `src/platforms/github-api.ts` (ADR 0009).
- Never retry a write. Never add a request, permission, storage key or dependency without updating PRIVACY.md and `docs/architecture/storage.md`, and an ADR for a new boundary.
- Anything proportional to input size gets a cap or a time budget.
