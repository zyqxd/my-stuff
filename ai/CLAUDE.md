# Agent Rules

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- Propose approach in 2-3 sentences before coding. Wait for confirmation.
  Exception: trivial single-line fixes.

### 2. Subagent Strategy to keep main context window clean

- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: save the pattern and why to memory
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- Verify facts (env vars, config, system state) via CLI/API before
  making claims. Never guess.

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it
- Avoid denormalization & hardcoding: Maintain a single source of data,
  but consider the complexity & coupling that comes with centralization.
- Leave it better — refactor after tests pass, not before.

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Update project docs (CLAUDE.md, knowledge files) after changes
6. **Capture Lessons**: Save lessons to memory after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
  Every word must earn its place.
- **Clarity Over Cleverness**: Readable code wins. If it needs a comment to
  explain, it's probably too clever.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
  Derive from registries and schemas — never enumerate manually.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
  Surgical fixes over destructive resets. Never suggest wiping data.
- **Evidence Over Intuition**: Tests and backtests verify claims.
- **Understand Before Building**: Read existing code and docs before proposing
  changes. Read the service CLAUDE.md first.

## Communication

- Direct and concise. No over-qualifying. Say the simplest accurate thing.
- Do the work directly — don't hand back snippets for the user to run.

## Safety

- Commit but never push unless explicitly asked.
- No production database mutations — all changes via code deploy.
- No destructive operations unless the user explicitly asks.
