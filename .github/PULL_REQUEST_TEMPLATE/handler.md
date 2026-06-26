---
name: New Handler
about: Add a new language handler to astro-polyglot
title: 'feat: <language> handler'
labels: handler, new-language
assignees: ''

---

## Language

<!-- Specify the programming language this handler targets -->

## Doc Standard

<!-- What documentation standard does this language use? (e.g., JSDoc, Javadoc, PHPDoc) -->

## Changes

- [ ] Created `handlers/<language>.ts`
- [ ] Added `<language>` to `Language` union type in `core/handler.ts`
- [ ] Added `<language>` to `PolyglotConfig` in `core/router.ts`
- [ ] Registered handler in `getHandlerMap()` in `core/router.ts`
- [ ] Added fixture files in `tests/fixtures/<language>/`
- [ ] Added conformance test in `tests/conformance/<language>.test.ts`
- [ ] Ran `pnpm test` — all tests pass
- [ ] Ran `pnpm lint` — no warnings
- [ ] Ran `pnpm typecheck` — no errors

## Checklist

- [ ] Handler implements the `Handler` interface from `core/handler.ts`
- [ ] Handler uses `transformToMDX()` for consistent output (or documents why not)
- [ ] Handler validates toolchain availability via `validate()`
- [ ] Conformance tests cover all supported docstring variants
- [ ] This is a new handler (not a modification of an existing one)

## Additional Context

<!-- Any other information that would be helpful for reviewers -->
