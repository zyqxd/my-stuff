## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean

- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: append the pattern to the durable lessons
  file `~/Workspace/my-stuff/ai/lessons/<project>.md` (see "Memory & Learnings
  Location" below) — NOT to any folder inside a repo checkout
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review the relevant `~/Workspace/my-stuff/ai/lessons/<project>.md` at session start

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `~/plans/<project>-todo.md` with checkable items (out of any repo checkout)
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to the same `~/plans/<project>-todo.md`
6. **Capture Lessons**: Append to `~/Workspace/my-stuff/ai/lessons/<project>.md` after corrections

## Memory & Learnings Location

Durable memory lives in the version-controlled `~/Workspace/my-stuff/ai/` repo
(the same repo as this file, symlinked into `~/.pi/agent/CLAUDE.md`) — **never**
inside a project/monorepo checkout.

- **Lessons:** `~/Workspace/my-stuff/ai/lessons/<project>.md` — one file per
  project or World zone (e.g. `admin-web.md`). Review the relevant file at
  session start; append to it after any correction.
- **Reports & active todos:** `~/plans/` (see Report Output Convention).
- **Never** write lessons/scratch/todos to a `tasks/` (or similar) folder inside
  a repo checkout. In the World monorepo such a folder is untracked-but-not-
  ignored (`?? tasks/`), so it risks being committed to shop/world; it is
  per-worktree, so memory never accumulates; and it is destroyed when the
  worktree is cleaned up.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **Comments — match the codebase (Shopify is light on comments)**: Default to no
  comments. A comment may explain _why_ (a constraint or deliberate trade-off) but
  never _what_ — the code should say what it does; if it can't, refactor or rename
  instead. In tests, carry intent in a descriptive `it(...)` name, not a comment.
- **Follow existing patterns**: Match the section/module's established file layout
  and conventions rather than introducing a local variation; if the pattern must
  change, change every instance together. Keep test data legible from the test so
  the reader can see why each case passes.

## Report Output Convention

When the user asks for a "report" (investigation writeup, findings, analysis extract, etc.):

- **Always** write it to the `~/plans` directory (create the directory if it does not exist).
- **Filename format**: `DD_MM_YYYY-ISSUENUM-NAME.md`
  - `DD_MM_YYYY` = today's date (zero-padded day/month, 4-digit year), from the real system `date`.
  - `ISSUENUM` = the issue/ticket number if one was provided. **Omit it entirely** (including its separating dash) when no issue number was given → `DD_MM_YYYY-NAME.md`.
  - `NAME` = short, lowercase, hyphenated slug describing the topic.
  - Examples: `02_07_2026-1234-billing-bank-account-checkout.md` (with issue), `02_07_2026-billing-bank-account-checkout.md` (no issue).
- Keep reports self-contained and up to date: fold in any new findings/repro steps before writing the extract.
