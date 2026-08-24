---
name: describe-pr
description: Write an evidence-grounded pull request body. Use whenever the user asks to open, create, prepare, submit, or update a PR/pull request, or asks for a PR description/body, even when writing the body is only one step in a larger release workflow.
---

# Describe PR

> **HARD GATE** — Ground every claim in the change and preview the complete body before opening or updating a pull request. Never invent scope, impact, stack position, completed Tophat results, or content merely to fill a section.

Write for a reviewer who wants to read the Summary and go straight to the code. They reach for `Context` only when something does not make sense, and for `Stack` only to re-orient mid-review. Nothing in the body should ask them to understand the shape of a stack before they can read the diff.

## Workflow

### 1. Ground the description

Read primary sources before drafting:

- Existing PR: fetch its current title, body, base/head branches, commits, files, links, and comments when they change scope.
- New PR: identify the base and inspect the merge-base diff, commit list, and changed files.
- Read linked issues/projects, the repository PR template, and documented PR requirements.
- Inspect Graphite or equivalent stack metadata when present; do not infer stack order from branch names alone.
- Collect only verification evidence that actually ran.

This step is complete when every proposed factual claim traces to the diff, commits, linked work, current body, or verified command output.

**Attribution check** — confirm the PR closes or references its issue, and that the issue chains to a project (`#gsd:` label, epic/parent, or board field). If either link is missing, tell the author before drafting: an unlinked PR cannot be traced to impact at review time. Do not block the body on it; flag it once and proceed.

### 2. Preserve meaningful directives

Put existing or evidenced closing directives such as `Closes #123`, `Fixes #123`, or `Resolves #123` at the very top, above any callout and `## Summary`. Preserve repository-mandated metadata or checklists, but prefer the format below over empty template boilerplate.

### 3. Draft the body

Use this order. Omit the callout unless it is earned, and omit `Stack` when the PR is not part of a dependent or complex stack. Start with a short Summary paragraph, one or two Summary bullets, and one Context sentence; expand only when distinct material information requires it.

```markdown
<optional closing directives>

<optional single callout — see Callouts>

## Summary

**<Feature | Bug fix | Refactor | Deprecation | Maintenance>:** <what this PR does and the user-visible effect; 1-3 sentences, 60 words max>.

- <one discrete fact — fragment, no period>
- <another discrete fact>

## Context

<why this is needed, why now, project or customer impact, or one reviewer-critical constraint>.

## Tophat

<Straightforward steps, or author-facing suggestions for setup, cases, expected behavior, and cleanup.>

## Stack

<stack map — see Stack section rules>
```

## Section rules

### Bullets

Every bullet in the body is a **one-liner**, not a sentence. It indexes a fact; it does not explain one.

- Lead with the thing that changed. Fragment, 12 words max, no terminal period.
- One fact per bullet — no rationale, no consequence, no second clause.
- If it needs `because`, `so that`, `which`, `after`, `while`, a semicolon, a comma splice, or a second `and`, it is prose. Cut it, or move it to the paragraph that owns it.
- Two sentences in one bullet is always a defect, as is a bullet that wraps onto a second line.

| Prose disguised as a bullet                                                                                                                             | One-liner                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `- Reuses the payment selector's default-selection helper so the CTA stays enabled when a merchant has an ineligible bank account and an eligible card.` | `- CTA stays enabled when only the card is eligible` |
| `- Adds a backfill job, which runs in batches of 500 to avoid replica lag; it is idempotent and safe to re-run.`                                         | `- Idempotent backfill job, batches of 500`        |

Whatever the compression drops is either unnecessary or belongs in `Summary`'s lead paragraph or `Context`. It does not go back in the bullet.

### Callouts

GitHub alert blockquotes (`> [!IMPORTANT]`) are loud. Default to **none**, and never more than **one** per body — a second one teaches the reviewer to skip both.

Add one only when a reviewer would take a **wrong action** without it. Two types qualify:

- `[!IMPORTANT]` — the PR must not be approved or merged as-is: it is blocked on another PR, needs a rebase first, or carries an unlanded follow-up step.
- `[!WARNING]` — merging or deploying it out of order or without a prerequisite causes real damage, such as a destructive migration or a rollout-order dependency.

Never use `[!NOTE]`, `[!TIP]`, or `[!CAUTION]`. If the content is worth the reviewer's attention it is a sentence in `Summary` or `Context`; if it is not, delete it.

- Place it after any closing directives and before `## Summary`, so it lands before the reviewer starts reading.
- Keep it to a one-line bold statement of the blocker plus at most a short checklist of the outstanding steps.
- State the action, not the reasoning. Link the issue or PR that carries the rationale.
- Do not restate anything already in `Summary`, `Context`, or `Stack`; the callout replaces that prose rather than previewing it.
- Remove it the moment it stops being true — a stale blocker callout is worse than none.

### Summary

- Open with a short prose paragraph, led by a bold change-type label, stating what the PR does and the user-visible effect. Hard cap 3 sentences and 60 words. If a sentence needs a subordinate clause to survive, cut the clause.
- Follow with one-liner bullets enumerating the discrete facts of the change (see `Bullets`). The paragraph carries the prose; the bullets carry none.
- Keep the list scannable, typically two to four bullets sized to the change.
- Bullets name reviewer-relevant outcomes. No file-by-file tour, no justification of the approach, no naming of internal helpers unless the reviewer needs the name to find the code.
- The paragraph summarizes the work itself; deeper motivation, why-now, and project links belong in `Context` — do not duplicate them.

### Context

- One paragraph, 1-3 sentences, 80 words max. This is the section a reviewer reads when the diff confuses them, not a place to bank everything you learned.
- Prefer prose here. Use bullets only when enumerating more than three genuinely distinct context points, and then as one-liners (see `Bullets`).
- Explain the motivation, project connection, customer impact, or why now; a natural editorial voice such as “I think…” is welcome.
- When the change serves a measurable outcome, spend one clause naming it — the metric it moves or the decision it enables (“baseline for the Express Pay ordering readout”). This is the hook a later impact writeup hangs on; omit it only when no such outcome exists.
- Include at most one short reviewer-critical constraint. Link detailed design rationale, rejected alternatives, and investigation history instead of retelling any of it.
- Never explain the stack here. Cross-PR sequencing is either a `Stack` row, the single callout, or out of the body entirely.

### Tophat

- Treat this as author-owned. Suggest concrete coverage from the diff without claiming the author ran it.
- Match structure to the test shape: numbered steps for a linear flow and a table for repeated cases that vary by state, parameters, or expected result.
- For multiple surfaces, use separate subheadings when routes or expectations differ; otherwise state that the shared matrix applies to each named surface.
- Give test matrices compact columns such as `Case`, `Setup` or `Params`, and `Expected` rather than repeating prose.
- When visual or temporal evidence would help review, use the exact searchable prefixes `- [ ] Screenshot: <what to capture>` and `- [ ] Recording: <flow to demonstrate>`.
- Omit media prompts for schema-only, data-only, or otherwise nonvisual changes where they add no evidence.
- For complex changes, prompt for setup such as flags, shop state, fixtures, or a monkey patch; validate referenced setup commands against the current change, and disclose a refresh prerequisite instead of promising a stale or conflicting command.
- Suggest whether coverage needs one happy path, binary cases, or edge/failure paths; include cleanup when setup mutates state.
- Tophat has no length limit. Optimize for reproducibility, then let the author tighten it manually.

### Stack

**A map, never an explanation.** Its only job is to remind a mid-review reviewer
where they are. Include it only for a dependent or complex stack. Always list PRs
in merge order, bottom first, and mark the current PR. Keep each role to a few
words.

Prose in this section is a defect. Do not narrate sequencing, coupling,
prerequisites, follow-up commits, overlap with an open PR, or superseded-stack
history — that is the author's design of the stack, not information the reviewer
needs to read the diff. Route it as follows:

| The reviewer must…                             | Where it goes                       |
| ---------------------------------------------- | ----------------------------------- |
| not approve or merge yet                       | the single callout, one line        |
| know a prerequisite exists                     | the `Status` cell in the stack map  |
| understand why the stack is shaped this way    | the issue or a PR comment, not here |

**Two PRs** — a list is enough:

```markdown
## Stack

1. #123 — real session identity.
2. **This PR** — view correlation ID.
```

**Three or more** — use a stack map so position and readiness stay scannable:

```markdown
## Stack

Merge order, bottom first. **This PR** is #3.

| #   | PR                 | Role                            | Status     |
| --- | ------------------ | ------------------------------- | ---------- |
| 1   | #123               | Real session identity           | Merged     |
| 2   | #124               | View correlation ID             | In review  |
| 3   | **#125 (this PR)** | Shimmer wait pairing            | Draft      |
| 4   | #126               | View lifecycle                  | Draft      |
| 5   | —                  | Submission-boundary correlation | Not opened |
```

- `Status` must state the PR's real remote state — `Merged`, `In review`,
  `Draft`, `Not opened` — read from the host, never assumed from intent. Re-read
  it whenever you update any PR in the stack.
- Include planned-but-unopened entries only when the stack's shape is already
  agreed; leave the `PR` cell as `—` rather than linking a nonexistent PR.
- Add one sentence naming the stack's shared goal only when the titles alone do
  not make it obvious. That sentence is the section's entire prose budget.
- When the stack is not linear, name each entry's parent in the `Role` cell
  instead of implying a false sequence.

## 4. Tighten and preview

Use lay terms and the fewest words that preserve reviewer understanding. Delete any sentence or bullet whose removal loses no material information, including detailed design history, process narration, unsupported impact claims, redundant test counts, and repetition between sections.

Show the complete proposed body before changing GitHub. Apply it only after confirmation unless the user explicitly requested immediate creation or update. When applying the description to an existing PR, change only the body; then fetch it again and verify the remote body matches the preview.

## Quality gate

- [ ] Any meaningful closing directives appear before the callout and `Summary`.
- [ ] There is at most one callout; it is `IMPORTANT` or `WARNING`, states an action a reviewer would otherwise get wrong, is currently true, and duplicates no section.
- [ ] Sections appear in the order `Summary`, `Context`, `Tophat`, `Stack`.
- [ ] `Summary` opens with a change-type-labeled paragraph of at most 3 sentences and 60 words, followed by one-fact bullets.
- [ ] Every bullet in the body is a one-liner — fragment, 12 words max, no terminal period, no second clause, no rationale.
- [ ] `Context` is a 1-3 sentence paragraph under 80 words unless more than three distinct points require bullets, and contains at most one reviewer-critical constraint.
- [ ] No sentence or bullet exists only to restate scope or make a section look complete.
- [ ] `Stack` is absent unless useful; when present it is a map with no prose beyond one optional shared-goal sentence, lists PRs in merge order from evidenced stack metadata, marks the current PR, and for three or more PRs uses the stack-map table with every `Status` read from the host.
- [ ] `Tophat` is reproducible or clearly presented as author-facing suggestions, uses the clearest structure for its test shape, validates setup references against the current change, and includes only relevant media prompts with no fabricated results.
- [ ] Every factual claim is supported, the body was previewed, and any remote update was re-read.
- [ ] The PR references its issue and the issue chains to a project; a broken chain was flagged to the author.
