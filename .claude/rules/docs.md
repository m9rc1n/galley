---
paths:
  - "docs/**"
  - "*.md"
  - "store/*.md"
  - ".claude/skills/**"
---

# Documentation

- Words follow `docs/COPY.md`: plain, specific, the reader's real labels, no unbacked claims.
- ADRs and RFCs: load the `decision-records` skill. Front matter is plain YAML (no ` #` inside a value); ADR `rfcs:` and RFC `adrs:` must name each other.
- After adding or editing a record, run `npm run docs:index`, then `npm run docs:check` (it also checks every relative link and heading anchor).
- Never edit `CHANGELOG.md` or the generated index tables by hand.
