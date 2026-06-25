# Plan: tooling_modernization_20260625

## Phase 1: PNPM Catalogs Configuration
- [x] Task: Set up Catalogs in Workspace
    - [x] Add `catalog:` block to `pnpm-workspace.yaml` with vitest, typescript, tsup, etc.
    - [x] Update all `package.json` dependency versions to `catalog:` references
    - [x] Run `pnpm install` and verify lockfile updates

## Phase 2: Biome Integration
- [x] Task: Configure Biome and Replace Legacy Linters
    - [x] Install `@biomejs/biome` as a workspace dev dependency
    - [x] Create `biome.json` with strict rules
    - [x] Delete `.eslintrc`, `.prettierrc`, and remove eslint/prettier devDependencies
    - [x] Update `package.json` scripts to run `biome check` and `biome format`

## Phase 3: Rolldown Validation
- [x] Task: Align Bundling configuration
    - [x] Verify `tsup` configuration produces fully tree-shakable ESM modules
    - [x] Perform a test build and verify zero module warnings under Vite 8
