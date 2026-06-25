# Specification: Tooling Modernization (Biome, PNPM Catalogs, Rolldown)

## Overview
Update the monorepo tooling configuration to utilize bleeding-edge ecosystem enhancements. Replace ESLint and Prettier with Biome, configure PNPM v10 Catalogs, and align build outputs for Rolldown compatibility.

## Requirements
1. **PNPM Catalogs**:
   - Define shared dependencies in `pnpm-workspace.yaml`.
   - Update `package.json` files to use `catalog:`.
2. **Biome Linting & Formatting**:
   - Install `@biomejs/biome` globally in the workspace.
   - Configure `biome.json` with strict rule sets.
   - Remove legacy `.eslintrc`, `.prettierrc`, and clean up package configurations.
3. **Rolldown Alignment**:
   - Verify that bundler setups (`tsup`) output strict tree-shakable code suitable for Rolldown (Vite 8).
