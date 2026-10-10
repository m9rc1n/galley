# ADR 0007: Render Markdown in the browser

## Status

Accepted

## Context

[RFC 0042](../rfcs/0042-reading-first-reviews.md) asks for documentation changes to be read as articles. Rendering on our servers would mean storing private repository content.

## Decision

Parse and render documents in the reader's browser. The [architecture overview](../architecture/overview.md#rendering) shows where this sits.

## Consequences

No repository content is stored by the service. The queue from [ADR 0003](0003-queue-for-reviews.md) is no longer on the rendering path.
