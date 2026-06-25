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
- [ ] Create `core/doxygen-utils.ts` — shared Doxyfile generation + XML-to-MDX transform
- [ ] Create **C** handler with conformance fixtures
- [ ] Create **Objective-C** handler with conformance fixtures
- [ ] Create **Ada / SPARK** handler with conformance fixtures
- [ ] Create **Fortran** handler with conformance fixtures
- [ ] Create **Pascal / Delphi** handler with conformance fixtures
- [ ] Create **COBOL** handler with conformance fixtures
- [ ] Create **VHDL** handler with conformance fixtures
- [ ] Create **Verilog / SystemVerilog** handler with conformance fixtures
- [ ] Create **Tcl/Tk** handler with conformance fixtures
- [ ] Create **IDL** handler with conformance fixtures
- [ ] Create **Lex / Flex** handler with conformance fixtures
- [ ] Create **Yacc / Bison** handler with conformance fixtures
- [ ] Conformance tests for ALL Doxygen pipeline handlers
- [ ] GIT: commit "feat(phase3): add 13 Doxygen-ecosystem language handlers"
- [ ] REVIEW: run conductor-review, apply fixes
- [ ] CI: verify all tests + coverage pass, GitHub Actions green
- [ ] PUSH: push to origin main

## Phase 2: Strategy 2 — .NET XML Foundation (parallel)
- [ ] Create `core/dotnet-xml-utils.ts` — shared XML doc parsing
- [ ] Create **Visual Basic (.NET)** handler
- [ ] Create **F#** handler
- [ ] GIT: commit "feat(phase3): add VB.NET and F# .NET XML handlers"
- [ ] REVIEW + CI + PUSH

## Phase 3: Strategy 1 — JavaScript / JSDoc
- [ ] Create **JavaScript** handler using TypeDoc allowJs + JSDoc-specific tags
- [ ] Conformance fixtures: @type, @typedef, @callback, @enum
- [ ] GIT: commit "feat(phase3): add JavaScript JSDoc handler"
- [ ] REVIEW + CI + PUSH

## Phase 4: Strategy 1 — MUST Priority Languages
- [ ] Create **PowerShell** handler (comment-based help)
- [ ] GIT: commit "feat(phase3): add PowerShell handler"
- [ ] REVIEW + CI + PUSH

## Phase 5: Strategy 1 — SHOULD Priority (TDD per language)
- [ ] **MATLAB** handler (help system)
- [ ] **Haskell** handler (Haddock)
- [ ] **Lua** handler (LDoc)
- [ ] **Perl** handler (POD)
- [ ] **Clojure** handler (Codox)
- [ ] **Erlang** handler (EDoc)
- [ ] **Groovy** handler (GroovyDoc)
- [ ] **GDScript** handler (Godot doc)
- [ ] GIT: commit "feat(phase3): add 8 SHOULD-priority language handlers"
- [ ] REVIEW + CI + PUSH

## Phase 6: Strategy 1 — COULD Priority
- [ ] OCaml (OCamldoc), D (Ddoc), Solidity (NatSpec), Apex, Zig, Gleam
- [ ] Nim, Crystal, Vlang, Odin, Pony
- [ ] GIT: commit "feat(phase3): add 12 COULD-priority language handlers"
- [ ] REVIEW + CI + PUSH

## Phase 7: Strategy 1 — Emerging & Bleeding-Edge
- [ ] GML, PureScript, Reason, Mojo (verify Python coverage)
- [ ] Q#, GraphQL SDL, Idris
- [ ] GIT: commit "feat(phase3): add 6 emerging/SOTA language handlers"
- [ ] REVIEW + CI + PUSH

## Phase 8: Strategy 3 — Language-Agnostic Fallback
- [ ] Integrate Natural Docs as universal comment parser
- [ ] Create `core/natural-docs-fallback.ts` — wraps Natural Docs output
- [ ] Test with 3 legacy languages (Prolog, Smalltalk, ALGOL)
- [ ] GIT: commit "feat(phase3): add Natural Docs agnostic fallback for 30+ languages"
- [ ] REVIEW + CI + PUSH

## Phase 9: Registration & Documentation
- [ ] Register ALL Phase 3 handlers in `core/router.ts`
- [ ] Add all languages to `Language` union type in `core/handler.ts`
- [ ] Update `handler-contract-all-*.test.ts`
- [ ] Run full conformance test suite
- [ ] Update README with 86+ language coverage matrix
- [ ] Update docs-site with complete tables
- [ ] GIT: commit "docs(phase3): update language coverage matrix to 86+ languages"
- [ ] REVIEW + CI + PUSH