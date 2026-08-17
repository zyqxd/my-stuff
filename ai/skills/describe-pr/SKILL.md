---
name: describe-pr
description: Write an evidence-grounded pull request body. Use whenever the user asks to open, create, prepare, submit, or update a PR/pull request, or asks for a PR description/body, even when writing the body is only one step in a larger release workflow.
---

# Describe PR

> **HARD GATE** — Ground every claim in the change and preview the complete body before opening or updating a pull request. Never invent scope, impact, stack position, completed Tophat results, or content merely to fill a section.

## Workflow

### 1. Ground the description

Read primary sources before drafting:

- Existing PR: fetch its current title, body, base/head branches, commits, files, links, and comments when they change scope.
- New PR: identify the base and inspect the merge-base diff, commit list, and changed files.
- Read linked issues/projects, the repository PR template, and documented PR requirements.
- Inspect Graphite or equivalent stack metadata when present; do not infer stack order from branch names alone.
- Collect only verification evidence that actually ran.

This step is complete when every proposed factual claim traces to the diff, commits, linked work, current body, or verified command output.

### 2. Preserve meaningful directives

Put existing or evidenced closing directives such as `Closes #123`, `Fixes #123`, or `Resolves #123` before `## Summary`. Preserve repository-mandated metadata or checklists, but prefer the format below over empty template boilerplate.

### 3. Draft the body

Use this order and omit `Stack` when the PR is not part of a dependent or complex stack. Start with one Summary bullet and one Context sentence; expand only when distinct material information requires it.

```markdown
<optional closing directives>

## Summary
- **<Feature | Bug fix | Refactor | Deprecation | Maintenance>:** <what changes and how>.

## Context
<why this is needed, why now, project or customer impact, or one reviewer-critical constraint>.

## Stack
- <PR link or branch> — <few-word role>.
- **This PR** — <few-word role>.
- <PR link or branch> — <few-word role>.

## Tophat
<Straightforward steps, or author-facing suggestions for setup, cases, expected behavior, and cleanup.>
```

## Section rules

### Summary

- Start with one one-sentence bullet that identifies the change type and explains what the PR does and how.
- Add a second or third bullet only for a distinct material change the first cannot carry; three is a ceiling, not a target.
- Describe reviewer-relevant outcomes, not a file-by-file implementation tour.

### Context

- Use one short paragraph of 1-3 sentences by default.
- Use bullets only when enumerating more than three genuinely distinct context points; keep each bullet to one sentence.
- Explain the motivation, project connection, customer impact, or why now; a natural editorial voice such as “I think…” is welcome.
- Include at most one short reviewer-critical constraint. Link detailed design rationale instead of retelling it.

### Stack

- Include only for a dependent or complex stack.
- List the relevant PRs in merge order and bold the current PR so the reviewer is immediately oriented.
- Keep each item to a few words and at most one sentence; omit superseded-stack history.

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

### 4. Tighten and preview

Use lay terms and the fewest words that preserve reviewer understanding. Delete any sentence or bullet whose removal loses no material information, including detailed design history, process narration, unsupported impact claims, redundant test counts, and repetition between sections.

Show the complete proposed body before changing GitHub. Apply it only after confirmation unless the user explicitly requested immediate creation or update. When applying the description to an existing PR, change only the body; then fetch it again and verify the remote body matches the preview.

## Quality gate

- [ ] Any meaningful closing directives appear before `Summary`.
- [ ] `Summary` identifies the change type and explains what and how with the fewest necessary bullets, from one to three.
- [ ] `Context` is a 1-3 sentence paragraph unless more than three distinct points require bullets, and contains at most one reviewer-critical constraint.
- [ ] No sentence or bullet exists only to restate scope or make a section look complete.
- [ ] `Stack` is absent unless useful; when present, its links/order are evidenced and the current PR is highlighted.
- [ ] `Tophat` is reproducible or clearly presented as author-facing suggestions, uses the clearest structure for its test shape, validates setup references against the current change, and includes only relevant media prompts with no fabricated results.
- [ ] Every factual claim is supported, the body was previewed, and any remote update was re-read.
