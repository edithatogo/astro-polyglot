# Requirements (MoSCoW)

> **ID Convention:** `REQ-{CATEGORY}-{NUM}`
> **Priority Levels:** `[MUST]` = Required for MVP | `[SHOULD]` = High priority, not blocking | `[COULD]` = Nice to have, post-MVP | `[WONT]` = Explicitly out of scope
> **Fulfilled By:** References to tracks in [tracks.md](./tracks.md) with prefix `TRK-`

---

## CORE - Plugin Core

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-CORE-001 | Register as valid Starlight plugin via config:setup hook | MUST | TRK-plugin_scaffold, TRK-core_router_plugin |
| REQ-CORE-002 | Accept config object mapping languages to entry points | MUST | TRK-core_router_plugin |
| REQ-CORE-003 | Dispatch each language to correct handler | MUST | TRK-core_router_plugin |
| REQ-CORE-004 | Generate Starlight-native MDX with valid frontmatter | MUST | TRK-core_mdx_generator |
| REQ-CORE-005 | MDX must include title, description, sidebar_label, pagefind-index metadata | MUST | TRK-core_mdx_generator |
| REQ-CORE-006 | Auto-register generated pages in Starlight sidebar | MUST | TRK-core_router_plugin |
| REQ-CORE-007 | Support output option for generated file location | MUST | TRK-core_mdx_generator |
| REQ-CORE-008 | Report generation progress per language to console | SHOULD | TRK-core_router_plugin |
| REQ-CORE-009 | Cache extraction output, skip unchanged sources | SHOULD | TRK-core_router_plugin |
| REQ-CORE-010 | Support watch: true for dev server rebuild | SHOULD | TRK-core_router_plugin |
| REQ-CORE-011 | Timeout subprocesses (default 60s, configurable) | MUST | TRK-core_router_plugin |
| REQ-CORE-012 | Handle preview command gracefully (skip generation) | MUST | TRK-core_router_plugin |

## HANDLER - Per-Language Handlers

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-PY-001 | Python handler: extract docstrings via Griffe CLI subprocess | MUST | TRK-handler_python |
| REQ-PY-002 | Python handler: support entryPoints as module paths | MUST | TRK-handler_python |
| REQ-TS-001 | TypeScript handler: use TypeDoc via JS library (not subprocess) | MUST | TRK-handler_typescript |
| REQ-TS-002 | TypeScript handler: accept tsconfig path option | MUST | TRK-handler_typescript |
| REQ-RS-001 | Rust handler: parse cargo +nightly rustdoc JSON output | MUST | TRK-handler_rust |
| REQ-RS-002 | Rust handler: accept cratePath option | MUST | TRK-handler_rust |
| REQ-R-001 | R handler: run Rscript extract.R, parse JSON output | MUST | TRK-handler_r |
| REQ-R-002 | R handler: accept entryPoints pointing to .R files | MUST | TRK-handler_r |
| REQ-JL-001 | Julia handler: run julia extract.jl, parse JSON output | MUST | TRK-handler_julia |
| REQ-JL-002 | Julia handler: accept entryPoints option | MUST | TRK-handler_julia |
| REQ-CS-001 | C# handler: parse .NET XML documentation files | MUST | TRK-handler_csharp |
| REQ-CS-002 | C# handler: accept projectPath option | MUST | TRK-handler_csharp |
| REQ-GO-001 | Go handler: run gomarkdoc --output json, parse output | MUST | TRK-handler_go |
| REQ-GO-002 | Go handler: accept modulePath option | MUST | TRK-handler_go |
| REQ-HDL-001 | All handlers implement Handler interface contract | MUST | TRK-tests |
| REQ-HDL-002 | All handlers handle empty source gracefully (no crash) | MUST | TRK-tests |
| REQ-HDL-003 | All handlers report meaningful errors on failure | MUST | TRK-tests |

## QA - Quality Assurance

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-QA-001 | Full test suite must achieve >90 percent line coverage | MUST | TRK-tests |
| REQ-QA-002 | TypeScript strict mode, zero errors | MUST | TRK-tests |
| REQ-QA-003 | ESLint passes with zero warnings in CI | MUST | TRK-tests |
| REQ-QA-004 | Prettier formatting passes in CI | MUST | TRK-tests |
| REQ-QA-005 | Each handler must have contract validation tests | MUST | TRK-tests |
| REQ-QA-006 | Each handler must have golden fixture tests | MUST | TRK-tests |
| REQ-QA-007 | Playwright E2E tests for rendered MDX pages | SHOULD | TRK-tests |
| REQ-QA-008 | Bundle size must not exceed 50KB (core only) | SHOULD | TRK-ci_cd |

## CI/CD - Continuous Integration and Deployment

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-CI-001 | CI runs lint + type-check + test + build on every PR | MUST | TRK-ci_cd |
| REQ-CI-002 | CI fails if coverage drops below 90 percent | MUST | TRK-ci_cd |
| REQ-CI-003 | CI fails if bundle size exceeds limit | SHOULD | TRK-ci_cd |
| REQ-CI-004 | Release publishes to npm with SLSA Level 3 provenance | MUST | TRK-ci_cd |
| REQ-CI-005 | Release creates GitHub Release with changelog | MUST | TRK-ci_cd |
| REQ-CI-006 | Docs workflow builds and deploys Starlight to GitHub Pages | MUST | TRK-ci_cd |
| REQ-CI-007 | Renovate configured for grouped, auto-merged updates | SHOULD | TRK-ci_cd |

## DOC - Documentation

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-DOC-001 | Self-hosted Starlight documentation site | MUST | TRK-self_docs |
| REQ-DOC-002 | Dogfood polyglot plugin on own TypeScript source | MUST | TRK-self_docs |
| REQ-DOC-003 | Use starlight-links-validator for CI link checks | MUST | TRK-self_docs |
| REQ-DOC-004 | Use starlight-versions for versioned docs | SHOULD | TRK-self_docs |
| REQ-DOC-005 | Include getting started, config reference, handler dev guide | MUST | TRK-self_docs |
| REQ-DOC-006 | LLM-friendly docs via starlight-llms-txt | COULD | TRK-self_docs |
| REQ-DOC-007 | Each repo conductor documents its Starlight migration | MUST | TRK-migrate_* |

## MIG - Repo Migrations

Each migration converts a repo documentation to use starlight-polyglot for generating Starlight-native MDX API docs. Parallel execution via dedicated migration agents.

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-MIG-001 | innovate: Sphinx to Starlight + polyglot (Python-only) | MUST | TRK-migrate_innovate |
| REQ-MIG-002 | voiage: Sphinx to Starlight + polyglot (Python + TS) | MUST | TRK-migrate_voiage |
| REQ-MIG-003 | mars: Create repo + MkDocs to Starlight + polyglot (Go) | MUST | TRK-migrate_mars |
| REQ-MIG-004 | lifecourse: From scratch to Starlight + polyglot (Julia/R/Python) | MUST | TRK-migrate_lifecourse |
| REQ-MIG-005 | Each migrated repo must have its conductor tech-stack.md updated | MUST | TRK-migrate_* |
| REQ-MIG-006 | Each migrated repo must have a starlight_migration track in its conductor | MUST | TRK-migrate_* |
| REQ-MIG-007 | Each migrated repo must configure starlight-links-validator | SHOULD | TRK-migrate_* |
| REQ-MIG-008 | Each migrated repo must dogfood polyglot on its own source | MUST | TRK-migrate_* |

### Migration Repo Cross-Reference

| Repo | Path | Languages | Handler Reqs | Migration Track | Agent |
|------|------|-----------|--------------|-----------------|-------|
| innovate | /Users/doughnut/GitHub/innovate | Python | REQ-PY-001, REQ-PY-002 | TRK-migrate_innovate | agent_innovate |
| voiage | /Users/doughnut/GitHub/voiage | Python, TypeScript | REQ-PY-*, REQ-TS-* | TRK-migrate_voiage | agent_voiage |
| mars | /Users/doughnut/GitHub/mars | Go | REQ-GO-001, REQ-GO-002 | TRK-migrate_mars | agent_mars |
| lifecourse | /Users/doughnut/GitHub/lifecourse | Julia, R, Python | REQ-JL-*, REQ-R-*, REQ-PY-* | TRK-migrate_lifecourse | agent_lifecourse |

### Migration Requirements Traceability

Each migration agent must ensure its repo satisfies:

1. astro.config.mjs - Configured with starlight-polyglot plugin and correct language handlers
2. src/content/docs/ - Docs directory with at least an index page and API reference
3. Conductor - conductor/ directory with tracks.md, tech-stack.md, and migration track
4. Package.json - starlight-polyglot as dependency, Starlight + Astro as dev dependencies
5. Dogfooding - Polyglot plugin configured to extract docs from the repo own source code
6. Links validator - starlight-links-validator configured in astro config
7. GitHub Actions - docs.yml workflow to build and deploy to GitHub Pages
8. SOTA audit - Passes the migration-specific SOTA checks (see sota-contract.md section 8)

## SOTA - Recursive Review

| ID | Requirement | Priority | Fulfilled By |
|----|-------------|----------|-------------|
| REQ-SOTA-001 | SOTA software development contract defined and documented | MUST | TRK-sota_contract_review |
| REQ-SOTA-002 | Entire project audited against SOTA contract | MUST | TRK-sota_contract_review |
| REQ-SOTA-003 | Gap improvement tracks auto-generated | SHOULD | TRK-sota_contract_review |
| REQ-SOTA-004 | SOTA audit is repeatable on demand | MUST | TRK-sota_contract_review |
| REQ-SOTA-005 | SOTA audit covers all 4 migrated repos for Starlight deployment | MUST | TRK-migrate_*, TRK-sota_contract_review |
| REQ-SOTA-006 | Migrated repos have Starlight docs built and deployed to GH Pages | MUST | TRK-migrate_* |

See: SOTA Contract ./sota-contract.md | Latest Audit ./audit/report-2026-06-14.json

---

## COULD (Phase 2+)

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PH2-001 | Java handler via javadoc-json | COULD |
| REQ-PH2-002 | Kotlin handler via Dokka | COULD |
| REQ-PH2-003 | C++ handler via Doxygen | COULD |
| REQ-PH2-004 | Swift handler via Jazzy | COULD |
| REQ-PH2-005 | Scala handler via ScalaDoc | COULD |
| REQ-PH2-006 | Ruby handler via YARD | COULD |
| REQ-PH2-007 | Dart handler via dartdoc | COULD |
| REQ-PH2-008 | PHP handler via phpDocumentor | COULD |
| REQ-PH2-009 | Elixir handler via ExDoc | COULD |

---

## WONT (This Cycle)

| ID | Requirement | Reason |
|----|-------------|--------|
| REQ-WNT-001 | Real-time API docs preview in dev server | Complex; defer to watch mode |
| REQ-WNT-002 | Auto-detect languages from file extensions | User must specify handlers explicitly |
| REQ-WNT-003 | Support all 33 languages in product vision | Scoped to 7 Phase 1 handlers only |
| REQ-WNT-004 | Web UI for plugin configuration | CLI-only configuration |

---

## Quick Reference: Requirements to Designs to Tracks

| Category | REQ Range | Track Prefix |
|----------|-----------|-------------|
| Core Plugin | REQ-CORE-001..012 | TRK-core_* |
| Handlers | REQ-PY-*, REQ-TS-*, REQ-RS-*, REQ-R-*, REQ-JL-*, REQ-CS-*, REQ-GO-*, REQ-HDL-* | TRK-handler_* |
| Quality | REQ-QA-001..008 | TRK-tests |
| CI/CD | REQ-CI-001..007 | TRK-ci_cd |
| Documentation | REQ-DOC-001..007 | TRK-self_docs |
| Migrations | REQ-MIG-001..008 | TRK-migrate_* |
| SOTA | REQ-SOTA-001..006 | TRK-sota_contract_review |
| Future | REQ-PH2-001..009 | - |
