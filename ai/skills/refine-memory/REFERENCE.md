# Memory Refinement Reference

## Contents

- Memory layers
- Lesson sufficiency
- Constitution format
- Direct rule synthesis
- Semantic comparison
- Promotion gate
- Effectiveness versus efficiency
- Audit format
- Research basis

## Memory layers

Keep information at the narrowest layer that reliably serves it.

| Layer | Contents | Loading policy |
|---|---|---|
| Constitution | Short list of commandments in `ai/AGENTS.md`, amended rarely | Always loaded; highest bar; net-zero growth |
| Scoped lessons | Evidence-backed patterns in `ai/lessons/<scope>.md` | Read for relevant work; consolidated when a file grows unwieldy |
| Memory facts | Durable retrievable facts in `ai/memory/MEMORY.md` (pi-memory) | Searched on demand; drained candidates land here when factual, not behavioral |
| Skills | Repeatable multi-step workflows and fragile procedures | Excluded: never scan, compare, or edit |
| Path-scoped rules | Guidance that applies to specific files or zones | Defer to separate user-directed work |
| Brain personal bank | Project docs, decisions, plans reports | Upstream source: drained via watermark diff, never curated here |
| Daily exhaust | `ai/memory/daily/`, scratchpad, brain dailyContext | Transient; drained (dailyContext excluded) then left to expire |
| Generated memory | Claude/Codex summaries and extracted observations | Candidate evidence only |

Do not duplicate a lesson into Brain knowledge when existing configuration declares lessons authoritative. Do not promote a factual note merely because it is useful; commandments govern behavior.

Memory refinement never verifies whether a procedure already exists in a skill and never proposes skill changes. Mark such candidates `keep` or `defer`; skill work requires a separate explicit request.

## Lesson sufficiency

A useful lesson needs enough rationale to change future behavior:

| Field | Question |
|---|---|
| Trigger or failure | What happened, or when does this preference apply? |
| Cause or rationale | Why was the outcome wrong? An explicit human preference is enough. |
| Action | What should the agent do differently? |
| Scope and boundary | Where does it apply, and when should it not apply? |
| Evidence and status | What supports it, and what remains unknown or unverified? |

These are information requirements, not a mandatory template. Keep prose compact when it already answers them. If a required field is absent, classify the candidate `clarify`, ask only the missing questions, and preserve the original text. Never invent a cause or delete uncertainty to make a lesson appear complete.

## Constitution format

The always-loaded file is a constitution: a short list of priorities the agent can hold in focus every session. It changes the way a constitution does — through rare amendments, each refined from multiple lessons — never as a weekly changelog of rules and exceptions.

Each commandment is a bold imperative title with at most three one-line bullets:

```markdown
**Speak plainly**
- Expand an acronym the first time it appears.
- Prefer common words to jargon; explain a necessary term once.
- Lead with behavior and outcomes, not implementation detail.
```

Format rules:

- One idea per bullet; no sub-bullets, stacked parentheticals, or "unless" chains.
- An accumulating exception is evidence the rule was written too narrowly: rewrite the commandment at the principle level that covers both cases rather than appending the caveat.
- Amendments hold total always-loaded footprint flat or smaller by default; to add a commandment, first propose a merge, demotion, or removal.
- Amendments reuse the constitution's existing stable section headings; a new section is itself an amendment needing the same evidence.
- Procedures, examples, and evidence live in scoped lessons or skills, never in the constitution.
- Target under 100 always-loaded lines, measured with `wc -l`; treat the cited 200-line guidance as a hard bound, not a budget to fill. The file trends toward fewer, stronger commandments over time.

## Direct rule synthesis

Convert rationale into an observable rule:

```text
When <trigger>, <action>; verify <evidence>; preserve <boundary or exception>.
```

Prefer a direct imperative over a summary. “Format for the task” is vague; naming paragraphs for explanation, bullets for distinct points, numbered lists for sequence, and tables for comparisons is actionable.

This trigger→action shape is for scoped lessons. When a lesson is promoted, compress it into the constitution format above; each bullet must still pass the promotion gate.

For every proposed rule, build a coverage map from each claimed prevented failure to the clause that prevents it. If evidence includes wrong-context edits but the rule starts only before commit, the rule is incomplete.

## Semantic comparison

Compare meaning, not keywords or headings:

| Dimension | Compare |
|---|---|
| Trigger | Do the rules activate in the same situation? |
| Action | Do they prescribe different behavior? |
| Scope | Is one global and one intentionally narrower? |
| Boundary | Do exceptions or precedence make them compatible? |

A conflict exists when the same trigger and scope lead to incompatible actions, even when wording differs. Scan every audited lesson and commandment for these relationships. Record unresolved conflicts in the human review; do not silently choose a winner without enough rationale.

## Promotion gate

A commandment must pass **all** criteria:

1. **Evidence** — the human explicitly declared it constitutional, or the same pattern recurred across scopes or across separate refinement cycles — not merely twice in one week; the source and rationale are preserved in the scoped lesson.
2. **Recurrence** — the prevented failure is likely across future tasks in the destination scope.
3. **Correct scope** — global memory receives only broadly applicable rules; narrower rules stay scoped.
4. **Behavioral value** — the rule materially changes an agent action or decision.
5. **Specificity** — trigger, action, and expected evidence are observable; avoid vague advice such as “be careful” or “format appropriately.”
6. **Durability** — the rule is unlikely to expire with a branch, project phase, person, date, or tool version.
7. **Non-obviousness** — a capable agent cannot reliably derive it from code, standard practice, or current documentation.
8. **Consistency** — semantic trigger/action/boundary comparison finds no unresolved duplicate or conflict; revise an existing rule when possible.
9. **Economy** — the rule fits the constitution format (bold imperative title, at most three one-line bullets) and the amendment keeps the always-loaded footprint flat or smaller. Longer workflows remain scoped or deferred.
10. **Safety** — it contains no secret, credential, personal data, buyer data, merchant data, or sensitive incident detail.

A failed criterion blocks promotion, not retention. Keep useful evidence in its existing lesson or record; any destination change requires separate user-directed work.

The gate cuts both ways: an existing commandment that fails a criterion on re-audit is a `demote` candidate — move its substance back to the scoped lesson rather than patching it with a caveat.

## Effectiveness versus efficiency

Evaluate both sides explicitly:

| Effectiveness | Efficiency |
|---|---|
| Severity of prevented failure | Words and bytes loaded every session |
| Independent recurrence evidence | Duplication with existing guidance |
| Breadth within intended scope | Frequency the rule is irrelevant |
| Ability to change future behavior | Retrieval or inference alternatives |
| Stability over time | Conflict and maintenance risk |

Prefer removal or on-demand storage when the same outcome is available from code, documentation, search, or a scoped lesson. Do not inspect skills to make this determination. Imports reorganize always-loaded text but do not reduce its context cost.

Do not use a numeric score to override judgment. The promotion gate is conjunctive: one failed gate means no promotion.

## Audit format

The review artifact should contain:

```markdown
# Memory Refinement — YYYY-MM-DD

## Human review
Verdict: <one short paragraph>

### Proposed decisions
| ID | Decision | Why it matters | Footprint |

### Risks and unresolved questions
### Approval choices

## Scope and baseline
## Lesson evidence and rationale gaps
## Semantic conflicts
## Promotion coverage maps

## Exact edits
### ID — <title>
Before: <exact text or absent>
After: <exact text or removed>
Reason: <promotion-gate result and provenance>

## Applied operations and verification
```

Keep the human review short and use lay terms. Detailed evidence and exact patches belong after the decision summary so auditability does not bury the outcome.

Use lines, words, and bytes as reproducible measurements. If a trustworthy tokenizer or harness context report is available, include tokens too; otherwise label `bytes / 4` as an estimate rather than a measurement.

## Research basis

Research cutoff: **2026-07-29**. Refresh this section before changing policy after **2027-01-29**. Routine audits can use the existing rubric but must disclose that its research basis is stale.

- [Shopify Skill Optimizer](https://skills.quick.shopify.io/#/skills/skill-optimizer), retrieved from the authenticated registry on 2026-07-29: think before writing, minimize instructions, make surgical changes, and define verifiable success.
- [Shopify Create Skill](https://skills.quick.shopify.io/#/skills/create-skill), retrieved from the authenticated registry on 2026-07-29: treat `CLAUDE.md` as a constitution and skills as on-demand instruments; encode repeated, non-inferable workflows; keep global scope universal; prune rather than accumulate.
- [Anthropic: How Claude remembers your project](https://code.claude.com/docs/en/memory), modified 2026-07-22: concise and specific instructions improve adherence; target under 200 lines; move procedures to skills and details to on-demand files; remove derivable, stale, duplicate, and conflicting guidance.
- [Anthropic: Memory tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool), retrieved 2026-07-29: persistent files support just-in-time retrieval so long-running memory need not occupy active context.
- [Anthropic: Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), retrieved 2026-07-29: context is shared and finite; assume model competence, use progressive disclosure, and test representative scenarios.
- [OpenAI: Dreaming](https://openai.com/index/chatgpt-memory-dreaming/), published 2026-06-04: background synthesis should carry useful context, honor preferences and constraints, remain current, and expose reviewable summaries.
- [OpenAI: Codex memories](https://learn.chatgpt.com/docs/customization/memories), retrieved 2026-07-29: skip active or short-lived sessions, separate extraction from global consolidation, retain supporting evidence, redact secrets, and expose generation/use controls.
- [OpenAI: Compaction](https://developers.openai.com/api/docs/guides/compaction), modified 2026-07-29: reduce context while preserving necessary state to balance quality, cost, and latency.
