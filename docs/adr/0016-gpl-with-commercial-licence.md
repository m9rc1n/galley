---
status: Accepted
date: 2026-10-07
recorded: 2026-10-10
deciders: [m9rc1n]
rfcs: []
tags: [licence]
---

# ADR 0016: License Galley under GPL-3.0-or-later, with a separate commercial licence

## Context

Galley was MIT-licensed up to 0.4.1. MIT lets anyone ship a closed-source fork. The maintainer wanted distributed forks to stay open, while leaving a path for companies that need to build Galley into a closed product.

## Decision

- Galley is licensed under **GPL-3.0-or-later** (released in 0.5.1). Releases up to and including 0.4.1 remain available under MIT.
- A **commercial licence** is offered separately for closed-source use; requests start with an issue titled "Commercial license", without contact details.
- **Contributions** are GPL-3.0-or-later and also grant the maintainer a perpetual right to relicense them, which keeps the commercial licence possible. Contributors keep their copyright.
- **Runtime dependencies must be permissive** (MIT, BSD, ISC, Apache-2.0), so they are compatible with both licences ([ADR 0005](0005-plain-typescript-and-dom.md)).

## Consequences

- **Good:** distributed modifications must publish their source.
- **Costs:** the GPL has no network clause, so a privately hosted modified version need not share its source; AGPL would close that gap and was noted as an option.
- **Costs:** the contributor grant is agreed by submitting a pull request, which is weaker than a signed agreement.
- **Follow-up:** store dashboards must show the current licence.

## Alternatives considered

- **Stay MIT:** simplest, but allows closed forks.
- **AGPL-3.0:** covers hosting too, but is a bigger ask for companies evaluating an extension.

## Enforcement

- `LICENSE`, `package.json` (`"license": "GPL-3.0-or-later"`), [CONTRIBUTING.md, Licence](../../CONTRIBUTING.md#licence).
- Reviewers check the licence of every new runtime dependency; the build lists them in `THIRD_PARTY_NOTICES.txt`.

## References

- `925402c`, pull request [#21](https://github.com/m9rc1n/galley/pull/21).
