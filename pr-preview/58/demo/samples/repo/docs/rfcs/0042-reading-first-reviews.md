---
title: "RFC 0042: Reading-first reviews"
type: rfc
status: Proposed
---

# RFC 0042: Reading-first reviews

## Summary

Review documentation changes as readable articles, with edits marked in place, instead of as raw diffs.

## Motivation

Reviewers skim diffs of prose and miss what changed in meaning. The previous attempt, [RFC 0041](0041-diff-annotations.md), was withdrawn.

## Design

Documents are rendered in the browser, as decided in [ADR 0007](../adr/0007-render-markdown-in-the-browser.md). The renderer's place in the system is described in the [architecture overview](../architecture/overview.md#rendering-pipeline).

## Rollout

Two weeks of dogfooding on this handbook, then an opt-in setting.
