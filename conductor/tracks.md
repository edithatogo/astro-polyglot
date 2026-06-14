# Tracks Registry

## Status Legend
- `[ ]` — Pending
- `[~]` — In Progress
- `[x]` — Completed (with commit SHA)

---

## Phase 0: Foundation (Sequential)

- `[x]` [repo_init_20260513](./tracks/repo_init_20260513/) (0843c58) — GitHub repo + infrastructure
- `[x]` [conductor_setup_20260513](./tracks/conductor_setup_20260513/) (0843c58) — Conductor system setup

## Phase 1: Core Plugin (Parallel trio after Phase 0)

- `[x]` [plugin_scaffold_20260513](./tracks/plugin_scaffold_20260513/) (0843c58) — npm package scaffold
- `[x]` [core_mdx_generator_20260513](./tracks/core_mdx_generator_20260513/) (0843c58) — MDX generation engine
- `[x]` [core_router_plugin_20260513](./tracks/core_router_plugin_20260513/) (0843c58) — Router + Starlight hook

## Phase 2: Handlers (All Parallel)

- `[x]` [handler_python_20260513](./tracks/handler_python_20260513/) (0843c58) — Python handler (Griffe)
- `[x]` [handler_typescript_20260513](./tracks/handler_typescript_20260513/) (0843c58) — TypeScript handler (TypeDoc)
- `[x]` [handler_rust_20260513](./tracks/handler_rust_20260513/) (0843c58) — Rust handler (rustdoc)
- `[x]` [handler_r_20260513](./tracks/handler_r_20260513/) (0843c58) — R handler (roxygen2)
- `[x]` [handler_julia_20260513](./tracks/handler_julia_20260513/) (0843c58) — Julia handler (Base.Docs)
- `[x]` [handler_csharp_20260513](./tracks/handler_csharp_20260513/) (0843c58) — C# handler (xmldoc)
- `[x]` [handler_go_20260513](./tracks/handler_go_20260513/) (0843c58) — Go handler (gomarkdoc)

## Phase 3: Quality & Release

- `[x]` [ci_cd_20260513](./tracks/ci_cd_20260513/) (0843c58) — CI/CD pipelines
- `[x]` [tests_20260513](./tracks/tests_20260513/) (0843c58) — Comprehensive test suite
- `[x]` [self_docs_20260513](./tracks/self_docs_20260513/) (0843c58) — Self-hosted documentation

## Phase 4: Repo Migrations (All Parallel, Completed)

- `[x]` [migrate_innovate_20260513](./tracks/migrate_innovate_20260513/) — Migrate innovate docs (Sphinx → Starlight) ✅ 58 MDX pages, docs.yml, conductor track
- `[x]` [migrate_voiage_20260513](./tracks/migrate_voiage_20260513/) — Migrate voiage docs (Sphinx → Starlight) ✅ 51 MDX pages, all RST converted, git pushed
- `[x]` [migrate_mars_20260513](./tracks/migrate_mars_20260513/) — Create mars repo + Starlight docs (Go → Starlight) ✅ Go module, 5 Go files, full conductor, docs.yml, CI
- `[x]` [migrate_lifecourse_20260513](./tracks/migrate_lifecourse_20260513/) — Migrate lifecourse docs (from scratch → Starlight) ✅ 5 MDX pages, astro config, git pushed

## Phase 5: Recursive SOTA

- `[x]` [sota_contract_review_20260513](./tracks/sota_contract_review_20260513/) (ff5823a) — SOTA contract definition + audit (44/44 pass, 100%)

## Conductor Updates

- `[x]` [conductor_update_20260517](./tracks/conductor_update_20260517/) — Updated conductor files: requirements.md deduplicated + MIG cross-refs, design.md deduplicated + new DGN-MIG-001 diagram, index.md comprehensive dashboard, sota-contract.md new Repo Migrations section (R-01 through R-08), sota-audit.mjs now checks migration repos (61/61 pass, 100%).



---

## Phase 6: Phase 2+ Handlers & Scripts (Completed)

- `[x]` [handler_java_20260517](./tracks/handler_java_20260517/) (d3d2219) — Java handler (javadoc-json)
- `[x]` [handler_kotlin_20260517](./tracks/handler_kotlin_20260517/) (d3d2219) — Kotlin handler (Dokka)
- `[x]` [handler_cpp_20260517](./tracks/handler_cpp_20260517/) (d3d2219) — C++ handler (Doxygen XML)
- `[x]` [handler_swift_20260517](./tracks/handler_swift_20260517/) (d3d2219) — Swift handler (DocC)
- `[x]` [handler_stata_20260517](./tracks/handler_stata_20260517/) (d3d2219) — Stata handler (help system)
- `[x]` [handler_sas_20260517](./tracks/handler_sas_20260517/) (d3d2219) — SAS handler (documentation macros)
- `[x]` [handler_scala_20260517](./tracks/handler_scala_20260517/) (d3d2219) — Scala handler (Scaladoc)
- `[x]` [handler_ruby_20260517](./tracks/handler_ruby_20260517/) (d3d2219) — Ruby handler (YARD)
- `[x]` [handler_dart_20260517](./tracks/handler_dart_20260517/) (d3d2219) — Dart handler (dartdoc)
- `[x]` [handler_php_20260517](./tracks/handler_php_20260517/) (d3d2219) — PHP handler (phpDocumentor)
- `[x]` [handler_elixir_20260517](./tracks/handler_elixir_20260517/) (d3d2219) — Elixir handler (ExDoc)
- `[x]` [extraction_scripts_20260517](./tracks/extraction_scripts_20260517/) (d3d2219) — Extraction scripts for Rust, TypeScript, Go
- `[x]` [extraction_scripts_2_20260517](./tracks/extraction_scripts_2_20260517/) (d3d2219) — Extraction scripts for Stata, SAS, Scala, Ruby, Dart, PHP, Elixir

---

## Cross-Reference

| Track ID | Phase | Priority | Depends On | Fulfills |
|----------|-------|----------|------------|----------|
| repo_init_20260513 | 0 | must | — | REQ-CORE-001 |
| conductor_setup_20260513 | 0 | must | repo_init_20260513 | REQ-CORE-001, REQ-SOTA-001 |
| plugin_scaffold_20260513 | 1 | must | conductor_setup_20260513 | REQ-CORE-001 |
| core_mdx_generator_20260513 | 1 | must | plugin_scaffold_20260513 | REQ-CORE-004, REQ-CORE-005, REQ-CORE-007 |
| core_router_plugin_20260513 | 1 | must | plugin_scaffold_20260513 | REQ-CORE-002, REQ-CORE-003, REQ-CORE-006, REQ-CORE-008..012 |
| handler_python_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-PY-001, REQ-PY-002 |
| handler_typescript_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-TS-001, REQ-TS-002 |
| handler_rust_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-RS-001, REQ-RS-002 |
| handler_r_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-R-001, REQ-R-002 |
| handler_julia_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-JL-001, REQ-JL-002 |
| handler_csharp_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-CS-001, REQ-CS-002 |
| handler_go_20260513 | 2 | must | core_mdx_generator_20260513, core_router_plugin_20260513 | REQ-GO-001, REQ-GO-002 |
| ci_cd_20260513 | 3 | must | All Phase 2 handlers | REQ-CI-001..007 |
| tests_20260513 | 3 | must | All Phase 2 handlers | REQ-QA-001..008, REQ-HDL-001..003 |
| self_docs_20260513 | 3 | must | ci_cd_20260513 | REQ-DOC-001..007 |
| migrate_innovate_20260513 | 4 | must | self_docs_20260513 | REQ-MIG-001, REQ-MIG-005, REQ-MIG-006 |
| migrate_voiage_20260513 | 4 | must | self_docs_20260513 | REQ-MIG-002, REQ-MIG-005, REQ-MIG-006 |
| migrate_mars_20260513 | 4 | must | self_docs_20260513 | REQ-MIG-003, REQ-MIG-005, REQ-MIG-006 |
| migrate_lifecourse_20260513 | 4 | must | self_docs_20260513 | REQ-MIG-004, REQ-MIG-005, REQ-MIG-006 |
| sota_contract_review_20260513 | 5 | should | All Phase 4 migrations | REQ-SOTA-001..004 |
## Phase 7: Bleeding-Edge Testing (Completed)

- `[x]` [testing_bleeding_edge_20260519](./tracks/testing_bleeding_edge_20260519/) (d3d2219) — Property, mutation, fuzz, security, edge-case tests
