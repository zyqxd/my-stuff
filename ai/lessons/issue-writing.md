# Lessons: issue writing

## Quantifiers in acceptance criteria are enforced literally (2026-08-14)

- **Failure:** #7237's AC said "_every_ checkout diagnostic row carries
  `customFields.surface`" while the governing spec defined a closed 8-event
  set. Two agent reviewers on shop/world#995644 held the PR to the literal
  text and requested changes against a criterion no PR could ever satisfy —
  30.8% of production rows (`signup_page_load`, `store_details_*`) are
  emitted outside any checkout view, so there is no surface to name.
- **Rationale:** an AC is a review contract, not prose. Agent reviewers (and
  strangers, per the skill's own standard) verify the words, not the intent.
  A universal quantifier over an open category is a claim about members the
  author never inspected.
- **Rule:** before writing "every/all/any X" in an AC:
  1. Enumerate the universe. If the work derives from a spec with a closed
     set, copy the enumeration into the AC ("the three events A, B, C
     carry ...").
  2. Check achievability against production data, not the category name —
     count the members that are structurally out of reach.
  3. Write `Closes #N` and the ACs together: `Closes` asserts the PR alone
     satisfies every AC. If the ACs describe what a stack delivers, narrow
     them to the closing PR's slice or use `Part of #N`.
- **Scope:** any issue I author, any repo. The issue-writer skill lives in
  the Shopify/monetization checkout (team-owned) — proposed upstream edit
  saved at `/tmp/issue-writer-upstream.patch`; do not edit that checkout
  directly.
- **Evidence:** shop/issues-monetization#7237; reviews 4937880196 (River)
  and 4937853167 (Mona) on shop/world#995644; two-day event breakdown in
  `~/plans/stripe-express-ready-metrics/`.

## The spec's enumeration is the scope boundary (2026-08-14)

- When an issue tempts you to "round up" to a bigger category for tidiness
  ("every diagnostic" instead of eight named events), the extra scope lands
  in files that lack the plumbing (4 of 6 emit sites had no tracker in
  scope) and behaviour-critical paths (credit-card vault/captcha submit) —
  cost concentrated exactly where telemetry value is thinnest.
- Cut the issue to the spec; file genuinely interesting adjacencies
  (e.g. `checkout_apple_pay_init_error`, largest uncovered event, emit site
  already has the tracker) as follow-ups with their own evidence.

## Cross-repo `Closes #N` never auto-closes

Source: 2026-08-21. shop/world #995644 merged carrying
`Closes shop/issues-monetization#7237`; #7237 stayed open.

GitHub's close-on-merge keyword only fires within one repository. Across repos it
renders as a plain reference, which looks identical in the PR body — so the issue
silently stays open and the work looks unfinished on the board.

- **Future action:** after merging a PR that closes an issue in another repo, read
  the issue's state from the host and close it. Do not treat the merged body as proof.
- Applies to every shop/world → shop/issues-monetization pair, which is the normal
  shape of this team's work.

## Transcribing David's review comments (2026-09-10)

- **Correction:** After I cleaned up wording and typos while mapping #7649 comments
  to Shopify/monetization#6819, David said, "Make sure to only use my wording."
- **Scope:** Transcription of existing authored comments, not all drafting. Preserve
  source wording and typos; mapping to review locations does not authorize rewriting.
- **This task:** David also asked to exclude questions answered by #7819. Check its
  linked canonical document (#6820); distinguish answered portions from unresolved
  details rather than treating a related mention as a complete answer.
- **Rationale:** Transcription must not introduce the assistant's voice or repeat
  resolved questions. Keep exclusion explanations separate from the comment text.

## A compare-and-swap check must fail the whole mutation command

Source: 2026-09-11. While adding restart evidence to
shop/issues-monetization#7847, the pre-edit body comparison detected that David had
checked two more boxes concurrently. The Python assertion failed, but the surrounding
newline-separated shell continued because it lacked `set -e`; `gh issue edit` then
replaced those two checkmarks. I immediately diffed the captured concurrent body,
restored both checkmarks, and verified the merged body at 24 completed checks.

- Start any verify-then-remote-mutate shell with `set -euo pipefail`, or put the
  comparison and mutation in separate tool calls.
- A printed/failed CAS assertion is not protection unless its nonzero status prevents
  the write. On mismatch, stop and merge from the captured live body.
- Keep before, concurrent, and after bodies until restoration is verified. Report any
  temporary overwrite rather than hiding it.

## Main-issue data flows need named components and explicit handoffs

2026-09-15: In LLC main issue #7903, “the claim reaches the program and then
Core's mirror” forced David to ask whether that meant the ClaimCreated outbox.
He requested a whole-issue ambiguity audit because this is the first input to
many downstream steps. Size trimming had obscured an already-chosen mechanism.

For this issue and its decomposition, use consistent system/event/store names and
state sender → named contract/data → receiver → stored effect at important flow
boundaries. Distinguish claim intent from verified partner conversion, app outbox
from its still-undecided relay, incentives ledger from Core claim mirror, and the
app's milestone projections from partner snapshots. A short name is fine once
clearly defined; mechanically repeating every fully qualified name is not the goal.
Known architecture must not disappear behind “reaches,” “feeds,” or “local.” Actual
transport/owner gaps remain explicitly deferred to build rather than guessed.

Review the live issue before editing and preserve David's concurrent wording.
Evidence: #7903 User Flow7 clarification and `~/plans/llc-incentive/design-doc/inbox/2026-09-15-7903-language-review-brief.md`.

David subsequently directed all further work to use the recovered raw draft, not
the compressed issue. For LLC #7903 the active body is now
`~/plans/llc-incentive/design-doc/inbox/2026-09-15-7903-raw-working-draft.md`;
`2026-09-15-7903-first-raw-draft.md` stays an immutable source snapshot. Do not
compress this local working document to the skill's 60K target. GitHub's actual
body limit still applies to any later publication; publication or a split needs
its own decision. Preserve current user decisions rather than reviving obsolete
ones merely because they appear in the raw snapshot.

On September 16 David explicitly authorized a condensed derivative, without changing
the raw original: six sequential Astra passes on one new document, focused on build
outcomes, code-only area references, succinct experiment wording, removal of due dates
and source discrepancies, then Slack resolution of open questions. Use his specified
effort per pass and a final Fable/high oracle gate. This is not permission to return
to the older compressed issue as the source or create a separate draft per pass.
Plan: `~/plans/llc-incentive/design-doc/inbox/2026-09-16-7903-condensation-plan.md`.

For LLC brochure/admin UI, David subsequently requested one sub-area per surface,
with the What allowed to be just a design pointer—no why/how exposition. He confirmed
the September11 Product summary is current, but wants it summarized once under merchant
surfaces with a design-in-progress callout. Designs remain fluid into build; do not
turn every note into fixed UI behavior. The added high-effort client-surface pass
excludes the 1P app. Design Decisions and Risks are removed in a preceding medium pass.
This is a client-UI scoping preference, not permission to blur backend data contracts.

## Bound issue-batch reviews by the unresolved change (2026-09-16)

During #7903 publication, the metadata reviewer finished the issue mapping, dependency
DAG and mocked driver checks, then identified an unconditional GitHub Priority-write
race and was terminated before returning its report. David confirmed an exclusive
Priority/Milestone editing window and asked to break reviews down so they are faster.
For this batch, review only the new exclusive-window guard and milestone-only updater;
do not repeat the accepted 30-body or graph review. Keep source-fidelity, metadata-graph,
and write-safety checks as bounded review scopes when a full batch makes them slow.
The exclusive window is a human coordination agreement, not a GitHub API lock; retain
observed-conflict guards and stop on uncertain writes. This does not waive independent
review or establish a universal reviewer-time limit.
