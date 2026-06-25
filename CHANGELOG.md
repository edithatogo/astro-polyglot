# Changelog

## 0.1.0

### Initial scaffold

This is the initial scaffold of the **astro-polyglot** monorepo. The project is in active development and not yet ready for production use.

#### Features

- **Plugin architecture**: Core Starlight plugin with `config:setup` hook that orchestrates language handlers.
- **Handler contract**: Well-defined `Handler` interface for implementing documentation generators for any programming language.
- **MDX generation pipeline**: Shared `transformToMDX()` and `writeMDXPages()` functions that produce Starlight-native MDX from structured AST data.
- **Plugin entry points**: `polyglot()` default export for standard usage and `createPolyglotPlugin()` for advanced multi-plugin setups.
- **Sidebar management**: Placeholder sidebar group system that allows other plugins to reference generated documentation.

#### Language Handlers

- **Python**: Handler using docstring extraction via a companion Python script (`scripts/python_extract.py`).
- **TypeScript, Rust, R, Julia, C#, Go**: Handler stubs registered in the router, ready for implementation.

#### Infrastructure

- **Monorepo setup**: pnpm workspace with `packages/astro-polyglot` as the main package.
- **Build system**: tsup for ESM + CJS dual output with TypeScript declarations.
- **Changesets**: Configured for automated versioning and changelog generation.
- **Starlight docs site**: Scaffolded Astro site under `docs/astro-site/` for the project's own documentation.
