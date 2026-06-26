# ADR-002: Handler Dispatch Strategy

## Status

Accepted

## Context

The plugin needs to execute multiple language handlers during a single build or dev session. Initially, handlers were executed sequentially. This becomes a bottleneck as more languages are added.

## Decision

Implement a concurrency-limited parallel dispatch strategy:

1. A `runHandlers()` function executes handlers with `Promise.all` style parallelism
2. Concurrency is capped at 4 by default (configurable via `concurrency` option)
3. Each handler is wrapped in try/catch for error isolation
4. A `failFast` option controls whether errors propagate or are swallowed
5. A content-hash caching layer (`HandlerCache`) tracks per-handler source file changes

The worker pool pattern is used: a fixed number of "worker" promises consume from a shared queue of handlers. This prevents unbounded parallelism while maximizing throughput.

## Consequences

- Performance scales with available concurrency
- One failing handler doesn't block other languages (unless failFast: true)
- Cache avoids re-running handlers whose sources haven't changed
- Workers pattern is simple and well-understood
- Error messages are properly attributed to specific handlers
