# Project Workflow

## Guiding Principles
1. **The Plan is the Source of Truth** — All work tracked in `plan.md`
2. **TDD** — Write tests before implementation
3. **Coverage >90%** — All modules must meet threshold
4. **Conventional Commits** — `type(scope): description`

## Task Workflow
1. Select task from `plan.md`, mark `[~]`
2. Write failing tests (Red)
3. Implement to pass (Green)
4. Refactor
5. Verify coverage >90%
6. Commit with conventional message
7. Mark `[x]` with commit SHA in `plan.md`

## Quality Gates
- [ ] All tests pass
- [ ] TypeScript strict mode, zero errors
- [ ] ESLint zero warnings
- [ ] Prettier formatting passes
- [ ] Coverage >90%
- [ ] Bundle size <50KB

## Commit Convention
`<type>(<scope>): <description>`

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, conductor
