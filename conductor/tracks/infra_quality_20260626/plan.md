# Plan: infra_quality_20260626

## Execution Lifecycle
Every task: implement → `git commit -m "type(area): description"` → `conductor-review` → apply fixes → `pnpm build && pnpm test` → verify CI green → `git push origin main` → next task

## Phase 1: Shared Utility Modules (parallel) ✅
- [x] Create `core/doxygen-utils.ts` — Doxyfile generation + XML-to-AST transform
- [x] Create `core/dotnet-xml-utils.ts` — .NET XML doc parsing + project detection
- [x] Create `core/natural-docs-fallback.ts` — language-agnostic comment parser
- [x] GIT: commit "feat(core): add shared doxygen-utils, dotnet-xml-utils, natural-docs-fallback"
- [x] REVIEW + CI + PUSH

## Phase 2: Architecture Improvements (parallel)
- [x] Implement parallel handler execution (Promise.all with concurrency limit)
- [x] Implement graceful error recovery (per-handler try/catch, failFast option)
- [x] Implement content-hash caching layer at router level
- [x] Promote polyglotLoader as primary Astro 7 API export
- [x] GIT: commit "feat(core): parallel execution, error recovery, caching, content loader API" (b707f8e)
- [x] REVIEW + CI + PUSH

## Phase 3: Handler Scaffold & Automation (parallel)
- [x] Create `scripts/generate-handler.mjs` — handler scaffold generator
- [x] Create `scripts/generate-conformance.mjs` — conformance test generator
- [x] Create `scripts/register-handler.mjs` — auto-registration in router.ts
- [x] GIT: commit "feat(scripts): add handler scaffold, conformance, and registration generators" (b7c3345)
- [x] REVIEW + CI + PUSH

## Phase 4: CI/CD Pipeline Improvements
- [x] Add `test:conformance` script to package.json (already existed)
- [x] Add conformance CI gate to `.github/workflows/ci.yml` (already existed)
- [x] Add benchmark tracking to CI (`pnpm bench`) — added bench job to ci.yml
- [x] Create Dockerfile for containerized handler testing
- [x] Add `test:e2e` multi-language Astro site (already existed)
- [x] GIT: commit "ci: add conformance gate, benchmark tracking, containerized testing, e2e" (fb173f8)
- [x] REVIEW + CI + PUSH

## Phase 5: Code Quality & TypeScript Strictness
- [x] Enable `noUncheckedIndexedAccess` in tsconfig (already enabled)
- [x] Add `noUnusedLocals`, `noUnusedParameters` with error level — fixed 3 unused vars in csharp/python/sas
- [x] Enforce per-handler coverage thresholds in vitest.config.ts (perFile: true)
- [x] Create handler maturity badge generator
- [x] GIT: commit "quality: strict TS checks, per-handler coverage thresholds, maturity badges"
- [ ] REVIEW + CI + PUSH

## Phase 6: Repo Structure & Governance
- [ ] Reorganize handlers into tiered directory structure
- [ ] Create `docs/adr/` directory with ADR template
- [ ] Create OWNER.md for each existing handler
- [ ] Create PR template for new handlers (`.github/PULL_REQUEST_TEMPLATE/handler.md`)
- [ ] Document handler lifecycle in CONTRIBUTING.md
- [ ] GIT: commit "reorg: tiered handler directories, ADRs, ownership, PR templates"
- [ ] REVIEW + CI + PUSH

## Phase 7: Documentation & Final Integration
- [ ] Update README with handler lifecycle, ownership, maturity badges
- [ ] Update docs-site with architecture documentation
- [ ] Add Architecture Decision Records for key decisions
- [ ] Run full test suite: build + lint + typecheck + test + conformance + coverage
- [ ] GIT: commit "docs: architecture documentation, ADRs, handler lifecycle docs"
- [ ] REVIEW + CI + PUSH