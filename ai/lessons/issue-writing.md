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
