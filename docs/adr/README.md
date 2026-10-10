# Architecture decision records (ADRs)

An ADR records one decision that shapes Galley: what we chose, why, what it costs, and what keeps it in place. Read the ADRs for an area before changing it. If your change contradicts one, the change needs a new ADR that supersedes it, not a quiet exception.

Proposals that need discussion first are [RFCs](../rfcs/README.md). An ADR lists the RFCs that led to it or bear on it (`rfcs:`); each of those RFCs lists the ADR back (`adrs:`). `npm run docs:check` fails when a link goes only one way.

## When to write one

Write an ADR when a change:

- adds or removes a runtime dependency, permission, host, storage key or network request;
- changes a trust boundary: what renders page content, what can reach a token, what runs in a sandbox;
- sets a rule other contributors must follow (a coverage policy, a design token contract, a release process);
- reverses or narrows an earlier ADR.

Skip it for changes that follow an existing decision. Fixing a bug, adding a palette or a setting, and refactoring inside a module rarely need one.

## Lifecycle

| Status | Meaning |
| --- | --- |
| Proposed | Written and under review in a pull request. |
| Accepted | In force. The code follows it, and its **Enforcement** section says how that is checked. |
| Deprecated | No longer applies, and nothing replaced it (the feature was removed). |
| Superseded | Replaced; `superseded-by:` names the ADR in force. |
| Rejected | Considered and turned down. Kept so the question is not reopened blind. |

An accepted ADR is not rewritten. Corrections of fact and new links are fine; a change of mind is a new ADR with `supersedes:`, and the old one gets `status: Superseded` and `superseded-by:`.

## How to add one

1. Copy [template.md](template.md) to `docs/adr/NNNN-short-title.md`, using the next free number.
2. Fill in every section. **Enforcement** names the test, lint rule, build check or review step that fails if the decision is broken; "reviewers" is a valid answer, but say what they look for.
3. Link the RFCs it answers in `rfcs:`, and add the ADR to each RFC's `adrs:`.
4. Run `npm run docs:index` to refresh the table below, then `npm run docs:check`. `npm run check` and CI run the check too.
5. Open the pull request with a `docs:` title, or include the ADR in the pull request that makes the change.

### Front matter

```yaml
---
status: Accepted          # Proposed, Accepted, Deprecated, Superseded or Rejected
date: 2026-10-06          # when the decision was made (YYYY-MM-DD)
recorded: 2026-10-10      # optional: when it was written down, if later
deciders: [m9rc1n]
rfcs: [36]                # RFCs that led to or bear on this decision
supersedes: []            # optional: ADR numbers this replaces
superseded-by:            # optional: the ADR that replaces this one
tags: [security, ui]      # optional
---
```

The first heading is `# ADR NNNN: The decision, stated plainly`.

## Records written after the fact

ADRs 0002 to 0023 were backfilled on 10 October 2026 from the commit history, pull request descriptions and code comments. Their `date` is when the decision was made; their **References** name the commits and pull requests it comes from. Where the history did not say why, the ADR says so rather than guessing.

## Index

Generated from the ADR files by `npm run docs:index`; do not edit by hand.

<!-- adr-index:start -->
| ADR | Decision | Status | Date | RFCs |
| --- | --- | --- | --- | --- |
| [0001](0001-record-decisions-and-proposals.md) | Record decisions as ADRs and proposals as RFCs, linked both ways | Accepted | 2026-10-10 | [0049](../rfcs/0049-repository-docs-and-project-maps.md) |
| [0002](0002-no-server-no-telemetry.md) | Run entirely in the browser, with no Galley server and no telemetry | Accepted | 2026-10-04 | [0037](../rfcs/0037-private-follow-ups.md), [0042](../rfcs/0042-inspect-related-code.md), [0045](../rfcs/0045-search-across-a-review.md), [0047](../rfcs/0047-shared-review-responsibilities.md), [0048](../rfcs/0048-personal-review-inbox.md), [0055](../rfcs/0055-choose-where-galley-runs.md) |
| [0003](0003-parse-and-compare-markdown-in-the-browser.md) | Parse and compare Markdown in the browser, block by block and then word by word | Accepted | 2026-10-04 | — |
| [0004](0004-reader-as-a-shadow-dom-overlay.md) | Show the reader as a full-window shadow-DOM overlay on the review page | Accepted | 2026-10-04 | — |
| [0005](0005-plain-typescript-and-dom.md) | Write the extension in plain TypeScript and DOM, with few, permissively licensed dependencies | Accepted | 2026-10-04 | — |
| [0006](0006-sanitise-all-rendered-html.md) | Treat every document as hostile: sanitise all rendered HTML, and enforce it with a lint rule | Accepted | 2026-10-04 | — |
| [0007](0007-rebuild-github-base-from-the-patch.md) | Load GitHub head files from the page's origin and rebuild base versions from the pull request patch | Accepted | 2026-10-04 | — |
| [0008](0008-comment-through-platform-review-apis.md) | Post comments and replies through the platforms' own review APIs, and never retry a write | Accepted | 2026-10-05 | [0040](../rfcs/0040-thoughtful-finish.md), [0046](../rfcs/0046-comment-intent-and-severity.md), [0047](../rfcs/0047-shared-review-responsibilities.md) |
| [0009](0009-github-tokens-in-the-background-worker.md) | Keep GitHub tokens in the background worker, behind an allowlist of the reader's own API calls | Accepted | 2026-10-06 | [0049](../rfcs/0049-repository-docs-and-project-maps.md) |
| [0010](0010-external-images-behind-consent.md) | Hold images hosted elsewhere until the reviewer chooses to load them | Accepted | 2026-10-06 | — |
| [0011](0011-sandbox-third-party-engines.md) | Run third-party engines that read pull request content in sandboxed extension frames | Accepted | 2026-10-06 | [0049](../rfcs/0049-repository-docs-and-project-maps.md) |
| [0012](0012-bundle-fonts-and-engines.md) | Bundle fonts and engines with the extension; load nothing from a CDN or font service | Accepted | 2026-10-06 | — |
| [0013](0013-reading-palettes-as-token-sets.md) | Define reading palettes as sets of colour tokens, separate from light and dark, with tested contrast floors | Accepted | 2026-10-06 | — |
| [0014](0014-release-from-conventional-commits.md) | Version and release from Conventional Commits with release-please | Accepted | 2026-10-06 | — |
| [0015](0015-vitest-biome-and-pre-push-checks.md) | Test per folder with Vitest, lint and format with Biome, and check every pushed commit | Accepted | 2026-10-06 | — |
| [0016](0016-gpl-with-commercial-licence.md) | License Galley under GPL-3.0-or-later, with a separate commercial licence | Accepted | 2026-10-07 | — |
| [0017](0017-full-coverage-of-every-file.md) | Require 100% test coverage of every source file, and delete code no test can reach | Accepted | 2026-10-08 | — |
| [0018](0018-centre-the-text-on-wide-screens.md) | Centre the text on wide screens, with contents and comments in its margins | Accepted | 2026-10-09 | — |
| [0019](0019-review-progress-as-fingerprints.md) | Keep review progress on the device as fingerprints, and sync it only with GitHub's own Viewed state | Accepted | 2026-10-05 | [0037](../rfcs/0037-private-follow-ups.md), [0038](../rfcs/0038-pause-and-resume.md), [0039](../rfcs/0039-changes-since-last-review.md), [0048](../rfcs/0048-personal-review-inbox.md), [0049](../rfcs/0049-repository-docs-and-project-maps.md), [0055](../rfcs/0055-choose-where-galley-runs.md) |
| [0020](0020-read-code-statically.md) | Read test files and declarations statically, and never run repository code | Accepted | 2026-10-09 | [0042](../rfcs/0042-inspect-related-code.md), [0043](../rfcs/0043-test-evidence.md) |
| [0021](0021-suggested-order-and-folded-files.md) | Suggest a reading order and fold files most reviewers skip, always reversibly | Accepted | 2026-10-09 | [0036](../rfcs/0036-review-chapters.md), [0040](../rfcs/0040-thoughtful-finish.md), [0045](../rfcs/0045-search-across-a-review.md) |
| [0022](0022-review-chapters-from-evidence.md) | Group review chapters from explainable evidence, editable for the session only | Accepted | 2026-10-09 | [0036](../rfcs/0036-review-chapters.md), [0055](../rfcs/0055-choose-where-galley-runs.md) |
| [0023](0023-pull-request-demos-on-github-pages.md) | Publish temporary pull request demos on GitHub Pages from a default-branch publisher | Accepted | 2026-10-09 | — |
<!-- adr-index:end -->

## By area

| Area | ADRs |
| --- | --- |
| Product boundaries | [0002](0002-no-server-no-telemetry.md) no server, [0016](0016-gpl-with-commercial-licence.md) licence |
| Rendering and diffing | [0003](0003-parse-and-compare-markdown-in-the-browser.md), [0007](0007-rebuild-github-base-from-the-patch.md), [0020](0020-read-code-statically.md) |
| Security | [0006](0006-sanitise-all-rendered-html.md), [0009](0009-github-tokens-in-the-background-worker.md), [0010](0010-external-images-behind-consent.md), [0011](0011-sandbox-third-party-engines.md), [0012](0012-bundle-fonts-and-engines.md) |
| Reader UI | [0004](0004-reader-as-a-shadow-dom-overlay.md), [0005](0005-plain-typescript-and-dom.md), [0013](0013-reading-palettes-as-token-sets.md), [0018](0018-centre-the-text-on-wide-screens.md) |
| Review workflow | [0008](0008-comment-through-platform-review-apis.md), [0019](0019-review-progress-as-fingerprints.md), [0021](0021-suggested-order-and-folded-files.md), [0022](0022-review-chapters-from-evidence.md) |
| Engineering process | [0001](0001-record-decisions-and-proposals.md), [0014](0014-release-from-conventional-commits.md), [0015](0015-vitest-biome-and-pre-push-checks.md), [0017](0017-full-coverage-of-every-file.md), [0023](0023-pull-request-demos-on-github-pages.md) |
