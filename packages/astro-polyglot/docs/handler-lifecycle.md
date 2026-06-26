# Handler Lifecycle

This document describes the tiered structure and lifecycle of language handlers in astro-polyglot.

## Tiered Structure

Handlers are organized into three tiers based on their maturity:

### Tier 1: Stable
Production-ready handlers with full test coverage, CI validation, and documented APIs.

- python, typescript, rust, go, csharp, java, kotlin, r

### Tier 2: Beta
Feature-complete handlers that may have incomplete edge-case handling or partial test coverage.

- cpp, swift, julia, scala, ruby, dart, php, elixir

### Tier 3: Experimental
Proof-of-concept handlers with limited testing and possible API changes.

- stata, sas

## Lifecycle Stages

### 1. Proposal
- Identify the language and its doc standard
- Create a handler specification in `conductor/`
- Define required fixtures and conformance tests

### 2. Scaffold
- Run `pnpm generate:handler <language>` to create the handler skeleton
- Run `pnpm register:handler <language>` to add it to the type system and router
- Create fixture source files in `tests/fixtures/<language>/`

### 3. Implementation
- Implement the `generate()` method in `handlers/<language>.ts`
- Use the shared AST pipeline (`transformToMDX`) for consistent output
- Write conformance tests using `describeConformance()`

### 4. Validation
- Ensure handler passes `pnpm test`, `pnpm lint`, and `pnpm typecheck`
- Validate against real-world codebases
- Run `pnpm test:conformance` to verify fixture coverage

### 5. Maturity Promotion
- **experimental → beta**: Handler passes conformance tests for all core fixtures
- **beta → stable**: Handler has >80% line coverage, passes CI for all PRs, and has been validated against real-world projects

## Ownership

Each handler is owned by the team that implemented it. See `HANDLERS.md` for current ownership assignments.
