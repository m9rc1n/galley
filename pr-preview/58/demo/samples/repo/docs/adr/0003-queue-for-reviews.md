# ADR 0003: Queue review jobs

## Status

Superseded by [ADR 0007](0007-render-markdown-in-the-browser.md)

## Context

Rendering large merge requests on the webhook thread timed out.

## Decision

The webhook receiver only enqueues a job; a worker renders it. This follows the process in [ADR 0001](0001-record-decisions.md).

## Consequences

Rendering moved off the request path. When rendering moved to the browser (ADR 0007), the queue only carried notifications.
