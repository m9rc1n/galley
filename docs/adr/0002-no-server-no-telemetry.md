---
status: Accepted
date: 2026-10-04
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: [37, 42, 45, 47, 48, 55]
tags: [privacy, architecture]
---

# ADR 0002: Run entirely in the browser, with no Galley server and no telemetry

## Context

Galley reads pull and merge requests, which are often private source code and design documents. Reviewers already trust GitHub or GitLab with that content; any additional party is a new place for it to leak and a new thing for a company's security review to approve. A browser extension can do everything Galley needs: fetch the files with the reviewer's own access, render them and post comments back.

## Decision

- Galley has **no backend**. Files are fetched from the GitHub or GitLab site the reviewer is on, rendered in the browser, kept in memory while the page is open, and never sent anywhere else.
- Galley has **no accounts, analytics, telemetry or error reporting**. Product questions are answered in research sessions with reviewers who volunteer, never by instrumenting the extension. Every RFC repeats this.
- Galley loads **no remote code**: everything it runs ships in the extension package (see [ADR 0012](0012-bundle-fonts-and-engines.md)).
- The only other network traffic is an image hosted elsewhere, and only after the reviewer chooses to load it ([ADR 0010](0010-external-images-behind-consent.md)).
- What Galley keeps on the device is listed in [PRIVACY.md](../../PRIVACY.md) and [the storage inventory](../architecture/storage.md).

## Consequences

- **Good:** nothing to host, pay for, secure or keep running. Privacy reviews have a short answer, and the store listings can say "Servers: 0" truthfully.
- **Good:** the extension works on self-managed GitLab and GitHub Enterprise Server inside a company network.
- **Costs:** no shared state between reviewers except what the platform stores. Features such as shared responsibilities ([RFC 0047](../rfcs/0047-shared-review-responsibilities.md)) or a review inbox ([RFC 0048](../rfcs/0048-personal-review-inbox.md)) must fit platform APIs or local storage.
- **Costs:** no crash reports or usage data. Bugs arrive as issues; validation needs real sessions with reviewers.
- **Costs:** everything runs on the reviewer's machine, so large reviews need work limits and sandboxes ([ADR 0003](0003-parse-and-compare-markdown-in-the-browser.md), [ADR 0011](0011-sandbox-third-party-engines.md)).

## Alternatives considered

- **Render on a server, or use the platforms' own Markdown renderers:** the platforms do not return the source positions Galley needs, and a server would see private content.
- **Opt-in anonymous analytics:** even opt-in telemetry changes the privacy promise and the store disclosures; research sessions answer the questions RFCs actually ask.

## Enforcement

- The manifest's `host_permissions` are only `github.com` and `gitlab.com`; other hosts are optional and requested one site at a time from the popup. A new permission is at least a `feat` (see [CONTRIBUTING.md](../../CONTRIBUTING.md#commits-and-releases)) and needs an ADR.
- `src/background/worker.ts` refuses any GitHub request outside the allowlist in `src/platforms/github-api.ts` ([ADR 0009](0009-github-tokens-in-the-background-worker.md)).
- Reviewers check every pull request that adds a `fetch`, a storage key or a dependency against PRIVACY.md and [store/LISTING.md](../../store/LISTING.md).

## References

- [PRIVACY.md](../../PRIVACY.md), README "Privacy and security, the short version".
- `e941109` (0.1.0, 4 October 2026); `6b4a973` dropped the unused `api.github.com` and `raw.githubusercontent.com` host permissions.
- The validation sections of RFCs 0036 to 0049.
