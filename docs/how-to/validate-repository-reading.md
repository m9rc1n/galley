# Validate repository reading

[RFC 0049](../rfcs/0049-repository-docs-and-project-maps.md) treats every benefit of reading a project, its map, its architecture views and private notes as a hypothesis. This guide is how to test them with readers before the RFC advances: what to prepare, what to ask, and what to write down. Galley collects nothing itself ([ADR 0002](../adr/0002-no-server-no-telemetry.md)); observations come only from voluntary research sessions.

## 1. Prepare the repositories

Pick three to five repositories with permission to use them: one small, one large or a monorepo, one with incomplete or contradictory documentation, and Galley itself. For each, run the report on a local checkout:

```bash
npm run repo:report                        # this repository
npm run repo:report -- ../their/checkout   # another one
npm run repo:report -- ../their/checkout --json > reports/repo-report.json
```

The report reads tracked files at the checkout's commit with the reader's own code (`src/core`) and says what the map will show: documents and where their types come from, links and the links the map cannot follow, decision records without a status or with two, and what the configuration declares. Nothing leaves the machine. Note before the session:

- how many passes the map needs (150 documents each), and whether the listing hits a budget;
- types guessed wrongly from paths (a skills folder named `decision-records/` reads as decisions, for example);
- how many unverified suggestions the architecture and infrastructure views would make: a common job name such as `build` or `test` is named in many documents.

## 2. Run the tasks

Use 5–8 readers, new teammates and experienced reviewers. Install the extension from the branch (`npm run dev`, then load `dist/dev`) or use the demo (`npm run demo`, then `?repo`). Ask each reader, in the repository they know least:

1. Find the spec for a named feature, from the repository's front page.
2. Trace the decision record behind it, and say whether it is still in force.
3. Explain one component boundary: what talks to what, and where that is stated.
4. Locate the deployment evidence for one service, and say whether it shows what is running.
5. Write down one open question as a note, close the reader, come back, and find it again.
6. From a merge request in that repository, open Project docs and say which documents the change might affect.

Run the same tasks with the provider's own navigation as a comparison, alternating which comes first.

## 3. Record

For each task: time to the evidence, whether the explanation was correct, where the reader lost their place, any connection on the map they believed that was false, whether the saved note came back, and their own sense of effort. Write it down in the session notes, with the repository and commit from the report. Do not record anything from private repositories that their owners have not agreed to share.

Summarise in the RFC's discussion ([issue #49](https://github.com/m9rc1n/galley/issues/49)): what helped, what misled, which budgets or limits got in the way. Pilot targets are set from these results, not before.
