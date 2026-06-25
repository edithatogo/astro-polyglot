# Specification: Astro 7 Content Loader Migration

## Overview
Migrate the existing `starlight-polyglot` package to a native Astro Integration and Content Loader (`astro-polyglot` / `polyglotLoader`) targeting Astro 7.0+. This eliminates Starlight-specific coupling, leverages Astro's new Rust-powered compiler (Sätteri), and utilizes the Content Layer API for type safety and performance across any Astro theme.

## Analysis of Astro Version Targeting
- **Astro 5 & 6**: While the Content Layer was introduced in Astro 5, supporting older versions would require maintaining legacy loader signatures and compatibility with older Vite/Rollup compilation pipelines.
- **Astro 7 Benefits**: Targeting Astro 7 directly allows us to leverage Vite 8 + Rolldown, the new Rust-powered Sätteri Markdown/MDX compiler, and stable queue-based rendering.
- **Functionality Constraints**: Astro 7's Rust compiler is strictly standards-compliant; invalid HTML in generated docstrings will cause build failures (whereas Astro 5/6 silently bypassed them). Our handlers will need to output clean HTML/MDX.

## Functional Requirements
1. **Theme-Agnostic Integration**:
   - The generated collection output is standard Astro Content Collections data, rendering out-of-the-box in Starlight, standard blog themes, tailwind layouts, or any custom Astro framework (React, Vue, Svelte, Solid, etc.).
2. **Content Loader Interface (`polyglotLoader`)**:
   - Implements Astro's `Loader` API (`name`, `load`, `schema`).
   - Accepts config to define languages, source paths, and parsing exclusions.
   - Runs the existing language handlers (Python, TS, Rust, Go, R, Julia, etc.) asynchronously.
3. **Type-Safe Data Schema**:
   - Defines a standard Zod schema representing the structure of API documents.
   - Exposes metadata such as `version`, `language`, `filePath`, and `symbolType` (class, function, etc.).
4. **Caching and Incremental Builds**:
   - Integrates with Astro's Content Layer caching.
   - Generates a file hash digest of the input source directories; skips execution of external subprocesses if no file changes are detected.
5. **HMR Dev-Time Watch Mode**:
   - Registers directory watchers during development. Changes in source files automatically trigger a hot-reload of the Astro Content Collection without restarting the dev server.
6. **Astro 7 Dev Logger Integration**:
   - Integrates with Astro 7's new JSON logging pipeline to surface parsing or docstring errors in real time to developer terminals or AI assistants.
7. **Source Code Link Resolution**:
   - Resolves symbol definitions to their corresponding source code lines on remote hosts (GitHub/GitLab) based on Git state.
8. **Custom Component & Frontmatter Mapping**:
   - Supports injecting custom frontmatter properties and mapping custom interactive components to render within docstrings.

## Non-Functional Requirements
- **Performance**: Skips process execution on cache hits (<100ms).
- **TypeScript**: Strict type definitions compatible with Astro 7.0+ content types.

## Out of Scope
- Custom UI layout design (handled by user-space or themes like Starlight).
- Automated router file generation (leveraged via Astro dynamic routing or Starlight collections).
