# Memory Refinement Reference

## Contents

- Memory layers
- Promotion gate
- Effectiveness versus efficiency
- Audit format
- Research basis

## Memory layers

Keep information at the narrowest layer that reliably serves it.

| Layer | Contents | Loading policy |
|---|---|---|
| Commandments | Stable, cross-task behavioral rules in `ai/CLAUDE.md` | Always loaded; highest bar |
| Scoped lessons | Evidence-backed patterns in `ai/lessons/<scope>.md` | Read for relevant work |
| Skills | Repeatable multi-step workflows and fragile procedures | Excluded: never scan, compare, or edit |
| Path-scoped rules | Guidance that applies to specific files or zones | Defer to separate user-directed work |
| Brain knowledge | Durable facts worth retrieving later | Search/read on demand |
| Project and daily context | Decisions, status, and current work | Project/session only |
| Generated memory | Claude/Codex summaries and extracted observations | Candidate evidence only |

Do not duplicate a lesson into Brain knowledge when existing configuration declares lessons authoritative. Do not promote a factual note merely because it is useful; commandments govern behavior.

Memory refinement never verifies whether a procedure already exists in a skill and never proposes skill changes. Mark such candidates `keep` or `defer`; skill work requires a separate explicit request.

## Promotion gate

A commandment must pass **all** criteria:

1. **Evidence** — the human explicitly declared it durable, or at least two independent corrections or outcomes support it.
2. **Recurrence** — the prevented failure is likely across future tasks in the destination scope.
3. **Correct scope** — global memory receives only broadly applicable rules; narrower rules stay scoped.
4. **Behavioral value** — the rule materially changes an agent action or decision.
5. **Specificity** — compliance is observable; avoid vague advice such as “be careful.”
6. **Durability** — the rule is unlikely to expire with a branch, project phase, person, date, or tool version.
7. **Non-obviousness** — a capable agent cannot reliably derive it from code, standard practice, or current documentation.
8. **Consistency** — it neither duplicates nor contradicts a higher-precedence instruction; revise an existing rule when possible.
9. **Economy** — it fits one sentence, ideally 30 words or fewer. Longer workflows remain scoped or are deferred; they do not trigger skill changes.
10. **Safety** — it contains no secret, credential, personal data, buyer data, merchant data, or sensitive incident detail.

A failed criterion blocks promotion, not retention. Keep useful evidence as a lesson, fact, project record, or skill.

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

## Scope and baseline
| Always-loaded file | Lines | Words | Bytes |

## Proposed operations
| ID | Candidate | Evidence | Disposition | Destination | Loaded delta |

## Exact edits
### ID — <title>
Before: <exact text or absent>
After: <exact text or removed>
Reason: <promotion-gate result and provenance>

## Conflicts, sensitive findings, and deferrals
## Approval
## Applied operations and verification
```

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
