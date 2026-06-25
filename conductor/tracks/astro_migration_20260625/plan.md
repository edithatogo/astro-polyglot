# Plan: astro_migration_20260625

## Phase 1: Foundation & Dependencies (TDD)
- [ ] Task: Set up Astro 7 package configuration
    - [ ] Update `package.json` to require Astro ^7.0.0 and Vite ^8.0.0 as peer dependencies
    - [ ] Add `@astrojs/markdown-remark` and other necessary dev dependencies
    - [ ] Configure `tsconfig.json` for strict TypeScript type checking against Astro 7 signatures
- [ ] Task: Define Loader and Config Types
    - [ ] Write interfaces for `PolyglotLoaderOptions` and metadata outputs in a test file
    - [ ] Define the schema structure using Zod
    - [ ] Implement empty placeholders for `polyglotLoader` and the Astro Integration

## Phase 2: Core Loader Implementation (TDD)
- [ ] Task: Integrate Language Handlers with Astro Content Layer
    - [ ] Write tests validating that the loader resolves existing Griffe/rustdoc/TypeDoc handlers
    - [ ] Implement the `load` method to invoke external subprocesses asynchronously
    - [ ] Implement `store.set()` mapping to populate Astro's content database with parsed symbols
- [ ] Task: Markdown Output Validation (Sätteri Compatibility)
    - [ ] Write tests asserting that the MDX output contains strict, valid HTML tags to satisfy Astro 7's Rust compiler
    - [ ] Implement a clean-up handler to strip or fix invalid HTML tags from docstrings before rendering

## Phase 3: Incremental Caching & Watch Mode (TDD)
- [ ] Task: Content Layer Hashing & Caching
    - [ ] Write tests for directory caching (asserting compilation skips when files are unchanged)
    - [ ] Implement hashing logic based on source file contents to build a unique digest
- [ ] Task: Dev Watch Mode Integration
    - [ ] Write tests simulating source file updates in development mode
    - [ ] Implement FS directory watchers (`chokidar` or Astro's internal watchers) to trigger loader updates automatically on symbol changes

## Phase 4: Developer Diagnostics & Advanced Features (TDD)
- [ ] Task: Astro 7 Dev Logger Integration
    - [ ] Write tests verifying error reporting to Astro's JSON logging framework
    - [ ] Implement structured error handling to output formatting and compilation diagnostics directly to the Astro console
- [ ] Task: Source Link Resolution
    - [ ] Write tests validating git-based remote symbol mapping (e.g. GitHub/GitLab lines)
    - [ ] Implement line and file Git-resolve logic inside the loader

## Phase 5: Verification & Integration Tests
- [ ] Task: Monorepo Integration Testing
    - [ ] Set up a sample multi-language Astro 7 site (using standard Astro pages/layouts) to consume the loader
    - [ ] Execute a full production build using Sätteri and Vite 8/Rolldown to verify zero compilation errors
    - [ ] Verify Vitest unit testing coverage exceeds the 90% threshold for all migrated packages
