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
