# Personal Brain Configuration - David Zhang

## Personal Information

- **Name**: David Zhang
- **Email**: david.yq.zhang@shopify.com
- **Team**: Monetization (monetization-team)
- **Role**: Senior Software Engineer (C6, Engineering / Software Engineering)
- **Focus Areas**: Convert Grow
- **GitHub**: zyqxd
- **Slack**: @davidzhang
- **Time Zone**: America/Toronto
- **Manager**: Kris Zawadka (Manager, Engineering, Growth)

## Technical Role & Expertise

### System Role

Senior Software Engineer on Shopify's Monetization team, focused on Convert Grow.
Works primarily in the World monorepo. Reports to Kris Zawadka under Growth
Engineering (Max Da Silva org).

### Core Responsibilities

- Design, build, and ship monetization / growth features within Convert Grow.
- Own outcomes end-to-end — from problem framing through delivery and follow-up.
- Uphold a high quality bar in code review, architecture, and testing.
- Surface risks, gaps, and problems early rather than absorbing them silently.
- Mentor and collaborate; hand off ownership of outcomes, not just tasks.

### Excellence Standards

- **Do it right, not just done** — high bar for quality and fair use of resources.
- **Direct and precise** — give the real thing, not the softened version; name
  problems plainly and early. Corrections are about the work, never a verdict.
- **Principled** — stand for what is right and good; be responsible, reliable,
  and dependable.
- **Communication style** — clear and precise; prefers pairing (Tuple) and
  written (Slack); prefers early/late meetings over mid-day.

---

# Consolidation & Precedence

Canonical personal agent guidance, memory, and integration sources live in
`~/Workspace/my-stuff/ai/`. This file is managed at `ai/brain/CLAUDE.md`;
the personal bank keeps an installed copy. Shared team banks remain independently owned.

- **Agent conventions and scope** — `ai/AGENTS.md`; memory and installation procedures —
  `ai/README.md`. These take precedence over overlapping bank guidance.
- **Engineering lessons** — `ai/lessons/<scope>.md`; durable facts and explicit recall —
  `ai/memory/`. Do not duplicate lessons into Brain project folders or knowledge.
- **Current unit state** — managed `~/plans/<project>/<unit>/STATE` and log tail.
  Do not hand-edit STATE or create competing todos/status snapshots. The `~/plans`
  compatibility symlink remains in this bank; no historical files are pruned.
- **Reports** — chat first. Save a durable report only when requested, required by an
  applicable workflow, or needed for a genuine handoff; use the existing unit's `inbox/`.
- **Brain** — identity, knowledge/discovery, Slack and GitHub references, shared banks,
  and explicitly requested project documentation. Daily diaries are human-requested;
  `activeProjects.md` remains frozen. The retired impact ledger stays retired.

---

# Core File Management

## dailyContext.md

**Purpose**: Track ONLY today's work and carry forward in-progress items
**Max Length**: 150 lines (ENFORCED)
**Update Trigger**: Update dailyContext.md only when David asks.
**Format Rule**: One line per item for all entries

**Formatting Rules:**
- No extra blank lines: Maximum 1 blank line between sections
- Remove empty sections: Delete sections with no content
- Clean entries: No trailing blank lines within sections

**Sections:**
1. Today's Date
2. Current Session Status
3. Today's Calendar
4. In Progress — project-level pointers only (DO NOT duplicate full descriptions)
5. Completed — work finished today only
6. Key Decisions Made Today
7. Team Interactions
8. Context for Tomorrow

**CRITICAL RULE — NEVER OVERWRITE ENTRIES**:
When updating list-based sections (Completed, Key Decisions, Team Interactions):
- ALWAYS append to existing entries
- NEVER replace entire sections
- Read current content first, then add new entries at the end

**Completed Today entries:**
- Format: `(project/folder): Description` or `(none): Description`
- Word limit: 15-25 words. NO SUB-BULLETS.
- Check all projects before using `(none)`

**Key Decisions entries:**
- Format: `(project/folder): Decision description` (10-20 words)

**In Progress section:**
- Project-level pointers only, one line per active project — per-PR/per-unit status lines live in the unit STATE head (`~/plans/<project>/<unit>/STATE`), not here
- Session Focus: Current session-specific context (optional, 1-2 lines)
- Target: 5-10 lines total

**History folder:**
- Previous days archived to `history/daily/YYYY-MM/YYYY-MM-DD-dailyContext.md`
- Archives are read-only, never edit after creation
- Search history when you need context from previous days

## knowledge/

**Purpose**: Durable, re-readable reference on one subject — a tool, a system, a process.

**Filenames carry no dates.** Name the file after its subject (`context-switching.md`), never
`YYYY-MM-DD-subject.md`. A dated filename claims the content is a snapshot from that day, so it
reads as stale the moment it is edited and accumulates near-duplicates on every rewrite.

**Frontmatter is `title`, `updated_at`, `tags`.**

- `updated_at` (ISO 8601, UTC) states freshness — bump it on every edit. It replaces `created_at`,
  which answers a question nobody asks of reference material.
- No `source` property. Provenance that matters belongs in the body, next to the claim it supports.
- Tags are for retrieval, not inventory. Keep roughly 5–8 that a future search would actually use;
  do not enumerate every command, flag, or synonym the document mentions.

**Structure follows the README arc**: goal in one or two sentences → quick start (the minimum that
works) → reference, grouped by job → deep dive with visual aids → TODO. Index from the source, not
from the previous version of the document.

Generated diagrams live in `knowledge/assets/<subject>/`.

## activeProjects.md

> **FROZEN (2026-08-27)**: activeProjects.md is frozen as-is. Do not edit it, curate it, or update statuses; a derived-index successor is deferred (context-switching SCOPE out_of_scope). Current state per unit of work lives in unit STATE heads.

**Purpose**: Quick reference list of active project statuses (frozen snapshot)
**Max Length**: 50 lines (ENFORCED)

**Format (one line per project):**
```
- [Project Name] (Status) - projects/path/to/folder - [Aliases]
```

**Status Values:** P0 (critical) | P1 (high) | P2 (medium) | P3 (low) | P4 (awareness) | MAINTENANCE

**Rules (how to read the frozen file):**
- One line per project, grouped by status (P0 → MAINTENANCE)
- No descriptions, URLs, or Slack channels (those go in project README, slackChannels.md)

## slackChannels.md

**Purpose**: Track important Slack channels organized by group
**User Managed**: Channel groups and their channels (except Project Channels)
**AI Managed**: Project Channels section only

**Read when:** User asks for Slack updates, asks which channel to post in, or asks what channels to check.

**Maintenance:** Update Project Channels only when requested; activeProjects.md is frozen.

## githubBoard.md

**Purpose**: Track team GitHub project board and project-specific labels
**User Managed**: Board info and project label mappings
**AI Managed**: Project Labels section only

**Read when:** User mentions "the board", asks about quality issues, creating new project folders, or checking project status.

**Maintenance:** Update Project Labels only when requested; activeProjects.md is frozen.

# Documentation Writing Rules

**Apply to ALL memory bank documentation.**

**Principles:**
- Be concise: remove unnecessary words
- Progressive refinement: write full context, then iteratively shorten
- Active voice: subject first, then action
- Polish proportionally: high-frequency files get more polish

**Word Budgets:**
- dailyContext completed item: 15-25 words
- dailyContext decision: 10-20 words
- activeProjects line: keep to single line

**Progressive Refinement Process:**
1. Draft full content
2. Remove filler ("in order to" → "to"), redundant context, combine related points
3. Verify information preserved in shorter version
4. Write refined version to file

**Common Pitfalls:**
1. Sub-bullets in dailyContext (use single lines)
2. Over-documenting (don't repeat info across files)
3. Wrong location (implementation details → project folder, not dailyContext)
4. Historical context in dailyContext (archive explicitly with Brain CLI)

**Working Files (only within requested documentation work):**
- Create files in `local/` when they help you DO the work (investigations, meeting notes, research)
- Do NOT create files for simple status updates or info that fits in project files
- Workflow: create in `local/` → work on it → leave it → use `/brain:document-project` to promote

# Personal Project Documentation Methodology

Documentation rules specific to personal/projects/generic/ structure.
Create or maintain these files only when David requests project documentation.
Completing work, switching context, and ending a session do not trigger updates.

## Project Structure

Personal projects in `memory-bank/personal/projects/generic/` use a simplified structure:

- **README.md** - Project overview, status, resources
- **decisions.md** - Architectural and technical decisions (append-only)
- **investigation.md** - Research findings (if investigation-focused)
- **implementation.md** - Implementation status (if build-focused)
- **CHANGELOG.md** - Change tracking
- **local/** - Working files (git-ignored)
- **documents/** - Preserved analysis (git-committed after promotion)

### File-Specific Documentation Guidelines

**README.md** - Status and Navigation (80-100 lines max)
- WHAT is being done
- WHO is involved
- WHERE to find resources (links)
- CURRENT status and phase
- ❌ NOT: WHY decisions were made (→ decisions.md)
- ❌ NOT: HOW it's implemented (→ implementation.md)
- ❌ NOT: Decision rationale or alternatives (→ decisions.md)

**decisions.md** - Decision Rationale Only
- WHY approach was chosen
- WHAT alternatives were considered
- WHAT the impact is
- Rationale and tradeoff analysis
- ✅ ONLY place for "Rationale" and "Alternatives Considered"

**investigation.md** - Research Process
- WHAT was discovered
- HOW investigation proceeded
- WHAT was analyzed
- Findings and analysis
- ❌ NOT: Final decisions (→ decisions.md)

**implementation.md** - Technical Details
- HOW it's built
- WHAT code changes were made
- WHERE files were modified
- Technical specifications
- ❌ NOT: Why approach chosen (→ decisions.md)

**CHANGELOG.md**:
- Update only as part of requested project documentation
- Format: `## YYYY-MM-DD HH:MM - David Zhang`
- List files changed with brief context (6-12 words)

---

## Template Location

Personal project template: `config/templates/projects/generic/`

Use with /brain:create-project skill.
