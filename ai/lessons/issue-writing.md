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
