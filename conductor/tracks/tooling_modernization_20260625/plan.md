# Plan: tooling_modernization_20260625

## Phase 1: PNPM Catalogs Configuration
- [ ] Task: Set up Catalogs in Workspace
    - [ ] Add `catalog:` block to `pnpm-workspace.yaml` with vitest, typescript, tsup, etc.
    - [ ] Update all `package.json` dependency versions to `catalog:` references
    - [ ] Run `pnpm install` and verify lockfile updates

## Phase 2: Biome Integration
- [ ] Task: Configure Biome and Replace Legacy Linters
    - [ ] Install `@biomejs/biome` as a workspace dev dependency
    - [ ] Create `biome.json` with strict rules
    - [ ] Delete `.eslintrc`, `.prettierrc`, and remove eslint/prettier devDependencies
    - [ ] Update `package.json` scripts to run `biome check` and `biome format`

## Phase 3: Rolldown Validation
- [ ] Task: Align Bundling configuration
    - [ ] Verify `tsup` configuration produces fully tree-shakable ESM modules
    - [ ] Perform a test build and verify zero module warnings under Vite 8
