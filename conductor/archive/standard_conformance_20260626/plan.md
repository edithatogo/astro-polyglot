# Plan: standard_conformance_20260626

## Phase 1: Test Infrastructure (TDD) ✅
- [x] Create `tests/fixtures/` directory structure with per-language subdirectories (f4eedcd)
- [x] Write `tests/helpers/conformance.ts` with `describeConformance(language, standard, fixtures)` helper (f4eedcd)
- [x] Ensure conformance test runner can auto-skip handlers with missing CLI toolchains (f4eedcd)

## Phase 2: Low-Risk Handler Golden Fixtures ✅
- [x] TypeScript, Rust, Go, Java, Kotlin, C#, Swift (e9dc591)
- [x] R, Scala, Ruby, Dart, PHP, Elixir (e9dc591)

## Phase 3: Medium-Risk Handler Golden Fixtures ✅
- [x] Python conformance fixtures (Google-style, NumPy-style, Sphinx reST) (b6d22fe)
- [x] C++ conformance fixtures (Doxygen Javadoc-style + QT-style) (b6d22fe)
- [x] Julia conformance fixtures (Base.Docs introspection) (b6d22fe)

## Phase 4: High-Risk Custom Parser Validation ✅
- [x] Stata conformance fixtures (.sthlp format) (b6d22fe)
- [x] SAS conformance fixtures (macro comment blocks) (b6d22fe)

## Phase 5: Integration & Documentation ✅
- [x] (968350a) Add conformance tests to CI pipeline
- [x] (968350a) Document the `describeConformance` pattern for future Phase 3 handlers
- [x] (968350a) Update README and docs-site to note exact standard variants supported per handler