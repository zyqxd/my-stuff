# Lessons — Agent skills

## Derive model-invocation language from the user's vocabulary

Source: PR-description skill correction, 2026-07-28.

- Search the user's prompts and durable notes before proposing leading terms; do not invent a vocabulary and assume it will trigger reliably.
- Model intent branches, not isolated keywords. A PR-description skill must activate for opening, creating, preparing, submitting, or updating a PR even when the body is only one step.
- Keep the model-facing description broad enough for the full user intent and narrow enough to exclude adjacent work such as code review or commit-message drafting.

## PR descriptions are bullets-first reviewer orientation

Source: PR-description skill requirements, 2026-07-28.

- Start with 1-3 one-sentence bullets that identify the change type and explain what changes and how.
- Follow with 1-3 context bullets explaining why, project or customer impact, and at most one reviewer-critical constraint; editorial first-person voice is valid.
- Include a terse stack map only for dependent or complex stacks, and highlight the current PR.
- Treat Tophat as author-owned: suggest setup, test shape, expected behavior, and cleanup, but never fabricate completed manual verification.
- Prefer the canonical body format while preserving meaningful leading directives such as `Closes #123`; always preview before updating GitHub.

## Treat section limits as ceilings, not targets

Source: review of generated B2M stack descriptions, 2026-07-28.

- Start Summary with one bullet; add another only for a distinct material change the first bullet cannot carry.
- Default Context to one short paragraph. Use bullets only when enumerating more than three genuinely distinct points.
- Do not restate scope, implementation shape, or generic cleanup rationale merely to make a section look complete.
- For tiny dependent PRs, one Summary bullet plus one Context sentence naming the rollout dependency can be the complete description.

## Match Tophat structure to the shape of verification

Source: review of Stripe Express #937051 generated description, 2026-07-28.

- Use numbered steps for one linear path; use tables when the same setup varies across surfaces, states, or expected outcomes.
- Group multi-surface Tophats under short headings so the author can run and clean up one surface at a time.
- When visual or temporal proof helps, add concrete unchecked prompts such as `[ ] Screenshot: …` or `[ ] Recording: …` for the author to fill.
- Do not add media placeholders to schema-only or otherwise nonvisual changes merely to complete the template.

## Reconcile every user-designated authoring source before finalizing

Source: memory-refinement skill source correction, 2026-07-29.

- Retrieve every skill or guide the user names, even when an earlier source already supports a valid draft.
- Record which design choice each source influenced; do not cite a source without applying or explicitly rejecting its relevant guidance.

## Keep skills outside memory refinement

Source: refine-memory scope correction, 2026-07-29.

- A full memory-refinement run scans commandments and lessons, never skills, skill references, or skill evals for duplication or possible destinations.
- Keep or defer procedural lessons; changing a skill requires separate explicit user-directed work.

## Preserve rationale before compressing lessons

Source: refine-memory rationale correction, 2026-07-29.

- A lesson needs the trigger or failure, why it mattered, the future action, its scope or boundary, and supporting evidence or uncertainty; an explicit human preference is sufficient rationale.
- If required rationale is missing, classify it for clarification and preserve the original text instead of inventing a cause or deleting an unknown.
- Map every claimed prevented failure to the exact rule clause that prevents it, and compare conflicts by trigger, action, scope, and exceptions rather than wording.
- Prefer a small actionable rule block over a vague sentence when independent preferences need separate instructions; lead review artifacts with decisions and risks before exact patches.

## Commit only explicitly owned changes

Source: commit-scope correction after refine-memory iteration, 2026-07-29. The global "Repository preflight" commandment carries this rule; this section retains the source evidence: "commit your changes" during a shared task meant assistant-owned edits only, and excluded user work stayed unstaged for review.

## Hunt for the closeable issue before drafting any new PR body

Source: user correction on shop/world PR #981443, 2026-08-06.

I drafted a new fix PR with no closing directive because none was handed to me,
even though a matching tracker (shop/issues-monetization#7052, filed by David
the same day) existed. "Existing or evidenced closing directives" includes
directives I must go find, not just ones already in a body or the request.

- Before drafting a new PR body, search the team's issue tracker(s) for an
  issue matching the bug/feature; check the user's plans/todo files and recent
  issues by the user first.
- If a matching issue exists, lead the body with `Closes <owner>/<repo>#<n>`
  (full form for cross-repo, e.g. shop/world PRs closing issues-monetization).
- If none exists, say so and ask whether to file one or proceed without —
  don't silently omit the directive.
- Never put closing directives on DO-NOT-MERGE/tophat PRs.
- Scope: every new PR body, in any repo; cross-repo trackers included.
- Evidence: #981443 shipped without `Closes shop/issues-monetization#7052`;
  David corrected it as a core tenet of PR descriptions.
- Uncertainty: whether umbrella/partially-satisfied issues should get `Closes`
  or a plain reference — ask when the PR only advances part of an issue.
