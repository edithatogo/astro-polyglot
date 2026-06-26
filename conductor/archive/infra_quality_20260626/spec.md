# Specification: Infrastructure & Quality Improvements

## Overview
Improve architecture, CI/CD, code quality, automation, repo structure, and governance across the project. Every task follows: implement → commit → review → CI pass → push.

## Architecture Improvements

### 1. Shared Utility Modules
- `core/doxygen-utils.ts` — Common Doxyfile generation, Doxygen XML parsing, XML-to-AST transform. Reused by all Doxygen-backed handlers (13+ languages).
- `core/dotnet-xml-utils.ts` — Common .NET XML doc parsing, project type detection. Reused by C#, VB.NET, F# handlers.

### 2. Primary API: Astro Content Loader
- Export `polyglotLoader` as primary API for Astro 7 (`astro add astro-polyglot` flow)
- Wrap as `StarlightPlugin` for backward compatibility
- Package name in `index.ts`: `"astro-polyglot"` (already done)

### 3. Parallel Handler Execution
- Run handlers concurrently via `Promise.all()` in the plugin entry point
- Configurable concurrency limit (default: 4 parallel)
- Fallback to sequential if any handler requires exclusive resources

### 4. Graceful Error Recovery
- One handler failure should not crash the full build
- Failed handlers log warnings, successful handlers still produce output
- Configurable `failFast: boolean` option

### 5. Language-Agnostic Fallback Integration
- `core/natural-docs-fallback.ts` — wraps Natural Docs / ROBODoc output
- Activated for languages with no dedicated handler or Doxygen config
- Universal comment parser → shared AST → MDX

### 6. Caching Layer
- Content-hash based cache at the router level
- Skip re-generation when source files haven't changed
- Cache key: hash of all entry points + handler options

## CI/CD Improvements

### 1. Standard Conformance CI Gate
- `pnpm test:conformance` — runs golden fixture tests
- Blocking gate before merge: all MUST/SHOULD handlers must pass

### 2. Multi-Language E2E Test
- `test/e2e/multi-lang/` — Astro site with 5+ languages configured
- Verifies end-to-end: build → pages generated → sidebar populated → searchable
- Runs in CI on every PR

### 3. Containerized Handler Testing (Docker)
- Docker image with ALL toolchains (Python, Node, Rust, .NET, JDK, etc.)
- Run `pnpm test:container` — tests every handler against real source files
- Reduces CI flakiness from missing toolchains

### 4. Benchmark Regression Tracking
- `pnpm bench` → benchmarks each handler's execution time
- Track in CI, alert if handler time increases >20%

## Code Quality

### 1. Handler Maturity Badges
- Auto-generated README badges: `[✓ Conformance]` `[95% Coverage]` `[Stable]`
- Generated from test results, stored in handler metadata

### 2. Standard Conformance Score
- Each handler scored 0-100 on standard variant coverage
- Required minimum: MUST handlers >=90, SHOULD >=70, COULD >=50

### 3. TypeScript Strictness
- Enable `noUncheckedIndexedAccess` in tsconfig
- Add `noUnusedLocals` and `noUnusedParameters` with error level

### 4. Code Coverage
- Enforce per-handler: lines >=90%, branches >=80%, functions >=90%
- CI fails if any handler drops below threshold

## Code Automation

### 1. Handler Scaffold Generator
- `pnpm generate-handler <language>` — creates handler boilerplate
- Generates: handler file, conformance fixtures, script template, router registration
- Prompts for: doc standard, tool CLI, options schema

### 2. Conformance Test Generator
- `pnpm generate-conformance <language>` — creates golden fixture test
- Templates per strategy (dedicated tool, Doxygen, agnostic)

### 3. Auto-Registration Script
- `pnpm register-handler <language>` — adds to router.ts, handler.ts, contract test
- Updates `Language` union type automatically

## Repo Structure

### 1. Handler Organization
```
handlers/
  tier1-dedicated/    # Best-in-class tool handlers (python, typescript, etc.)
  tier2-doxygen/      # Doxygen-backed handlers (c, ada, fortran, etc.)
  tier3-dotnet/       # .NET XML handlers (vbnet, fsharp)
  tier4-fallback/     # Language-agnostic fallback handler
```

### 2. Architecture Decision Records (ADRs)
- `docs/adr/` — document key design decisions
- Template: context → decision → consequences
- Required for: new handler strategy, tool choice, breaking changes

### 3. Extraction Scripts
- Reorganize from flat `scripts/` to `scripts/<language>/`
- Each script has documented I/O contract (stdin args → stdout JSON)

## Governance

### 1. Handler Ownership
- Each handler has a designated owner in `handlers/<lang>/OWNER.md`
- Owners responsible for: standard conformance, bug fixes, tool version updates

### 2. Handler Lifecycle
- **Experimental**: New handler, no conformance requirement
- **Stable**: Conformance >=80, CI tests, documented
- **Deprecated**: Superseded or obsolete; still works but not maintained
- Lifecycle documented in handler's spec.md

### 3. Release Cadence
- Monthly releases on first Monday
- Changelog generated from conventional commits
- Package published to npm with provenance

### 4. PR Template for New Handlers
- PR template `PULL_REQUEST_TEMPLATE/handler.md`
- Checklist: conformance tests, toolchain requirements, documentation

## Acceptance Criteria
1. All architecture improvements implemented with tests
2. CI pipeline includes conformance gate, E2E test, benchmark tracking
3. Handler scaffold generator produces working boilerplate
4. ADR documents exist for key decisions
5. Handler lifecycle documented in README
6. Every task commits via git → review → CI pass → push cycle