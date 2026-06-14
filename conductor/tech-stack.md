# Technology Stack

## Core Runtime
- **Node.js**: >=22.12.0 (LTS, consistent with starlight-typedoc)
- **pnpm**: >=10.32.1 (workspace monorepo management)
- **TypeScript**: ^5.9.3 (strict mode enabled)

## Plugin Dependencies (peer)
- **@astrojs/starlight**: >=0.39.2
- **astro**: >=6.3.1
- **typedoc**: >=0.28.0 (TypeScript handler)
- **typedoc-plugin-markdown**: >=4.6.0 (TypeScript handler)

## Core Package Dependencies
- **github-slugger**: ^2.0.0 (same as starlight-typedoc)

## Build & Compilation
- **tsup**: Bundle TypeScript → ESM + CJS dual output
- **tsx**: TypeScript execution for dev scripts

## Quality Gates
| Tool | Purpose | Standards |
|------|---------|-----------|
| **ESLint (flat config)** | Linting | Strict mode, zero warnings |
| **Prettier** | Formatting | Consistent code style |
| **Vitest** | Unit testing | >90% coverage |
| **Playwright** | E2E testing | Full Starlight site integration |
| **size-limit** | Bundle size | <50KB total |
| **husky + lint-staged** | Pre-commit | Format + lint before commit |

## Testing
- **Vitest**: Handler unit tests, contract validation tests, golden fixture tests
- **Playwright**: Full page rendering tests in Chromium
- **fixtures/**: Known-good source trees per language for handler validation
- **golden/**: Expected MDX output snapshots per handler

## CI/CD
- **GitHub Actions**: ci.yml, docs.yml, release.yml
- **Renovate**: Automated dependency updates (grouped, auto-merge patch)
- **changesets**: Version management + changelog automation

## Release
- **npm**: With SLSA Level 3 provenance attestation
- **GitHub Releases**: Automatic via changesets
- **License**: MIT

## Documentation
- **Starlight**: Self-hosted docs site (dogfooding the plugin)
- **starlight-versions**: Versioned documentation
- **starlight-links-validator**: Broken link checks in CI
- **starlight-llms-txt**: LLM-friendly documentation
- **Pagefind**: Search (Starlight default)

## Handler Extraction Tools
| Language | Tool | Install | Invocation |
|----------|------|---------|------------|
| Python | Griffe | `pip install griffe` | `python -m griffe dump --format json` |
| TypeScript | TypeDoc | npm (peer dep) | JS library call |
| Rust | rustdoc | Rust nightly | `cargo +nightly rustdoc --output-format json` |
| R | roxygen2 | `install.packages("roxygen2")` | `Rscript extract.R` |
| Julia | Base.Docs | Built-in | `julia extract.jl` |
| C# (.NET) | DocFX/xmldoc | NuGet | `dotnet build` + XML parse |
| Go | gomarkdoc | `go install` | `gomarkdoc --output json ./...` |

## Version Pinning (as of May 2026)
| Package | Version | Source |
|---------|---------|--------|
| @astrojs/starlight | 0.39.2 | npm |
| astro | 6.3.1 | npm |
| starlight-typedoc | 0.22.0 | npm |
| starlight-links-validator | 0.24.0 | npm |
| typedoc | 0.28.0+ | npm |
| griffe | latest | PyPI |
| TypeScript | 5.9.3 | npm |
| pnpm | 10.32.1 | npm |
| Node.js | 22.12.0+ | node |
