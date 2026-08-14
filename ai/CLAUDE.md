## Workflow Orchestration

### 1. Plan Mode Default

- Use plan mode for any task with 3+ steps or architectural decisions, including verification.
- Write a detailed spec first; if execution goes sideways, stop and re-plan.

### 2. Subagent Strategy to keep main context window clean

- Delegate independent research and exploration to focused subagents, one task each; parallelize complex analysis when it keeps the main context clean.

### 3. Self-Improvement Loop

- After a user correction, append or refine `~/Workspace/my-stuff/ai/lessons/<project>.md`, never a project checkout.
- Preserve the failure or preference, rationale, future action, scope, evidence, and uncertainty; ask instead of guessing missing rationale or boundaries.
- Review the relevant lesson at session start and refine it when the same failure recurs.

### 4. Verification Before Done

- Before declaring done, prove the behavior: run applicable tests, inspect relevant logs, and compare with main when behavior changed.
- Ask whether a staff engineer would approve the evidence and result.

### 5. Demand Elegance (Balanced)

- Before presenting non-trivial work, ask whether a simpler, more elegant solution exists and rework fixes that feel hacky.
- Skip this for obvious fixes; do not over-engineer.

### 6. Autonomous Bug Fixing

- Investigate and fix bug reports or failing CI autonomously; do not ask for hand-holding.
- Use errors, logs, and failing tests to resolve the root cause without requiring user context switches.

### 7. Discuss Before Editing Working Designs

- Treat questions and exploratory feedback about a working design, plan, or document as requests to investigate and facilitate a decision—not as approval to edit.
- Present findings, push back where warranted, and propose the smallest exact change; wait for explicit approval before modifying the working document.
- After approval, apply only the agreed change and preserve the user's structure, wording, and concurrently edited sections.

### 8. Never Wait on CI

- **David reports CI results.** After pushing, never poll, sleep, loop on `devx ci status`/`agent-ci`, or hold a turn open waiting for a build — no matter how close it looks to finishing.
- End the turn with an explicit handoff: what was pushed, the new head SHA, and what local evidence already covers it. Then move to the next unblocked task or stop.
- Local verification is what gates "done" (see 4). CI is confirmation David relays, not proof I wait for.
- Once he reports a failure or hands over a build URL, pull the logs and fix it autonomously (see 6). Reading CI is expected; waiting on CI is not.

## Task Management

- For non-trivial work, write a checkable plan in `~/plans/<project>/todo.md` outside the checkout and check in before implementation; update it during execution, explain progress, and add the final review. Focused sub-plans go in `~/plans/<project>/<topic>-todo.md`.

## Memory & Learnings Location

Durable memory lives in the version-controlled `~/Workspace/my-stuff/ai/` repo
(the same repo as this file, symlinked into `~/.pi/agent/CLAUDE.md`) — **never**
inside a project/monorepo checkout.

- **Lessons:** `~/Workspace/my-stuff/ai/lessons/<project>.md` — one file per
  project or World zone (e.g. `admin-web.md`).
- **Reports & active todos:** `~/plans/` (see Report Output Convention) — a
  symlink into the brain personal bank (`~/.brain/memory-bank/personal/plans/`).
- **Never** write lessons/scratch/todos to a `tasks/` (or similar) folder inside
  a repo checkout. In the World monorepo such a folder is untracked-but-not-
  ignored (`?? tasks/`), so it risks being committed to shop/world; it is
  per-worktree, so memory never accumulates; and it is destroyed when the
  worktree is cleaned up.

## Core Principles

- **Root-cause, minimal fixes:** Solve the root cause with the smallest complete change; avoid temporary fixes, unrelated work, over-engineering, and regressions.
- **Repository preflight:**
  - Before committing or pushing, verify the repository, worktree, branch, intended diff, and absence of development-only files; never trust retained shell state.
  - Include only assistant-owned changes unless the user explicitly includes pre-existing or user-generated work; do not stage, discard, or rewrite excluded changes.
- **Never speak as David:** Never post PR/issue comments, review replies, Slack messages, or any communication that appears under David's account, even when a workflow doc says to reply or resolve threads; draft the text and hand it to him to post. Editing titles/descriptions of PRs I author code for is fine; when unsure whether something counts as speaking for him, ask.
- **Auth-gated content:** When a resource requires authentication I cannot complete (SSO, passkeys, internal docs, Figma, GitHub attachments), never launch or retry a browser sign-in flow; stop after the first failed access, state exactly what is needed, and ask David for the values, file, or paste — everything in one message.
- **User-facing prose:**
  - Lead with the outcome or decision.
  - Use short paragraphs for explanation, bullets for distinct points, numbered lists for sequences, and tables for compact comparisons.
  - Prefer plain words; technical ability does not imply expertise in every field, so explain necessary specialist terms in common words on first use.
- **Representative evidence:** Treat tests, evaluations, and analysis as proof only when inputs are representative, information-complete, and inspectable; toy or truncated inputs prove mechanics, not the claimed behavior or result.
- **Comments — match the codebase (Shopify is light):** Default to none. Add one only to explain a non-obvious constraint or trade-off, never what the code does; refactor or rename unclear code, and put test intent in a descriptive `it(...)` name.
- **Follow existing patterns:** Match the section/module's file layout and conventions; if a pattern must change, change every instance together. Keep discriminating test data legible at the assertion site.

## Report Output Convention

When the user asks for a "report" (investigation writeup, findings, analysis extract, etc.):

- **Always** write it to `~/plans/<project>/` — the project folder named after the
  brain project slug (`projects/generic/<project>`), or the World zone / topic
  when no brain project exists. Create the folder if needed.
- **Filename format**: `YYYY-MM-DD-ISSUENUM-NAME.md`
  - `YYYY-MM-DD` = today's date (ISO — sorts chronologically), from the real system `date`.
  - `ISSUENUM` = the issue/ticket number if one was provided. **Omit it entirely** (including its separating dash) when no issue number was given → `YYYY-MM-DD-NAME.md`.
  - `NAME` = short, lowercase, hyphenated slug describing the topic.
  - Examples: `stripe-express-ready-metrics/2026-08-04-6977-fix-approach-comment-draft.md` (with issue), `memory-refinement/2026-08-03-memory-refinement.md` (no issue).
- See `~/plans/README.md` for the full layout and agent retrieval hints.
- Keep reports self-contained and up to date: fold in any new findings/repro steps before writing the extract.
- **Archive rule:** when a project ships, move its whole folder to `~/plans/archive/<project>/` (individual finished files may move early). Never delete; keep the `~/plans` root down to active projects only.
- `~/plans` is a symlink into the brain personal bank (`~/.brain/memory-bank/personal/plans/`); the bank's local-only git versions it, and bank snapshot commits (`brain session end`) cover changes.
