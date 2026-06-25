# astro-polyglot Conductor System

> Central orchestration hub for the astro-polyglot plugin and repo migrations.

---

## Dashboard

| Status | Area | Key Document |
|--------|------|-------------|
| :white_check_mark: | Requirements (MoSCoW) | [requirements.md](./requirements.md) |
| :white_check_mark: | Design Architecture | [design.md](./design.md) |
| :white_check_mark: | SOTA Contract | [sota-contract.md](./sota-contract.md) |
| :white_check_mark: | Tracks Registry | [tracks.md](./tracks.md) |
| :white_check_mark: | Latest SOTA Audit | [audit/report-2026-06-14.json](./audit/report-2026-06-14.json) |
| :white_check_mark: | Product Definition | [product.md](./product.md) |
| :white_check_mark: | Tech Stack | [tech-stack.md](./tech-stack.md) |
| :white_check_mark: | Workflow | [workflow.md](./workflow.md) |

---

## Quick Navigation

### Definition
- **[Product Definition](./product.md)** - Vision, mission, target users, capabilities
- **[Product Guidelines](./product-guidelines.md)** - Brand, language, code style
- **[Tech Stack](./tech-stack.md)** - Runtime, dependencies, tools, version pins
- **[Requirements (MoSCoW)](./requirements.md)** - All requirements organized by category with cross-references
- **[Design Architecture](./design.md)** - Mermaid diagrams with REQ/TRK traceability

### Quality & SOTA
- **[SOTA Software Development Contract](./sota-contract.md)** - Measurable pass/fail criteria (8 categories)
- **[Latest Audit Report](./audit/report-2026-06-14.json)** - 61/61 checks passing, 100%
- **[Audit Script](./scripts/sota-audit.mjs)** - `node conductor/scripts/sota-audit.mjs`
- **[Audit Evidence](./audit/evidence/)** - Manual check evidence

### Workflow
- **[Workflow](./workflow.md)** - Principles, task workflow, quality gates, commit convention
- **[Code Style Guides](./code_styleguides/)** - Language-specific style references

### Project Management
- **[Tracks Registry](./tracks.md)** - All tracks with completion status, dependencies, and cross-references
- **[Tracks Directory](./tracks/)** - Individual track folders with detailed records

---

## Repo Migration Status

| Repo | Path | Languages | Migration Track | Status | Agent |
|------|------|-----------|-----------------|--------|-------|
| **innovate** | `../innovate` | Python | TRK-migrate_innovate | :white_check_mark: Complete | agent_innovate |
| **voiage** | `../voiage` | Python, TypeScript | TRK-migrate_voiage | :white_check_mark: Complete | agent_voiage |
| **mars** | `../mars` | Go | TRK-migrate_mars | :white_check_mark: Complete | agent_mars |
| **lifecourse** | `../lifecourse` | Julia, R, Python | TRK-migrate_lifecourse | :white_check_mark: Complete | agent_lifecourse |

*See [requirements.md MIG section](./requirements.md#MIG---Repo-Migrations) for detailed migration requirements.*

---

## SOTA Compliance Summary

| Category | Checks | Status |
|----------|--------|--------|
| Code Quality | CQ-01 through CQ-06 | :white_check_mark: All passing |
| Testing | T-01 through T-05 | :white_check_mark: All passing |
| Documentation | D-01 through D-07 | :white_check_mark: All passing |
| CI/CD | CI-01 through CI-11 | :white_check_mark: All passing |
| Security | S-01 through S-03 | :white_check_mark: All passing |
| Governance | G-01 through G-13 | :white_check_mark: All passing |
| Performance | P-01 through P-03 | :white_check_mark: All passing |
| Repo Migrations | R-01 through R-08 | :white_check_mark: All passing |

---

## Cross-Reference Legend

- `REQ-{CATEGORY}-{NUM}` — Requirement ID (see [requirements.md](./requirements.md))
- `DGN-{CATEGORY}-{NUM}` — Design Diagram Node (see [design.md](./design.md))
- `TRK-{NAME}` — Track ID (see [tracks.md](./tracks.md))
- `CQ-{NUM}`, `T-{NUM}`, `D-{NUM}`, etc. — SOTA Contract Check ID (see [sota-contract.md](./sota-contract.md))

---

*Last updated: 2026-05-17 | Conductor v2.0*
