# Plan: astro_migration_20260625

## Phase 1: Foundation & Dependencies (TDD)
- [x] Task: Set up Astro 7 package configuration
    - [x] Update `package.json` to require Astro ^7.0.0 and Vite ^8.0.0 as peer dependencies
    - [x] Add `@astrojs/markdown-remark` and other necessary dev dependencies
    - [x] Configure `tsconfig.json` for strict TypeScript type checking against Astro 7 signatures
- [x] Task: Define Loader and Config Types
    - [x] Write interfaces for `PolyglotLoaderOptions` and metadata outputs in a test file
    - [x] Define the schema structure using Zod
    - [x] Implement empty placeholders for `polyglotLoader` and the Astro Integration

## Phase 2: Core Loader Implementation (TDD)
- [x] Task: Integrate Language Handlers with Astro Content Layer
    - [x] Write tests validating that the loader resolves existing Griffe/rustdoc/TypeDoc handlers
    - [x] Implement the `load` method to invoke external subprocesses asynchronously
    - [x] Implement `store.set()` mapping to populate Astro's content database with parsed symbols
- [x] Task: Markdown Output Validation (Sätteri Compatibility)
    - [x] Write tests asserting that the MDX output contains strict, valid HTML tags to satisfy Astro 7's Rust compiler
    - [x] Implement a clean-up handler to strip or fix invalid HTML tags from docstrings before rendering

## Phase 3: Incremental Caching & Watch Mode (TDD)
- [x] Task: Content Layer Hashing & Caching
    - [x] Write tests for directory caching (asserting compilation skips when files are unchanged)
    - [x] Implement hashing logic based on source file contents to build a unique digest
- [x] Task: Dev Watch Mode Integration
    - [x] Write tests simulating source file updates in development mode
    - [x] Implement FS directory watchers (`chokidar` or Astro's internal watchers) to trigger loader updates automatically on symbol changes

## Phase 4: Developer Diagnostics & Advanced Features (TDD)
- [x] Task: Astro 7 Dev Logger Integration
    - [x] Write tests verifying error reporting to Astro's JSON logging framework
    - [x] Implement structured error handling to output formatting and compilation diagnostics directly to the Astro console
- [x] Task: Source Link Resolution
    - [x] Write tests validating git-based remote symbol mapping (e.g. GitHub/GitLab lines)
    - [x] Implement line and file Git-resolve logic inside the loader

## Phase 5: Verification & Integration Tests
- [x] Task: Monorepo Integration Testing
    - [x] Set up a sample multi-language Astro 7 site (using standard Astro pages/layouts) to consume the loader
    - [x] Execute a full production build using Sätteri and Vite 8/Rolldown to verify zero compilation errors
    - [x] Verify Vitest unit testing coverage exceeds the 90% threshold for all migrated packages
