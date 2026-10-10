# Galley: instructions for coding agents

Galley is a browser extension (Chrome and Firefox, Manifest V3) that opens GitHub pull requests and GitLab merge requests as readable documents and code, with edits marked in context and comments beside the text. It has no server: everything runs in the reviewer's browser. TypeScript, plain DOM, no UI framework. Licensed GPL-3.0-or-later.

Humans and agents share the same documentation. This file is the short version; [docs/README.md](docs/README.md) is the map.

## Before you change anything

1. **Read the decisions for the area.** [docs/adr/README.md](docs/adr/README.md) has an index by area. If your change contradicts an ADR, stop and propose a superseding ADR instead of working around it.
2. **Check the proposals.** [docs/rfcs/README.md](docs/rfcs/README.md) lists open RFCs. Work that implements one says `Refs #NN` and follows its acceptance criteria; work that overlaps one should not quietly decide its open questions.
3. **Find the code.** [Architecture](docs/architecture/README.md) maps modules; the [UI map](docs/design/ui-map.md) maps every surface a reviewer sees to its code; the [glossary](docs/glossary.md) maps product words to code names.

## Commands

```bash
npm install              # Node 22.12+; also enables the pre-push hook (npm ci --ignore-scripts in CI and sandboxes)
npm run check            # types, Biome lint and format, unit tests at 100% coverage, Pages tests, docs check: run before every push
npm test                 # unit tests only; npx vitest run --project core (or ui, platforms…) for one folder
npm run test:e2e         # builds the demo, drives the real reader in Chrome; CHROME_PATH=/path/to/chrome if needed
npm run screenshots      # screenshots of the reader at several widths, light and dark, into reports/screenshots/
npm run demo             # the reader on a sample review at http://localhost:4173 (?spec, ?comments, ?large, ?chapters)
npm run format           # fix formatting; npm run lint:fix for safe lint fixes
npm run docs:index       # regenerate ADR and RFC indexes after adding or editing one
npm run build            # dist/chrome and dist/firefox
```

## Rules that are never negotiable

Each is an accepted decision; breaking one needs a new ADR, not an exception.

- **No server, telemetry, analytics or remote code.** Galley talks only to the GitHub or GitLab site in use ([ADR 0002](docs/adr/0002-no-server-no-telemetry.md)).
- **Never write a string as HTML.** Content goes through `sanitize()` in `src/ui/render.ts` or becomes text nodes; the Biome rule `lint/no-unsanitized-html.grit` enforces it ([ADR 0006](docs/adr/0006-sanitise-all-rendered-html.md)).
- **GitHub tokens never enter the page.** Only `src/background/worker.ts` uses them, for the calls allowed in `src/platforms/github-api.ts` ([ADR 0009](docs/adr/0009-github-tokens-in-the-background-worker.md)).
- **Third-party engines run in sandbox frames; repository code never runs** ([ADR 0011](docs/adr/0011-sandbox-third-party-engines.md), [ADR 0020](docs/adr/0020-read-code-statically.md)).
- **Platform writes happen once, on an explicit action, and are never retried** ([ADR 0008](docs/adr/0008-comment-through-platform-review-apis.md)).
- **Stored progress is fingerprints only;** any new storage key is a privacy change: update [PRIVACY.md](PRIVACY.md) and the [storage inventory](docs/architecture/storage.md) ([ADR 0019](docs/adr/0019-review-progress-as-fingerprints.md)).
- **100% test coverage of every source file, no ignore comments.** Unreachable code is deleted ([ADR 0017](docs/adr/0017-full-coverage-of-every-file.md)).
- **Colours come from tokens,** and every palette meets its contrast floors in light and dark ([ADR 0013](docs/adr/0013-reading-palettes-as-token-sets.md)).
- **Few dependencies, permissive licences only** (MIT, BSD, ISC, Apache-2.0) ([ADR 0005](docs/adr/0005-plain-typescript-and-dom.md)).
- **Never edit the version or CHANGELOG.md;** release-please does ([ADR 0014](docs/adr/0014-release-from-conventional-commits.md)).

## How work is done here

- **Match the surrounding code.** TypeScript, plain DOM, single quotes, two spaces, 160-character lines (Biome formats). Doc comments explain why, in plain sentences. Click handling goes through `data-act` and `Reader.onClick()`; settings through `update()` and `applySettings()` ([patterns](docs/design/patterns.md)).
- **Tests sit next to the code** (`foo.ts` → `foo.test.ts`), describe behaviour a reviewer would notice, and a bug fix starts with the failing test. Browser-only behaviour goes in `e2e/`.
- **UI changes are looked at,** not just tested: `npm run screenshots`, then the [design checklist](docs/design/README.md#review-checklist).
- **Words follow [docs/COPY.md](docs/COPY.md):** the reader's real control labels, benefit first, no unbacked claims.
- **Docs change with the code:** the [user guide](docs/GUIDE.md) for behaviour, README counts and keys, architecture pages for boundaries, an ADR for a decision.
- **Pull request titles are Conventional Commits** and become the squashed commit: `feat(reader): …`, `fix(github): …`, `docs: …`. Choose the type by what an extension user would notice.

## Skills

Task-specific instructions live in `.claude/skills/` (also reachable as `.agents/skills/`). Load the one that matches the task:

| Skill | Use it when |
| --- | --- |
| `galley-ui` | Changing anything a reviewer sees: reader, popup, launcher, website, settings, shortcuts, CSS |
| `verify-ui` | Checking a visual or interaction change in a real browser, or producing screenshots |
| `ux-copy` | Writing or reviewing words users read: labels, errors, guide, README, store, release notes |
| `security-boundaries` | Touching rendering, the sanitiser, sandbox frames, tokens, the worker, permissions, storage or network |
| `platform-adapters` | Changing how Galley reads from or writes to GitHub or GitLab |
| `galley-tests` | Writing tests, fixing a failing test, or getting coverage back to 100% |
| `decision-records` | Writing or updating an ADR or RFC, or finding out why something is built a certain way |
| `steward` | Preparing a commit, push or pull request, and driving it through CI and review |

## Environment notes

- Chrome or Chromium is needed for `npm run test:e2e`, `npm run screenshots`, `npm run test:site` and `npm run store-assets`. Set `CHROME_PATH` when it is not in a standard place (for example `/opt/pw-browsers/chromium` in Claude Code cloud sessions).
- The pre-push hook runs `npm run check` on each pushed commit in a temporary worktree; a failure blocks the push. Fix the cause rather than using `--no-verify`.
- `reports/`, `coverage/` and `dist/` are generated and ignored.
- The demo (`demo/`) never contacts GitHub or GitLab; use it for anything visual.
