@AGENTS.md

## Claude Code

- Skills live in `.claude/skills/` and load by their descriptions; invoke one by name when the task matches (see the table above).
- Path-scoped rules in `.claude/rules/` load when you read or edit matching files: UI, security boundaries, tests and docs.
- To see the reader, run `npm run screenshots` and read the PNGs in `reports/screenshots/` with the Read tool.
