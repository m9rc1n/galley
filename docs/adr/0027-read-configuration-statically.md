---
status: Proposed
date: 2026-10-10
deciders: [m9rc1n]
rfcs: [49]
tags: [security, repository]
---

# ADR 0027: Read configuration files statically, on request, in a sandboxed frame, and never call it running infrastructure

## Context

The architecture and infrastructure views ([RFC 0049 Phase 3](../rfcs/0049-repository-docs-and-project-maps.md#phase-3--architecture-and-infrastructure-views)) are more useful with what a repository's configuration declares: Compose services and their dependencies, workflow jobs and environments, Kubernetes workloads, Terraform resources. These files come from the repository, which may be hostile, and YAML parsers have well-known traps: alias expansion that grows without bound, custom tags, and very large inputs. What a file declares is also not what is deployed.

## Decision

- Configuration files are recognised by name and folder (`configFormat` in `src/core/discovery.ts`): Compose files (`compose.yaml`, `docker-compose.yml` and their variants), GitHub Actions workflows, `.gitlab-ci.yml`, YAML under `k8s/`, `kubernetes/`, `manifests/`, `deploy/` or `deployments/` (Helm `templates/` excluded: they are not YAML until rendered), and Terraform `.tf` files. At most 60 are listed.
- They are read **only when the reader chooses Read configuration**, at the snapshot's commit, four downloads at a time.
- Parsing happens in a new sandboxed extension page, **`config-frame`** ([ADR 0011](0011-sandbox-third-party-engines.md)), with the **`yaml`** package (ISC licence, a new runtime dependency). The frame walks the parsed syntax tree: **aliases are never expanded**, tags are not resolved, includes and remote references are not followed, and Terraform is read with a pattern for `resource` and `module` blocks only. Files over **256,000 characters** are not read; at most **400 declarations** per file.
- The frame replies with **structure only**: names, kinds from a fixed list, keys, labels from a fixed list and line numbers within the file (`isReading` in `src/ui/configs.ts` refuses anything else). Its words reach the page as text, never HTML.
- What was not read is said: files too large, files that could not be read, included files, references between Terraform resources, declarations past the limit.
- The views say **"Declared means what these files ask for at {commit}, not what is running"**, and items read this way are labelled **Declared in configuration** ([ADR 0026](0026-an-evidence-only-project-map.md)). Galley never contacts a cluster, a cloud account or a CI service, and never runs anything in the files.

## Consequences

- **Good:** a reader can trace a service boundary or a deploy path to the line that declares it, without any new trust boundary in the page.
- **Costs:** a new dependency in the extension, loaded only in the frame, never in the content script; configuration that is generated, templated (Helm, Kustomize overlays) or split across included files is partly or not read, and says so.
- **Follow-up:** each new format needs its own reader in the frame, its tests and a line in the user guide.

## Alternatives considered

- **Parse YAML in the content script:** simpler, but runs a parser over hostile input with the page's privileges and on its main thread.
- **Regular expressions for YAML:** no dependency, but YAML's syntax makes them wrong often enough to mislead.
- **Query live infrastructure:** would show what runs, but needs credentials and network access Galley does not have and should not ask for.

## Enforcement

- `src/ui/config-frame.test.ts` (each format, alias bombs read without expansion, limits, refused requests), `src/ui/configs.test.ts` (replies validated, the frame is sandboxed), `src/ui/repo-lenses.test.ts` (read only on request; what was not read is said; a refresh discards a reading in progress).
- `scripts/build.mjs` bundles `config-frame`, and `src/manifest.json` lists it under `sandbox`; `e2e/repo.mjs` checks the frame's `sandbox` attribute in Chrome.
- [PRIVACY.md](../../PRIVACY.md) and the [security model](../architecture/security-model.md) describe the reads.

## References

- `b75c60c`; [yaml](https://eemeli.org/yaml/) documentation; [ADR 0020](0020-read-code-statically.md), which takes the same stance for code.
