# Plan: standard_conformance_20260626

## Phase 1: Test Infrastructure (TDD)
- [ ] Create `tests/fixtures/` directory structure with per-language subdirectories
- [ ] Write `tests/helpers/conformance.ts` with `describeConformance(language, standard, fixtures)` helper
- [ ] Ensure conformance test runner can auto-skip handlers with missing CLI toolchains

## Phase 2: Low-Risk Handler Golden Fixtures (all share reference impl toolchains)
- [ ] TypeScript conformance fixtures (JSDoc standard)
- [ ] Rust conformance fixtures (Rustdoc CommonMark)
- [ ] Go conformance fixtures (Go comment convention)
- [ ] Java conformance fixtures (Javadoc standard)
- [ ] Kotlin conformance fixtures (KDoc)
- [ ] C# conformance fixtures (.NET XML)
- [ ] Swift conformance fixtures (DocC Markdown)
- [ ] R conformance fixtures (roxygen2)
- [ ] Scala conformance fixtures (Scaladoc)
- [ ] Ruby conformance fixtures (YARD)
- [ ] Dart conformance fixtures (dartdoc)
- [ ] PHP conformance fixtures (PHPDoc)
- [ ] Elixir conformance fixtures (ExDoc)

## Phase 3: Medium-Risk Handler Golden Fixtures (multi-standard or introspection-based)
- [ ] Python conformance fixtures (Google-style, NumPy-style, Sphinx reST)
- [ ] C++ conformance fixtures (Doxygen Javadoc-style + QT-style)
- [ ] Julia conformance fixtures (Base.Docs introspection)
- [ ] Document which standard variants each handler supports in their spec.md

## Phase 4: High-Risk Custom Parser Standard Validation
- [ ] Stata conformance fixtures (.sthlp format)
- [ ] SAS conformance fixtures (macro comment blocks)
- [ ] Achievement: Stata + SAS custom parser coverage >=90% on standard variants

## Phase 5: Integration & Documentation
- [ ] Add conformance tests to CI pipeline
- [ ] Document the `describeConformance` pattern for future Phase 3 handlers
- [ ] Update README and docs-site to note exact standard variants supported per handler