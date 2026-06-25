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
6. Commit with conventional message AND attach task details to the commit using Git Notes (`git notes add`). Both commits and git notes must occur after every task.
7. Mark `[x]` with commit SHA in `plan.md`

## Phase Transitions
1. After every Phase is completed, the `/conductor:review` skill automatically occurs.
2. Any detected lint, compile, or specification issues must have fixes automatically applied.
3. Once all validation checks for the phase pass, the runner automatically progresses to the next phase.

## Track Completion & Archiving
1. At the end of the track, once all phases are implemented:
   - Ensure all reviews have occurred and all fixes are applied.
   - Verify that there are no remaining blockers.
2. Automatically archive the track (e.g., mark status as `completed` in `metadata.json` and record the final summary).
3. Automatically progress to the next logical track in `tracks.md`.

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

