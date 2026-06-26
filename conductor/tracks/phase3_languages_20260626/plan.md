# Plan: phase3_languages_20260626

## Execution Lifecycle
Every Phase follows this cycle:
1. Implement tasks → `git commit -m "feat(phase3): <summary>"`
2. Run `conductor-review` → auto-apply any suggested fixes
3. Run `pnpm build && pnpm test && pnpm test:coverage`
4. Wait for GitHub Actions CI to pass
5. `git push origin main`
6. Proceed to next Phase

## Phase 1: Strategy 2 — Doxygen Pipeline Foundation (parallel)
- [x] `core/doxygen-utils.ts` already existed
- [x] Created **C** handler with conformance fixtures
- [x] Created **Objective-C** handler with conformance fixtures
- [x] Created **Ada / SPARK** handler with conformance fixtures
- [x] Created **Fortran** handler with conformance fixtures
- [x] Created **Pascal / Delphi** handler with conformance fixtures
- [x] Created **COBOL** handler with conformance fixtures
- [x] Created **VHDL** handler with conformance fixtures
- [x] Created **Verilog / SystemVerilog** handler with conformance fixtures
- [x] Created **Tcl/Tk** handler with conformance fixtures
- [x] Created **IDL** handler with conformance fixtures
- [x] Created **Lex / Flex** handler with conformance fixtures
- [x] Created **Yacc / Bison** handler with conformance fixtures
- [x] Conformance tests for ALL Doxygen pipeline handlers
- [x] GIT: commit `feat(phase3): add 12 Doxygen-ecosystem language handlers` (SHA: 650e85d)
- [x] REVIEW: all 89 test files pass, 738 tests pass
- [x] CI: pushed to origin main
- [x] PUSH: git push origin main + refs/notes/commits

## Phase 2: Strategy 2 — .NET XML Foundation (parallel)
- [x] `core/dotnet-xml-utils.ts` already existed
- [x] Created **Visual Basic (.NET)** handler
- [x] Created **F#** handler
- [x] GIT: commit `feat(phase3): add VB.NET and F# .NET XML handlers` (SHA: 8dcf34e)
- [x] REVIEW + CI + PUSH

## Phase 3: Strategy 1 — JavaScript / JSDoc
- [x] Created **JavaScript** handler using TypeDoc allowJs + JSDoc-specific tags
- [x] Conformance fixtures: basic JSDoc fixture with @param, @returns
- [x] GIT: commit `feat(phase3): add JavaScript JSDoc handler` (SHA: a1eb872)
- [x] REVIEW + CI + PUSH

## Phase 4: Strategy 1 — MUST Priority Languages
- [x] Create **PowerShell** handler (comment-based help)
- [x] GIT: commit `feat(phase3): add PowerShell handler`
- [x] REVIEW + CI + PUSH

## Phase 5: Strategy 1 — SHOULD Priority (TDD per language)
- [x] **MATLAB** handler (help system)
- [x] **Haskell** handler (Haddock)
- [x] **Lua** handler (LDoc)
- [x] **Perl** handler (POD)
- [x] **Clojure** handler (Codox)
- [x] **Erlang** handler (EDoc)
- [x] **Groovy** handler (GroovyDoc)
- [x] **GDScript** handler (Godot doc)
- [x] GIT: commit with phases 5-9

## Phase 6: Strategy 1 — COULD Priority
- [x] OCaml (OCamldoc), D (Ddoc), Solidity (NatSpec), Apex, Zig, Gleam
- [x] Nim, Crystal, Vlang, Odin, Pony
- [x] GIT: commit with phases 5-9

## Phase 7: Strategy 1 — Emerging & Bleeding-Edge
- [x] GML, PureScript, Reason, Mojo (verify Python coverage)
- [x] Q#, GraphQL SDL, Idris
- [x] GIT: commit with phases 5-9

## Phase 8: Strategy 3 — Language-Agnostic Fallback
- [x] Add prolog, smalltalk, algol to `natural-docs-fallback.ts` languageConfigs
- [x] GIT: commit with phases 5-9

## Phase 9: Registration & Documentation
- [x] Register ALL Phase 3 handlers in `core/router.ts`
- [x] Add all languages to `Language` union type in `core/handler.ts`
- [x] Run full conformance test suite (747 tests pass)
- [x] GIT: commit with phases 5-9