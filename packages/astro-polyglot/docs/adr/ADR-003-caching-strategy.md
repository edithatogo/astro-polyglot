# ADR-003: Content-Hash Caching Strategy

## Status

Accepted

## Context

During development with `astro dev`, the plugin may be invoked many times as source files change. Without caching, every invocation re-runs all handlers, which can be slow for languages with expensive toolchains (e.g., TypeDoc, Doxygen).

## Decision

Implement a two-level caching strategy:

### Level 1: Combined Digest Cache (Loader-level)
A SHA-256 hash of all source file paths, modification times, and sizes is computed. If unchanged from the previous run, ALL handler execution is skipped. This is stored in the Astro loader's `context.meta`.

### Level 2: Per-Handler Cache (Router-level)
Each handler has its own digest cache key (`handler:<language>`). When the combined cache misses, individual handlers are checked. A handler whose source files haven't changed (but another handler's have) is skipped.

The cache is a simple `Map<string, string>` (digest key → digest value), serialized to JSON for persistence. Cache entries are computed from:
- Source file paths from handler options (`entryPoints`, `cratePath`, `projectPath`, `modulePath`)
- File modification times and sizes
- Directory contents are scanned recursively (excluding node_modules, dist, dotfiles)

## Consequences

- Fast rebuilds: no toolchain invocations when nothing changed
- Granular: per-handler caching means mixed-language projects don't re-run all handlers
- Simple: SHA-256 digest is cheap to compute
- Stateless: cache is serialized JSON, easy to debug and reset
- No false positives: modification times and sizes are reliable indicators of change
