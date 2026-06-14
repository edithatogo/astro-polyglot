# SOTA Software Development Contract

## Purpose
This document defines the State-of-the-Art (SOTA) criteria that the starlight-polyglot project must meet. Every criterion is measurable with a clear pass/fail definition. Automated checks are preferred; manual checks are documented where automation is impossible.

## Categories

### 1. Code Quality

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| CQ-01 | TypeScript strict mode enabled with zero errors | `tsc --noEmit` passes with strict: true | `tsc --noEmit --strict` |
| CQ-02 | ESLint flat config with zero warnings | `eslint .` returns exit code 0 | `eslint . --max-warnings=0` |
| CQ-03 | Prettier formatting compliance | `prettier --check .` passes | `prettier --check .` |
| CQ-04 | No `any` types in production code | `grep -r '': any'' src/` returns no matches | Code search |
| CQ-05 | Named exports only (no default exports) | No `export default` in `core/` or `handlers/` | Code search |
| CQ-06 | All public APIs have JSDoc comments | Every exported function has JSDoc | Manual review |

### 2. Testing

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| T-01 | Line coverage >= 90% | Vitest coverage report >= 90% across lines | `vitest run --coverage` |
| T-02 | Handler contract tests exist for all 7 handlers | `tests/handler-contract.test.ts` covers all handlers | File existence + review |
| T-03 | Core unit tests exist | `tests/mdx-generator.test.ts`, `tests/router.test.ts`, `tests/plugin.test.ts` exist | File existence |
| T-04 | Tests run without timeout errors | Full test suite completes in <30s | `vitest run` |
| T-05 | Test files follow naming convention | All test files are `*.test.ts` | File glob |

### 3. Documentation

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| D-01 | Self-hosted Starlight docs site exists | `docs/astro-site/` has `astro.config.mjs` | File existence |
| D-02 | Getting started guide exists | `docs/astro-site/src/content/docs/getting-started.mdx` | File existence |
| D-03 | Configuration reference exists | `docs/astro-site/src/content/docs/configuration.mdx` | File existence |
| D-04 | Handler development guide exists | `docs/astro-site/src/content/docs/handler-development.mdx` | File existence |
| D-05 | starlight-links-validator configured | Plugin present in `astro.config.mjs` | File content check |
| D-06 | Dogfooding: polyglot used on own TS source | Config has polyglot plugin for typescript handler | File content check |
| D-07 | README.md has badges and quick start | Badges for npm, CI, license present | Manual review |

### 4. CI/CD

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| CI-01 | ci.yml runs lint, type-check, test, build | Workflow has all 4 jobs | Workflow file check |
| CI-02 | ci.yml fails on coverage < 90% | Coverage threshold configured | Workflow content check |
| CI-03 | docs.yml builds and deploys to Pages | Workflow exists with deploy-pages step | Workflow file existence |
| CI-04 | release.yml publishes to npm with SLSA provenance | Workflow has attest-build-provenance step | Workflow content check |
| CI-05 | Renovate config exists | `renovate.json` present | File existence |
| CI-06 | Changesets config exists | `.changeset/config.json` present | File existence |

### 5. Security

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| S-01 | No hardcoded secrets in codebase | No API keys, tokens, passwords in source | `grep` for common patterns |
| S-02 | npm provenance enabled for publish | `release.yml` has provenance attestation | Workflow check |
| S-03 | Dependabot or Renovate configured for security updates | `renovate.json` has security config | File content check |
| S-04 | No vulnerable dependencies | `npm audit` returns 0 critical vulnerabilities | `npm audit` |

### 6. Performance

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| P-01 | Bundle size < 50KB | `size-limit` passes | `size-limit --json` |
| P-02 | Subprocess timeout configured (60s default) | Handler code has timeout option | Code search |
| P-03 | No synchronous filesystem reads in hot path | No `fs.readFileSync` in handlers | Code search |

### 7. Project Governance

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| G-01 | CODEOWNERS file exists | `.github/CODEOWNERS` present | File existence |
| G-02 | CONTRIBUTING.md exists | File present | File existence |
| G-03 | Issue templates exist for bug reports and features | Templates in `.github/ISSUE_TEMPLATE/` | File existence check |
| G-04 | SECURITY.md exists | File present | File existence |
| G-05 | CHANGELOG.md exists | File present | File existence |
| G-06 | LICENSE file present (MIT) | File present | File existence |
| G-07 | Conventional commits enforced | Commit messages follow conventional format | Manual review |
| G-08 | Conductor system active with tracks | `conductor/tracks.md` present and populated | File existence + content |
| G-09 | MoSCoW requirements documented | `conductor/requirements.md` present | File existence |
| G-10 | Design documentation with Mermaid diagrams | `conductor/design.md` present | File existence |

### 8. Repo Migrations

| # | Criterion | Pass/Fail | Automated Check |
|---|-----------|-----------|-----------------|
| R-01 | innovate has Starlight docs deployed to GH Pages | `docs.yml` exists in innovate repo, GH Pages URL accessible | `fex` check + URL probe |
| R-02 | voiage has Starlight docs deployed to GH Pages | `docs.yml` exists in voiage repo, GH Pages URL accessible | `fex` check + URL probe |
| R-03 | mars has Starlight docs deployed to GH Pages | `docs.yml` exists in mars repo, GH Pages URL accessible | `fex` check + URL probe |
| R-04 | lifecourse has Starlight docs deployed to GH Pages | `docs.yml` exists in lifecourse repo, GH Pages URL accessible | `fex` check + URL probe |
| R-05 | Each migrated repo has conductor directory with tracks.md | `conductor/tracks.md` exists in each repo | File existence per repo |
| R-06 | Each migrated repo dogfoods polyglot on own source | astro.config.mjs contains polyglot plugin config for repo language(s) | File content check per repo |
| R-07 | Each migrated repo has starlight-links-validator configured | Plugin present in astro.config.mjs | File content check per repo |
| R-08 | All 4 migration tracks marked completed in central tracks.md | `conductor/tracks.md` has `[x]` for all 4 migrate_* tracks | File content check |

**Note:** Automated checks for R-01 through R-04 require git clone access to each repo. The sota-audit.mjs script checks sibling checkouts by default (`../innovate`, `../voiage`, `../mars`, `../lifecourse`) and supports `MIGRATION_REPO_ROOT=/path/to/repos` when the repositories live elsewhere.

---

## Audit Repeatability
This contract is auditable via `node conductor/scripts/sota-audit.mjs`. The script runs all automated checks and produces a JSON report at `conductor/audit/report-<date>.json`. Manual checks are documented in the audit evidence directory.

## Version History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-13 | AI Agent | Initial SOTA contract definition |
| 2.0 | 2026-05-17 | Orchestrator | Added Repo Migrations category (R-01 through R-08) |
