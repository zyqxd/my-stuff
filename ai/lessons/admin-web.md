# Lessons — World zone: `//areas/clients/admin-web`

Durable, version-controlled lessons for the admin-web zone. Review at session
start; append after any correction. (Moved out of the in-repo `tasks/lessons.md`
— see "Memory & Learnings Location" in the global CLAUDE.md for why.)

---

> Split on 2026-09-01: git/worktree lessons moved to `world-git.md`, build and
> verification lessons to `world-verification.md`, metric-contract lessons to
> `checkout-metrics.md`. This file keeps UI, CSS, component, copy, and
> working-process lessons.

## Don't patch a small state machine one failure-path at a time (whack-a-mole)

Source: PR #899093 + stacked #906638 (ACH bank accounts in subscription
checkout), 2026-07-02 → 07-10. One ~40-line block in
`Checkout/hooks/useInitialPaymentMethod.tsx` drew \*\*6 consecutive binks findings

- 3 human findings across ~14 `fix(checkout)` commits over 8 days\*\*, plus a
  recurrence in the stacked PR — all the same bug class.

What happened: the parent hook re-derived "which payment method is selected"
with its own ad-hoc `primary-or-first` logic that kept **drifting from (a) what
the `MultiplePaymentMethodSelector` actually displays and (b) what the CTA gate
requires**. The selection state depends on a _matrix_ of inputs — active method
type × verification status × per-account currency eligibility × other saved
methods (card / Identity card) × express-pay × `shouldEditPayment`. Each fix
addressed one cell and left an adjacent cell broken:

1. gate unverified/ineligible banks in the item list → _preselection_ still
   picked an unusable bank.
2. filter `selectableBankAccounts` for the no-active-id fallback → the
   _active-id_ path still kept an unusable bank selected.
3. gate the CTA on a valid bank id → a bank+card account now got **stuck** (CTA
   disabled while a card looked selected) — this was the recurrence in #906638.
4. a fallback fix put a **`useMemo` inside an `else` branch** → hook-order
   violation, crash on refetch.

The cascade only ended when the fallback stopped re-deriving and **reused the
selector's own rule as the single source of truth**:
`buildCheckoutPaymentMethods(...)` → `getDefaultSelectedId(items)`. Now parent
selection, the selector's highlighted item, and the CTA gate read the same list

- same rule, so they can't disagree.

Rules for myself:

- **Model the whole truth table before touching a stateful selection/eligibility
  bug.** Enumerate the input dimensions, find the one derivation that satisfies
  every cell, write it once. Never fix a single failure path in isolation.
- **Two surfaces that must agree on a derived value must call one shared
  function.** Parent state, a child component's visual default, and a
  gate/CTA must not each re-derive "primary-or-first" — divergent re-derivation
  was the root cause of nearly every finding here.
- **Test the matrix, not the cell.** Every fix shipped a test for its own case;
  the reachable bugs were always the _mixed_ cases (unusable bank + valid card).
  Parametrize across the cross-product, especially mixed-inventory accounts.
- **Never put a hook (`useMemo`/`useState`/`useEffect`) inside a conditional
  branch.** Compute conditional values with plain functions at the top level.
- **A repeat binks finding on the same file/locus is a design smell, not another
  patch.** After the 2nd finding on one block, stop and redesign toward a single
  source of truth instead of patching path #3, #4, #5.

## Promoted code-review conventions — promoted 2026-07-09

Source: reviewer feedback on shop/world PR #899093, 2026-07-09 (comments, file
organization, fixture legibility). The global commandments in `ai/AGENTS.md`
→ Core Principles carry the rules; no admin-web-specific nuance beyond them.

## Core (`//areas/core/shopify`) auto-reformats `db/data/*.yml` on save

A file watcher (started by core `dev up`) rewrites YAML data files (e.g.
`api_changes.yml`, `dynamic_experiments.yml`) shortly after they're saved —
converting `"..."` → `'...'` across the whole file. This produced a 4700-line
spurious diff.

- First verify the target files have no pre-existing working-tree changes.
- Edit + `git add` + commit **atomically in one bash command** (beat the debounce),
  then guard on `git diff --cached --numstat` before committing.
- Restore only watcher-generated unstaged changes afterward
  (`git restore --worktree -- <files>`); never discard pre-existing work.

## PR description corrections from the B2M and Stripe Express stacks

Sources: B2M CTA restack (#907101/#915894), 2026-07-13; user edits to Stripe Express #937049, 2026-07-15.

- In the B2M stack, preserve useful headings and per-file bullets while replacing explanatory paragraphs; do not over-correct into an unstructured blurb.
- Read the current GitHub body before editing because the user may have changed it; when authorship is ambiguous, inspect `pullRequest.userContentEdits { editedAt diff }` before overwriting.
- In #937049, linked product/user motivation needed to precede mechanics; stack-history narration was noise, and testing had to claim only verification performed for that PR.
- Explain compatibility decisions in reviewer terms, and prefer concrete reader language such as `2+` instead of symbolic `N`.
- Treat those headings and ordering as case evidence, not a universal template; choose sections that orient reviewers to the current change.

## Honor the #937051 review handoff contract

Source: user correction on Stripe Express #937051, 2026-07-16. Added prop/test comments despite standing workstream guidance and replied to binks twice; the same handoff required review fixes to be squashed.

- For this workstream, add no code or test comments unless explicitly requested; use clear names and test descriptions instead.
- Do not reply to Binks or poll/wait for its re-review; fix the code, push, and hand off immediately. David will surface any new Binks comments.
- Squash review fixes into one clean commit per PR before handoff.

## Keep semantic booleans in component APIs; encode HTML sentinels at the DOM boundary

Source: user review on Stripe Express ready-metric PR #937051, 2026-07-30.

I threaded the React 18-compatible empty-string form of `inert` through multiple
component-layer props. That leaked a DOM serialization workaround into otherwise
semantic TypeScript APIs.

Rules for myself:

- Model component props such as `hidden`, `inert`, and `disabled` as booleans.
- Convert a boolean to the required DOM representation (`{inert: ''}`) only on
  the concrete HTML element that receives the attribute.
- Do not make intermediate components and tests understand browser/React
  serialization sentinels.

## Distinguish an extraction from a future-consumer component scaffold

Source: user clarification while planning issues-monetization #6926, 2026-07-29.

A shared component can copy an existing surface while deliberately leaving that
surface unchanged because the intended consumer lands later. Do not infer that a
future cancelled-reactivation design already exists, or silently treat the work
as a current-flow migration.

- State whether the existing flow adopts the component now; without adoption,
  call the change a component scaffold rather than a runtime extraction.
- Separate the component-only PR from the later consumer PR when the issue order
  explicitly makes the component a prerequisite.
- If the issue allows either immediate adoption or a tracked follow-up, explain
  the behavioral and API costs of both before asking the user to choose.

## Do not preserve empty prototype taxonomy directories

Source: user correction on ReactivationScene PR #962857, 2026-07-29.

I copied the prototype path `components/reactivation-checkout/ReactivationScene/`
to anticipate several future shared checkout primitives. In the actual PR, that
middle directory contained only one component folder and owned no module boundary,
so it added taxonomy without structure.

- Match the current section pattern: a single shared component belongs directly
  under `components/<ComponentName>/`.
- Add a grouping directory only when it has multiple real siblings or owns a
  meaningful boundary such as exports, configuration, or shared contracts.
- Treat prototype paths as evidence, not conventions; re-evaluate them against
  the production diff and existing neighboring layout before planning.

## Keep personal specs out of tracked repository ignore rules

Source: user correction on ReactivationScene PR #962857, 2026-07-30.

I added `/specs/` to admin-web's tracked `.gitignore` to protect a local planning
capsule. That made a personal agent artifact part of the production diff.

- Before adding a tracked ignore rule for local planning artifacts, inspect the
  user's existing global excludes and keep personal workspace policy outside the
  repository.
- World policy forbids agents from modifying global or repository git
  configuration; if the global excludes rule is missing, ask the user to add it
  rather than changing their git configuration.
- Prefer `~/plans` for durable local planning when no existing global exclusion
  already protects an in-checkout specs directory.

## Talk normally — mechanics (principle is constitutional)

Sources: repeated corrections on the #6154 shimmer-data report, 2026-07-31, and
the #6154 emission-sequence diagram, 2026-08-05 (a short diagram is not
automatically clear). The "User-facing prose" commandment carries the
principle; these mechanics stay scoped.

- Lead with the plain idea; add the technical term in parentheses only when it
  adds value: "a timestamped list of recorded actions (an event stream)".
  Introduce internal names after the idea and expand every acronym on first
  mention: "Shopify's browser-event receiving service (Frontend Event
  Collector, or FEC)". Never explain one unfamiliar term with another.
- Outside-specialty test: a strong engineer outside this exact field should
  read the paragraph without stopping for a glossary. Start pipelines with
  actors and verbs; for each box state what goes in, what it adds or checks,
  and what comes out. Give a concrete example row before platform topology.
- For every proposed data table, state what one row represents and whether the
  application emits it or the warehouse assembles it later. For every
  instrumentation recommendation: what is recorded, when, which identifier
  connects it, and who performs any later join.
- Do not call missing follow-up data "abandonment" — state the observable fact
  (the wait started; no later signal was recorded) and treat exit events as
  best-effort. Distinguish a repeated user experience from duplicate delivery;
  explain idempotency separately rather than hiding both behind one term.

## Auth-gated content: ask for the artifact, never drive a sign-in

Sources: internal Google doc while evaluating #6979 (2026-08-04); Figma dev-mode values for #7058 (2026-08-10); GitHub `user-attachments` image on PR #984362 review (2026-08-10). Three corrections in one week; promoted to a global commandment — this section retains the mechanics.

- Isolated agent-browser Chrome profiles hit Google sign-in / Okta / passkey walls David cannot complete through the driven profile. Stop after the first failure and state the exact access needed; never retry.
- If a browser is genuinely required, ask which existing authenticated profile to use (David's default Chrome `Work` profile for Shopify internal docs). But AppleScript `front window` may belong to the agent-browser window and open the URL in the wrong profile again; if the Work profile can't be targeted unambiguously without restarting or attaching debugging, ask for a paste/export instead.
- Ask for everything needed in one message (e.g. Figma: box padding/gap, then per-element type); splitting the ask across rounds cost an extra turn. Offer the browser route only if the values are unavailable.
- When David hands over an image path for auth-gated content (GitHub attachments, Vault, Google Docs), that file (or a re-share) is the only channel; if the path doesn't exist on disk, ask him to re-save/drag it in — never spin up a Chrome/login flow to fetch it.

## Separate linked-issue context from user-requested scope

Source: user correction while planning issues-monetization #6928, 2026-08-04.

I prominently included #6806 in the plan even though the user asked only about
#6928. The link was evidence-based—#6928 names #6806 as both a dependent and an
acceptance-criteria consumer—but I failed to distinguish issue-derived context
from scope the user had requested.

- State why an adjacent issue matters before adding it to a plan.
- Label linked work as dependency context, future consumption, or out of scope;
  never present it as user-authored scope.
- Keep implementation and PR drafts limited to the requested issue unless the
  user explicitly approves a cross-issue change.
- If a linked issue creates contradictory acceptance criteria or sequencing,
  surface the contradiction and ask which boundary to use before planning it.
- Apply this rule to issue investigations and PR plans. A linked issue may still
  explain an API choice, but it must not silently expand the diff.

## Name a positional slot after its concrete DOM anchor

Source: two user corrections on shop/world PR #975744 (#6928), 2026-08-04 and 08-05.

A new optional slot on `CheckoutLayout.mobileHeader` went through three names before
it was right: `content` (rejected — generic, and the slot has a fixed position), then
`footer` (rejected — "not the appropriate name for header content"), finally
**`belowSubtitle`**, which names the required sibling `subtitle` prop it renders
directly after.

- **Rule:** for a positional slot, prefer the name of its concrete DOM anchor over a
  borrowed layout metaphor or a generic role.
- Sibling-prop symmetry is not enough to justify a name — `leftPanel: {content, footer}`
  made `mobileHeader.footer` look consistent, but a metaphor that contradicts the
  parent's own name (a footer inside a header) loses to the anchor name.

## Keep Slack review requests focused on the decisions

Source: user correction on the #6154 Event Refinery review packet, 2026-08-05.

I prepared an oversized root message that repeated the ADR's alternatives, API
details, and evidence. David asked for a shorter, easier-to-read request focused
only on the information needed from reviewers.

- Lead with the use case and recommended contract in a few bullets.
- Ask one scannable question per blocking decision area.
- Keep the detailed proto, alternatives, and evidence in the durable ADR; add
  them as thread replies when a reviewer needs them.
- Scope: Slack design and governance review requests backed by a longer artifact.
- Evidence: the #6154 packet was reduced to 236 words and seven numbered asks.
- Uncertainty: some schema reviews may require the full proto immediately; link
  or attach it without expanding the root request into a second design document.

## Design-spec CSS work: token traps and how to prove the result

Source: issue #7058 (cancelled-reactivation summary block), PR shop/world#984362, 2026-08-07.

Getting a Figma spec into admin-web CSS hit four traps that will recur:

- **stylelint bans _every_ unit on `line-height`** (`px`, `rem`, `em`, `%`, …), so an
  off-scale value like 18px cannot be written literally. The merchant-checkout family's
  idiom is `calc(var(--p-font-line-height-400) + var(--p-space-050))` — see
  `Checkout/AdminCheckout/LeftPanelFooter`, `StatusBadge`, `QuoteSummary`. Look for a
  sibling doing the same arithmetic before inventing a value.
- **`--p-font-weight-regular` is 450 under `.p-theme-light`, not 400.** Figma text styles
  say "Inter 400" because Figma lacks the variable-font 450. Literal numeric weights are
  lint-banned anyway, so when a spec says "Body/**Default**", _delete_ the weight
  declaration and inherit rather than chase the number.
- **`letter-spacing` in `em` inherits as a computed length, not a ratio.** Declaring the
  tracking once on a container gives every child the _parent's_ px value. If a design uses
  one ratio across sizes (here `-0.032em` → -0.576/-0.448/-0.384px), it must be
  re-declared on each element that changes font-size.
- **A flat CSS harness collapses CSS-module scoping.** `LeftPanel.module.css` and the
  section CSS both define `.Footer`; loading both raw into one page silently added 24px of
  padding. Rename in the harness copy, or the measurement lies.

**Prove CSS, don't eyeball it.** A ~60-line puppeteer-core script that loads the real token
file plus the real module CSS, then asserts `getComputedStyle` against the spec, converted
"looks about right" into a table of exact matches (sizes, tracking, colour, gaps, insets) —
and is what caught the `.Footer` collision. Connect to the existing agent-browser Chrome on
CDP 9222 and run the script from a cwd that has `puppeteer-core` installed.

**Testing Library `getByText` joins only _direct_ text-node children.** Wrapping part of a
string in a span (`$51.00 <span>USD</span>`) breaks `getByText('$51.00 USD')` even though
`textContent` is unchanged. Use `getByText('$51.00')` + `toHaveTextContent('$51.00 USD')`.
Also re-check _negative_ assertions after such a split: `queryByText('$51.00 USD')` starts
passing vacuously and stops guarding anything.

**Splitting a formatted currency string: re-derive, never parse.** `formatCurrency`'s
`explicit` form is `` `${short} ${code}` `` unless `short` already contains the code (CHF).
Rebuild from `short` + code using that same rule instead of regexing the rendered output.

## Figma spec values: confirm what a number describes before applying it

Source: issue #7058, PR shop/world#984362, 2026-08-10 (two corrections, same failure family: copied a Figma number without confirming what it applies to).

- A frame's `gap` separates that frame's _direct children_ — groups, not leaf rows. I applied a 32px group gap as per-line spacing on a dense summary list whose real per-line value was 8px. The ignored signal: a 2.7× jump from the existing 12px. Magnitude is itself evidence — when a spec value would multiply existing spacing, confirm what it separates before applying, and say plainly that it will look much airier so the reviewer can catch it early.
- Figma variables resolve per mode: `spacing/medium` / `spacing/large` were 16/32 in the desktop frame but 12/16 in mobile. Carrying desktop numbers into a mobile question produced a target (48px) _larger_ than the value being complained about (44px) — arithmetic contradicting the complaint is the tell that a value came from the wrong frame. Re-inspect at every breakpoint; when a spec number can't explain the reported symptom, stop and re-derive rather than rationalise.
- A frame whose `gap` doesn't match the rendered leaf spacing is the _wrong frame_ — treat every other value copied from it as suspect, not just the gap.
- Measuring the design screenshot is a real check, not busywork: decoding the PNG, classifying the hatched spacing bands, and calibrating against a numeric badge visible in the same image ("20") put the true total at ~26–30px and ruled out 48px before any CSS was written.
- Corollary that worked: because the harness reported `gapRow1to2` as a number, the fix was verifiable in one run. Keep measuring geometry, not just type.

## write.quick: the editor owns the text once a doc is opened

`content` and `crdtBaseContent` on a `documents` row are only a **seed**. The
first time someone opens the document, LiveDoc creates a Yjs CRDT row in the
`__livedoc` collection keyed by `name = <document id>`, and from then on the
editor renders that CRDT state. Database writes to `content` still succeed, and
still verify as correct when read back, but are invisible in the browser.

Symptom: "I refreshed and nothing changed" while every read-back check passes.

Fix: back up the `__livedoc` row, `DELETE /api/db/__livedoc/<row id>`, and let
the editor re-seed from `crdtBaseContent`. Ask the reader to close the tab
first — an open tab holds the Yjs doc in memory and can re-persist the old
state.

Future action: after publishing to a doc that has ever been opened, check
`__livedoc` for a row before claiming the update is live. Verifying the database
is not the same as verifying what the reader sees.

## Never reuse a reviewer's comment numbers for your own action items

**Failure (2026-08-17, #995644).** I numbered a disposition table 1–4 after the
reviewer's four comments, then referred to my own separate finding as "Fix 2".
Comment 2 was the one I had *rejected*. David had to stop and ask "I thought
you said 2 was a reject?" — the plan read as though I had reversed myself.

**Future action.** When responding to review feedback, keep two namespaces:
numbers for *their* comments, letters for *my* actions. State the mapping
explicitly, including comments that produce no action and actions that come
from no comment. A rejected comment and an accepted action must never be able
to share a label.

**Scope.** Any review-response writeup, PR reply, or plan derived from
numbered external feedback.

## Derive PR-body payload claims from test assertions, not from reading the code

**Failure (2026-08-18).** #995644's body claimed Signup "omits `userId`/`shopId`
rather than sending `0`". The code emits `0` for both, and a test named
`emits Signup zero join keys and relies on storeSignupUuid to join` asserts
exactly that. A reviewer caught it. The tophat checklist I wrote — "confirm a
Signup payload omits userId and shopId entirely" — would have failed on first
attempt, so the body shipped a verification step that could not pass.

**Root cause: inference stood in for tracing.** Two true facts,
(a) the builder omits a key when the host supplies `undefined`, and (b) Signup has
no usable numeric userId, were fused into a false third claim. What was never
checked is the value Signup actually supplies: `getSharedTrackingPayload` sets
`isSignupFlow ? {shopId: 0, userId: 0}`, an explicit zero, so the `undefined`
branch never runs. Reading the mechanism is not the same as tracing the value
through it.

**The verification I ran could not catch it.** Tests compare code to code; the
full suite was green while the prose was wrong. Nothing checks prose against
code, so "PR bodies are verification scripts" had no enforcement behind it.

**Future action.** When a PR body asserts anything about payload shape — a field
present, absent, zero, or renamed — grep the test file for that field and quote
the assertion into the body. If no test asserts it, either add one or drop the
claim. Prefer deriving the body's field table from test names, since a test name
that contradicts the prose is the cheapest possible signal.

**Second-order.** After any contract change, sweep every PR body and issue in the
stack for the removed vocabulary, not just the PR being edited. The same
`customFields.surface` removal left stale claims in three other PR bodies and in
two issues' acceptance criteria; reviewers then judge code against requirements
that no longer exist.

**Scope.** Any stacked PR set with a written contract.

## Currency formatting: `form: 'explicit'` already handles symbol == currency code

**Fact (verified 2026-08-19 against the installed package):**
`@shopify-internal/i18n`'s `formatCurrency(locale, amount, {currency, form: 'explicit'})`
has the symbol-equals-code case built in. Do **not** hand-roll it (as Brochure had to):

```js
function formatCurrencyExplicit(locale, amount, options = {}) {
  const formattedCurrency = formatCurrencyShort(locale, amount, options);
  if (formattedCurrency.includes(options.currency)) return formattedCurrency; // CHF, OMR
  return `${formattedCurrency} ${options.currency}`;                          // USD, EUR, DKK
}
```

`getShortCurrencySymbol` deliberately returns the full code for currencies whose symbol
*is* the code ("Some currency symbols are just the currency code, e.g. CHF and OMR").

Measured output at 39 units:

| currency | `short` | `explicit` |
| --- | --- | --- |
| USD (en-US) | `$39.00` | `$39.00 USD` |
| CHF (en-US) | `CHF 39.00` | `CHF 39.00` — not doubled |
| OMR (en-US) | `OMR 39.000` | `OMR 39.000` |
| CHF (de-DE) | `39,00 CHF` | `39,00 CHF` |
| DKK / SEK (en-US) | `kr 39.00` | `kr 39.00 DKK` |

**Two traps this creates for custom rendering**, both hit in
`CancelledReactivationCheckout` (#7343):

1. `explicit` **always suffixes** the code — there is no locale branch. Any design that
   wants a leading code is a local override, not something the formatter does.
2. When the code is already inside the short form, splitting it into a smaller `<span>`
   silently does not happen, so CHF/OMR render the code at full size, and in
   suffix locales it lands on the opposite side from every other currency.
   Fix: lift the code out of the formatted string
   (`splitCurrencyDisplay(short, code)`) rather than conditionally appending it.

**Scope:** any admin-web surface that styles the currency code differently from the
amount. #lesson

## Thread only what the page cannot answer

**Failure (2026-08-18).** #995644 threaded four identity fields from each host
tracker into a diagnostics context. A reviewer asked whether other emitters
needed `sessionId` too. They did — 46 emit sites existed and only 10 had a
context, so 36 reported the constant `'0'`. My first answer defended a scope
boundary from the contract doc, which governs new `customFields` and says
nothing about a pre-existing field being a useless constant.

**Root cause.** `sessionId` and `identityUuid` are identical for every event on a
page, and both already arrive in the serialized `server-data` node — the same
node `AdminContext.serverData` reads. Threading them created an obligation at
every call site for values that were already reachable. `payload.pathname` is the
tell: it is required on every row and nobody threads it, because the builder
reads `window.location`.

**Future action.** Before adding a parameter to carry a value, ask whether the
value varies per call site. If it is constant for the page, read it where it is
consumed. Thread only what the consumer genuinely cannot answer — here that was
`userId` (Signup deliberately zeroes it), `shopId`, and `countryCode`, all
shop-scoped and absent from `server-data`.

**Also.** A reviewer asking "does X need this too?" is often reporting that the
design has an N-call-site obligation, not asking for N edits. Check whether the
obligation itself can be removed.

**Verification note.** A bare `type-check.sh` run reported clean while
`fastcheck branch` found three errors — the incremental cache lied. Trust
fastcheck. And after changing a type in a package with generated `.d.ts`,
regenerate with `pnpm run -r generate-dts` or every consumer error is a phantom.

**Scope.** admin-web diagnostics; the principle is general.

## Review a PR's *unresolved* threads, not all its comments (2026-08-21)

**Failure.** Asked to review binks' review on #1001494, I pulled
`GET /pulls/:n/comments` and analysed all five findings — including one David had
already fixed and resolved days earlier. He had to correct me: "I think you
looked at all comments instead of what was open."

**Why it happened.** The REST review-comments endpoint has no resolved/outdated
field. Resolution lives on the GraphQL `reviewThreads` connection
(`isResolved`, `isOutdated`). REST silently returns settled threads as if live.

**Future action.** For "review the review", query unresolved threads:

```graphql
{ repository(owner:"shop",name:"world") { pullRequest(number:N) {
  reviewThreads(first:50) { nodes { isResolved isOutdated path line
    comments(first:1){nodes{author{login} body}} } } } } }
```

Filter `isResolved == false`. Report the count reviewed vs skipped so the
mismatch surfaces immediately if the filter is wrong.

**Scope.** Any "look at the review feedback" request on a PR with history.
Fresh PRs are unaffected, which is why this stayed hidden.

## Let the repo's own lint adjudicate a style finding (2026-08-21)

Binks asked for `margin: -1px` on a `.VisuallyHidden` block. I built a case from
convention (22 of 25 in-repo blocks omit it) and from CSS semantics (the element
is `position: absolute`, so it is out of flow and cannot shift siblings — the
finding's stated harm does not follow). Both true, both arguable.

Then stylelint settled it: `polaris/space/declaration-property-unit-disallowed-list`
rejects `px` units on `margin`. Keeping the change required a `stylelint-disable`,
which AGENTS.md bans. The suggestion was unimplementable, not merely unidiomatic.

**Lesson.** On a contested style point, run the linter before writing the
argument. A objective "the build rejects this" closes a thread that prose cannot,
and it takes one command. #lesson

## Answer the question first; keep the findings, move them (2026-08-25)

**Failure.** David asked one causal question — why Cancelled Plain shows a
`Change plan credit` row but no credits note. The answer is three lines. I sent
the answer plus a derived shop table, two classes of arithmetic ambiguity, a
narrowed re-query, and a design implication. He had to ask the same question
twice, the second time with "answer only what I asked for".

**This was a repeat.** The preference was recorded in `memory/MEMORY.md` the day
before — "answer the question asked", "paragraphs create friction and spawn
tangents". It did not fire, so the principle was not enough.

**Root cause, and it is not verbosity.** While answering I keep finding adjacent
things — a table that needs updating, an ambiguity, a design consequence — and
attaching a real finding to a real answer feels like added value. It is not. It
buries the answer, and it hands David a queue he did not ask for. Thoroughness
in *investigation* is the job; thoroughness in *the reply* is friction. The same
day I did it on "have you pushed the branch" (answer + three sub-findings) and
on "give me a table" (table + a doc + six design questions).

**Corrected by David, same day.** The findings themselves are wanted — they
"cloud judgement when I need an answer to make a decision". The defect is
*placement*, not existence. Do not suppress them and do not exile them to a
file; separate them so the answer lands first and the extra is visibly optional.

**Future action.**

1. **The only test of a reply is whether David understood the answer to his
   question.** Everything else in the message is optional and must look
   optional.
2. **Answer first, complete, and alone.** A question shaped `why…`, `where…`,
   `have you…`, `is it…`, `which…` gets its answer with nothing interleaved —
   no caveats mid-answer, no adjacent findings, no implications.
3. **Then a distinct section**, under its own heading, clearly skippable. Never
   woven into the answer, never above it, never a wall of prose that has to be
   read to reach a decision.
4. **When corrected on this, acknowledge in one line.** A post-mortem about
   being too long is the same mistake wearing a different hat.

**Uncertainty.** How much belongs in the optional section is still unsettled —
the extras were called "fine", so the volume was not the problem. Erring toward
including them, separated, is safer than dropping them.

**Scope.** All interaction with David, every project. Not a code-style lesson.

## The comment bar: the code has to be unreadable without it (2026-08-25)

**Failure.** #7343 shipped 61 added comment lines. David asked twice to cut
them, raising the bar each time, and the final count was **11**. Both of my
first two bars were too low. "Explains why, not what" let through essays. "Would
someone undo this and reintroduce a bug?" still let through nine, because I can
always imagine someone undoing something. The bar that worked: **the code cannot
be read without it.** Not "the history is interesting", not "the reasoning was
hard" — unreadable.

**Why I over-comment.** I write comments while reasoning, so they are
notes-to-self that survive into the diff. The reasoning belongs in the
plan/report file. If a comment is the only record of an investigation, the
investigation was not written down properly.

**Tests that killed a comment.** Reusable:

- **A shared variable is not a hazard.** I kept a comment warning that padding
  and outdent must stay equal — they are the *same CSS variable*. The invariant
  is structural; the comment described a bug the code had already made
  impossible.
- **A named test outranks a comment.** `it('collapses the breakdown again after
  a plan-picker round trip')` documents the effect better than a comment above
  it, and it fails when someone deletes the effect.
- **Visible-on-load effects need no comment.** A chevron pointing the wrong way
  is seen immediately, and a harness asserted it besides.
- **A comment about an absence has no code to explain.** "No margin here
  because…" is a changelog entry.

**Tests that saved a comment.** Also reusable:

- **A magic constant's derivation.** `calc(var(--p-space-500) + var(--p-space-100))`
  is unrecoverable without "chevron icon + its gap".
- **A rule that exists for one surface only.** `[mobile-bridge='true']` carrying
  a margin the mobile breakpoint deletes cannot justify itself.
- **A normative requirement.** "WCAG 2.5.3 Label in Name" looks like redundancy
  and gets tidied away; the criterion number is the whole comment.
- **An identity behind a boolean.** `[a, b].some(x => x > 0)` does not say why a
  third term is excluded.
- **A format quirk.** "CHF and OMR format their symbol as their code" explains
  why a function exists at all.

**Future action.**

1. Write the reasoning in `~/plans/<project>/`, not in the source. Then ask what
   the code still cannot say for itself.
2. Before keeping a comment: is there a shared variable, a named test, or a
   visible-on-load effect that already carries it? If yes, cut.
3. **Do not gut someone else's comment.** Compress it and say so, so they can
   veto. I cut another session's twelve-line block to two lines and flagged it
   rather than deleting it.
4. When editing multi-line comments programmatically, **match the whole block.**
   I matched the tail of a three-line comment and left a dangling half-sentence
   about foreign-currency balances; only a re-read caught it.

**Scope.** All Shopify code. The convention is in `AGENTS.md` ("default to
none"); this is how to apply it without three rounds of review.

## Copy strings belong to their owners — confirm before implementing (2026-08-28, #7606)

Merchant-facing copy went through two reversals on one draft PR: I proposed
TRN's "No commitment, cancel anytime.", David asked for the shorter
"Cancel anytime.", I implemented and verified it, then he wanted the full
string back. Each cycle cost a full test + fastcheck + tree-wide oxfmt run.

When a copy decision has named owners in the source thread (here Simone Arora
and Patrick Smith on the TRN thread), ask whether the wording is settled
before committing, rather than treating the most recent instruction as final.
Implementing is the cheap part; the verify loop is not.

## `subtitlePrimary` / `subtitleSecondary` in InactiveAccount are POSITIONAL keys

In `CancelledReactivationCheckout/translations/en.json` these two keys mean
"first line below the headline" and "second line" — their `_context` strings
say so explicitly. Reordering the two subtitle lines is therefore a
values-and-context edit in `en.json` with **no component change**, and the
desktop left panel plus the mobile header both read the same two keys, so one
edit covers both surfaces. Do not rename them to semantic keys as part of a
copy change: that deletes keys in 35 generated locale files and drags in
`translations:cleanup-deleted-translations` for no benefit.

## Read the section's scene-style override before trusting dark-theme panel geometry

`CANCELLED_REACTIVATION_SCENE_STYLE` sets `--signup-layout-panels-max-width:
900px` and `--signup-left-panel-width: 47.7%`, so the left panel is ~422px with
a 358px content box — which is exactly the `.LeftPanelContent` `max-width: 358px`.
The base `[data-theme='dark']` values (818px wrapper, 45% panel) are wrong for
this surface. Any mock or reasoning about line wrapping must start from the
section's override, not the theme default.

## A displayed total must reconcile against its itemized rows

Source: two failures 48h apart on #7343, then a live repro on shop `fhgzzb-6t`
(PR shop/world#1011806, commits `1932070ff` / `ac7c5aa1`), 2026-08-24 → 08-26.
David caught both by pushing on the numbers.

I replaced a value computed as a **residual** (`total − known_terms`) with a read of
two **named** credit fields. A residual is correct by construction — it absorbs
whatever moved the total, whatever the cause. A named-field read is only correct if
those fields are the complete set of things that can move it. They were not: a $38
paid-trial *discount* moved `renewalPrice` → `totalPrice` with all three known credit
fields at zero, so the note vanished while the total still changed.

- **Future action:** before swapping a residual for named component fields, verify
  `sum(itemized rows) == total` across the real case matrix — discount-only,
  credit-only, both, neither. Do not assume the fields you found are exhaustive.
- **Why it recurs:** Core moves a billing total from more than one subsystem
  (`Discounts::*`, `SubscriptionPromotions`, credits). Enumerating "the credit fields"
  feels complete and is not.
- **Scope:** billing/checkout/subscription cards that show a total beside itemized
  rows. Not a general "always sum things" rule.
- **Unknown:** whether this generalizes past Core billing quotes — no second feature
  area has confirmed it yet.

## Never infer a reviewer's identity from project context (2026-09-01)

On PR #1015078 I read a review comment from GitHub handle `anicn` and called the
author "Annie" in my summary, because an Annie had been active on the same project.
`anicn` is **Niko Anic**. David corrected it.

`gh api users/<login> --jq .name` is one call and settles it. A handle that looks
like a name is a coincidence, not evidence. Getting this wrong is worse than a
typo: replies are addressed to a person, and misnaming a reviewer in a drafted
reply would have gone out under David's name.

**Rule:** before attributing a comment, review, or commit to a human by name,
resolve the handle. Never pattern-match a login against people already in the
conversation.
