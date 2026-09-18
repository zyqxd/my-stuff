# Lessons — LLC incentive / ZenBusiness

## Keep app capability research separate from the project's approved responsibilities

2026-09-10: I added Hedwig workers and cron to the proposed 1P Rails app milestones
because other Rails apps use them. David corrected this: no Hedwig or background
jobs in the LLC 1P app; background work runs in `Shopify/incentives`, which publishes
milestone projections asynchronously to the app.

For this project, prioritize the Rails merchant surface, authenticated local
milestone lookup, persistent projection storage, and inbound projection application.
A capability found in a precedent is not a requirement to adopt it. Do not add an
app scheduler or worker fleet merely to learn background processing. The canonical
design still names an app-local `ClaimCreated` outbox; its delivery mechanism needs
its own contract and is not permission to add Hedwig or redesign the async flow.

Evidence: David's explicit correction in the 1P app session; issue
[shop/issues-monetization#7819](https://github.com/shop/issues-monetization/issues/7819),
which points to [Shopify/monetization#6820](https://github.com/Shopify/monetization/pull/6820)
as its source of truth (checked at `a05cf1534eec4e3a4e728a283398d871866af005`).

## Commit one learning epic at a time

2026-09-10: After I proposed another gate-definition review, David explicitly
committed to e01 and said to use workers, add only the minimum code needed for
its gate, and review at the end of the epic. A six-epic plan is an inventory,
not permission to build later milestones or keep inserting planning reviews.
For this foundation, execute the authorized epic, preserve real security and
access prerequisites, and defer reusable scaffolding that does not establish
its observable outcome. Record actual evidence and review at the epic boundary;
do not require David to reconfirm gate definitions before starting.

Scope: LLC 1P learning-first foundation. This is not a waiver of authentication,
privacy, migration safety, or separate rollout approval. Evidence: David's e01
kickoff instruction in the 2026-09-10 1p-app session.

## Operator checklists need commands, not capability descriptions

2026-09-10: I told David to inject values through “approved secret tooling” and
start an “approved HTTPS tunnel” without giving the commands that perform either
step. David corrected this as unhelpful and asked for actual commands in every
section, reusable by any operator, while preserving completed steps and evidence.

For this app, show safe hidden Bash prompts, export all five variables, explain
their shell lifetime, and give the exact tunnel/server/verification commands. Keep
generic procedure separate from the current run record. If production infrastructure
or an irreversible dashboard workflow has no verified command, label it blocked and
state the exact artifact, owner response, or UI action required; never hide that gap
behind an abstract verb. Describe dashboard placement literally: `Home → Install app`
is not a nested menu path; select **Home** in the left panel, scroll down, then select
the **Install app** control on the page. Preserve existing checkmarks and non-secret
values, and correct mislabeled fields without dropping their original data.

Scope: operator runbooks and checklist issues for the LLC app. Evidence: David's
explicit correction and the Oracle-reviewed rewrite of shop/issues-monetization#7847;
the rewrite preserved all 14 completed checkboxes and separated organization ID
`134587708` from app ID `421932892161`.

## Distinguish repeated configuration from generating unique credentials

2026-09-11: David clarified that “do they need my credentials?” meant whether
new developers must repeat Client secret / encryption key / salt setup, not whether
they need his employee login. Each Rails process needs the values, but a unique
primary key and salt per developer is not a cryptographic requirement. A team can
share development-only encryption values through secret storage; do not embed real
keys in source or assume a loader exists. Automatic provisioning remains a proposed
change, not approved implementation.

In the current manually released-version flow, sharing an app registration also
shares its application URL, so independent laptop tunnels conflict. Qualify this
claim: Shopify CLI supports development-store previews, but that workflow is not
configured in the foundation. Do not turn the separate-app recommendation into a
universal restriction on Shopify apps or on encryption keys.

Scope: LLC developer onboarding. Evidence: David's clarification during creation
of shop/issues-monetization#7852 and the current app-configuration documentation.

## Runnable instructions still need concise prose

2026-09-11: David found #7852 too wordy after the commands were added. He required
editing the live issue rather than restoring an earlier draft because he had changed
the registration steps and added a screenshot. Preserve those edits and runnable
commands; cut repeated explanations and reference tables, and fold long check scripts
and note templates into disclosure sections. Do not shorten safety warnings to meet a
word target. The revision reduced prose from 2,593 to 1,813 words while retaining his
registration wording, screenshot, callout, all command blocks, and checkbox states.

Scope: the LLC onboarding template, not a reason to remove required operational detail.

## Test tunnel naming with the real username and TLS boundary

2026-09-11: Replacing a working explicit tunnel name with
`llc-formation-${USER}-dev` broke onboarding for `USER=david.yq.zhang`. The CLI
accepted the dots and DNS resolved, but the name fell outside the certificate's
single-label wildcard `*.tunnel.shopifycloud.tech`. TLS failed before Rails; app
uninstall/reinstall and new configuration versions could not repair it.

Use `llc-formation-${USER//./-}-dev` for this Bash/zsh runbook. Both shells were
checked with the actual username. A same-edge TLS control accepted the hyphenated
SNI and returned the expected certificate SANs, while the dotted name failed with
alert 40. Validate external hostname derivation using real inputs and certificate
coverage, not just synthetic examples or successful DNS resolution. Keep keys
unchanged during recovery; update the tunnel, Rails HOST, and released App URL.

Scope: LLC tunnel instructions in #7852 and #7847; both were corrected while
preserving the user's current screenshots and edits. Do not bypass TLS verification.

## Keep developer startup on the standard dev interface

2026-09-11: David rejected the unexplained `shadowenv exec -- just dev` proposal:
why not `dev server`, and what new behavior would the extra name provide? He wants
one-time app/store selection and automated secret setup, ideally through `dev up`.
World already maps zone Just recipes to `dev` commands and applies Shadowenv during
dispatch; `dev help server` confirms the LLC server entry exists. Prefer `dev up`
for environment/services/persistent-secret loading and `dev server` for the complete
local startup. Explain the behavioral change (Rails-only versus tunnel + Rails +
store preview), not a new wrapper name. Runtime HOST must follow the actual tunnel;
its automatic injection belongs at startup, without another manual user step.

Scope: proposed LLC development-tooling improvement; no implementation was approved
or performed in this clarification.

## Do not promote a temporary validation app into the shared registration

2026-09-11: During #7857, David supplied the existing david-dev Client ID and store
for validation. I recorded that pair as the intended final shared target. He clarified
that it is temporary: the finished workflow must use a newly created, team-owned
development app, with a separate Dev store per developer. Preserve david-dev instead
of renaming, deleting or silently making it the shared app.

Keep temporary validation identity, final shared development identity and future
production identity distinct in the plan and configuration. The final checked-in
app TOML must use the new shared Client ID. A new registration needs its own initial
installation; existing offline tokens belong to the old app and are not portable.
Changing registration does not itself require rotating Rails encryption keys.

Scope: LLC #7857 registration transition. Source: David's explicit clarification
that confirming `b5457f56654d6671e7306ebb5be7927d` (david-dev) is temporary and a new
development app is the final outcome. No app registration or secret was changed
while recording this correction.

## Separate shared app setup from personal store/login onboarding

2026-09-11: My new-shared-app walkthrough bundled creation of a fresh store with
team setup and asked David to return both identifiers. He corrected the framing:
only the app is shared; each developer uses their own login and store. The new
onboarding task and README change are deferred together.

Request only the new app's Client ID/dashboard URL for shared setup. Do not create
or name a team-shared store, request shared login credentials, put `dev_store_url`
in the tracked app config, or hard-code David's domain in `dev server`. A developer
selects an existing compatible personal Dev store (or creates their own if needed)
through local CLI state or `--store`. A fresh-store acceptance test is a personal
test case, not a shared-store configuration requirement.

Scope: LLC #7857 instructions and onboarding. Source: David's explicit correction
that the store is developer-specific and logins/stores are not shared. No app,
store or login was created or changed while recording the correction.

## Store switching should not restart app registration setup

2026-09-12: David wanted the store-selector TUI, not a domain argument or the full
`--reset` flow, which presented organization choices. CLI 4.1.0 connects `--reset`
to both app relinking and store reselection. He approved a local `dev server
--reset-store` option that preserves the selected app/organization and clears only
its remembered store, reusing the native picker. One eligible store still follows
the CLI's automatic-selection behavior. Keep broad reset for intentional app
relinking, and distinguish organization IDs from store choices in explanations.

Scope: LLC #7857 local developer startup; implementation was starting when recorded.

2026-09-15 update: David explicitly approved dropping `--reset-store` while
addressing Dave Ariens' review of PR #1019339. The earlier store-only requirement
no longer blocks removal of the wrapper's private Shopify CLI cache mutation.
Use and document standard CLI `--reset`, including its app-relinking behavior;
this approval does not authorize deleting personal configs or changing Prisma.

## Open-question lists track unanswered discussion, not unfinished implementation

2026-09-14: The initial design-doc question list retained answered threads by
extracting narrower unfinished details, including archival retention, MTT fallback,
and a deferred mirror optimization. David asked to remove rows where sufficient
conversation had already occurred. Read the replies for an answer, chosen approach,
or agreed follow-up; an unresolved comment marker alone does not justify keeping
a row. Keep unanswered counterproposals and follow-up questions, rather than using
reply count as proof of resolution. This is a discussion-list criterion, not a claim
that implementation or production validation is complete.

David initially requested no Author column for unattributed questions, so the first
revision separated authored and unattributed tables. Later on 2026-09-14, after the
kickoff/build grouping, he requested one combined table per phase and clarified that
“post build” meant During build. The current layout uses **Pre-build** and **During
build**, with blank Author cells for design-derived questions. Organize this list by
decision timing, not source type; retain source links and known attribution without
reintroducing “Not recorded.” The substantive discussion criterion above is unchanged.
Scope: this LLC design's stakeholder question list.
Evidence: `~/plans/llc-incentive/design-doc/inbox/2026-09-14-open-questions-audit.md`.

## Replacement implementations keep the canonical app zone name

2026-09-14: I created the React Router alternative at
`//areas/apps/llc-formation-react-router` to let it coexist with the Rails spike.
David corrected that the new implementation should still be
`//areas/apps/llc-formation`; the Rails implementation was no longer needed.

When an alternative stack replaces rather than supplements an implementation, keep
the product's canonical zone path and identity. Put technology distinctions in branch
names, design notes, or isolated database names—not the permanent app path. Preserve
the prior local database namespace while an old checkout is still running, and do not
move or close old PRs unless their actual state and user authority require it.

Scope: replacement implementations of the LLC 1P app. Evidence: David's correction
and the reviewed rename in `~/plans/llc-incentive/1p-app/inbox/2026-09-14-react-router-zone-rename-review.md`.

## An example app config is not a runnable Shopify config

2026-09-15: `dev server` treated tracked `shopify.app.example.toml` as proof that
the project had a runnable app config, then Shopify CLI failed because no
`shopify.app.toml` or named personal config existed. My first recovery command also
incorrectly copied the example before `shopify app config link`; the CLI writes
`shopify.app.personal.toml` itself.

First-time setup is `pnpm exec shopify app config link --config personal`. After
that, the wrapper may infer the sole named personal config for plain `dev server`.
It must not infer when multiple configs exist or when broad reset, Client ID, or
environment overrides are selecting app identity. Before setup, fail with the exact
two commands and do not create a session key, mutate CLI cache, or invoke app dev.

Scope: LLC React Router development startup. Evidence:
`~/plans/llc-incentive/1p-app/inbox/2026-09-15-react-router-review-sync-review.md`.

## Do not identify a Dev Dashboard organization from the CLI picker

2026-09-15: The onboarding issue told operators to select numeric organization
`134587708`, but Shopify CLI 3.84.1 displayed only names such as “My Store” and
“Tiny Bones CA.” David correctly asked how anyone could map that list to the ID.
The list itself cannot establish the mapping.

Verify the organization in the Dev Dashboard URL. Link an already-created app by
its exact Client ID to bypass the ambiguous organization picker. Do not promise a
configuration-name prompt: CLI 4.8 can derive `shopify.app.<app-name>.toml` without
asking. Use that config name explicitly, or rename the ignored file after checking
that the destination does not exist. A store domain also does not prove organization
membership; verify its Dev Dashboard details URL and pass its exact existing
`myshopify.com` domain to `dev server --store`.

A Client-ID link can create an app-name-derived file if the operator does not enter
`personal` at the filename prompt. If that leaves multiple named configs, the wrapper
must refuse to guess. Inspect each with `shopify app info --config NAME`, then pass the
verified name explicitly. Do not delete a local TOML until its remote app and
organization are identified.

Scope: LLC first-time app/store onboarding. Evidence:
`~/plans/llc-incentive/1p-app/inbox/2026-09-15-7871-organization-picker-correction.md`.

## Treat the channel-specification error as a pinned CLI regression

2026-09-15: The first React Router preview failed with “At least one
specification (.toml OR .json) file is required” and linked sales-channel docs.
The app did not need a channel extension. The zone pinned Shopify CLI 3.84.1,
and Shopify staff identify this as a 3.84.x server-side regression fixed by
upgrading to at least 3.85.

Check the project-local CLI dependency before changing the app registration or
adding extension files. Upgrade the pinned CLI and lockfile; a global CLI update
does not replace `pnpm exec`'s local dependency. Keep the claim bounded: the error
comes from the backend and is absent from both local bundles, so only a live retry
proves the upgrade fixed the current app.

Scope: LLC React Router local preview. Evidence:
`~/plans/llc-incentive/1p-app/inbox/2026-09-15-cli-preview-regression-publication.md`.

## Use Prisma 6 and Shopify-maintained session storage for this pilot

2026-09-15: David explicitly chose Prisma 6 with the SimGym-style stock adapter
and `PrismaSessionStorage`. Rationale: this app is intended to be retired after
the six-month experimentation phase, and the team prefers the established
implementation over owning custom session storage. This supersedes the earlier
recommendation to retain Prisma 7; do not keep re-litigating the ORM decision.

Apply the compatible current Shopify adapter rather than copying SimGym's older
Shopify API pins. The previously documented Prisma-6 support cutoff remains an
operational risk, not permission to reverse David's choice. The stock adapter
changes application-level token-encryption behavior; preserve authentication,
shop isolation, safe cleanup/concurrent scope updates, and migration safety.
No retirement start date, production deployment, data deletion, or database
infrastructure encryption setting was established by this decision.

Evidence: David's explicit instruction in the PR #1019338 session to begin
Prisma 6 integration immediately using the SimGym adapter/PrismaSessionStorage
pattern; comparison evidence is in the 1p-app inbox.

## Main-issue gaps can be decisions deferred to build

2026-09-15: My source checkpoint framed several unresolved LLC contracts as matters
to settle before drafting. David directed me to punt as many decisions as possible
to build and label unclear details explicitly as decisions deferred to build.
ZenBusiness leads the partner claim-enforcement design; a joint solution involving
extra Shopify data is discovery, not committed fields or Shopify-owned enforcement.
After exploring single-MTT and dual-grain variants, David confirmed one MTT-grained
experiment for brochure and new/established merchants (September 15). Established
shops use the earliest non-empty MTT across all conversion records of all shops
currently owned by the identity, persisted to the central store and shared across
those shops' assignment. One store per identity can claim. Brochure visibility can
still precede a finding of shop ineligibility. These choices are decided; only details
such as empty candidate sets, ordering ties and ownership-change refresh remain open.
Evidence: `~/plans/llc-incentive/design-doc/inbox/2026-09-15-7903-raw-experiment-change-brief.md`.
When I requested the inaccessible ExP proposal snippet, David clarified that marking
the component deferred is sufficient. Do not make reading that proposal another gate.
Brochure also remains in discovery: the reported ceiling is 88 existing bundle pages
plus experiment wiring. Design must finalize surfaces and treatments. Do not turn that
inventory into 88 committed changes or assume that one extra bullet is the full design.

For this main issue, retain each deferred question, owner and latest needed point.
Do not invent an answer, create a blanket pre-build discovery phase, or turn a
possible joint solution into acceptance criteria. Legal/security approval before
production data and other source-defined release gates still apply. Shopify's app
lifecycle invariants remain separate from ZB's partner enforcement design.

David also chose a six-month redemption window from first becoming paying, with a
one-month assignment buffer: no new assignment more than five months after that
start. Do not collapse assignment and redemption eligibility into one cutoff.
Evidence and source links: `~/plans/llc-incentive/design-doc/inbox/2026-09-15-main-issue-drafting-brief.md`.
Scope: this LLC main issue and its downstream decomposition, not a global waiver
of design or release approval gates.

2026-09-16 update: During issue-writer decomposition, David explicitly chose a
**six-month assignment window for now**, aligning with #7895, with a caveat that
the five-versus-six-month decision remains pending in
[the eligibility-window thread](https://shopify.slack.com/archives/C0B7M8T5CR5/p1789408971672299?thread_ts=1789408715.771199&cid=C0B7M8T5CR5).
This supersedes the five-month assignment cutoff above for current ticket drafting;
it does not extend redemption beyond six months from first becoming paying or
settle clock/time-zone/inclusive-edge details. Preserve the pending-decision link
in affected tickets. David approved the proposed issues as subissues of #7903;
new issues must carry `#gsd:52299` and project status `Inbox/Triage`. Existing
anchors remain unchanged.

Later September 16, David supplied the settled addendums, superseding that interim
assignment wording: the redemption deadline is six months from the **first paid-plan
selection (paid trial counts)**, and new assignment of existing shops skips those
with **less than one month remaining**. Showing/assigning the offer later never
restarts the deadline. Apply the minimum remaining month to assignment, not to an
already-assigned merchant claiming in their final month. Source: the latest Product
reply in [the same thread](https://shopify.slack.com/archives/C0B7M8T5CR5/p1789408715771199).
David authorized issue-body updates, including replacing contradictory interim text.

The same addendums settle app pinning: **pin on claim, unpin 30 days after successful
LLC formation, do not uninstall** ([thread](https://shopify.slack.com/archives/C0B7M8T5CR5/p1789512365267569));
and the LLC app serves a **well-known JWKS endpoint** for public verification keys
and asymmetric signed claim handoff ([thread](https://shopify.slack.com/archives/C0B7M8T5CR5/p1789573696194519)).
JWKS enables verification/rotation, not single-use enforcement. Keep the internal
JWKS decision distinct from the remaining partner token/passthrough contract and
single-redemption acceptance. Owning issues: #7914, #7926, and #7931 respectively.

## Separate client surfaces from server and LLC-app delivery

2026-09-15: David directed the raw LLC working spec to bifurcate into client-facing
changes and server changes, explicitly placing the first-party LLC app in the server
track. Designs are pending review.

Client-facing means brochure and admin-web capabilities A1–A3. Server/app means Core
claim rules A4, LLC app B1–B4, Core lifecycle C1–C3, BusinessFormation D1–D10 and
integration contracts E1–E3. Preserve capability IDs and explicit cross-track contracts.
Do not put the LLC app in the client track merely because it renders merchant UI.
Design review gates final client surfaces and app presentation, not all backend/data
work. Raw source stays intact; derived companion specs can duplicate necessary context
for standalone use and are not compressed.

Evidence: `~/plans/llc-incentive/design-doc/inbox/2026-09-15-7903-bifurcation-recovery-validation.md`.
Scope: LLC main-issue organization and downstream decomposition.

## write.quick uses Quick IAP and a dedicated document CLI

2026-09-15: I treated an `http_internal` response containing Google IAP sign-in as
lack of write.quick permission. Investigation showed no account-level denial.
`http_internal` did not inject Quick's Google IAP identity token, and David's cached
Quick token was expired. A refresh-token exchange succeeded without browser auth;
authenticated write.quick and identity reads returned HTTP 200.

Generic `quick mcp write` is intentionally read-only. Tool Gateway has no Quick
backend. The supported mutator is `@shopify/write-cli` (`write-cli write/update`),
which POSTs/PUTs the `documents` collection with `Proxy-Authorization`; it is published
but not installed on this machine. `/usr/bin/write` is Vim. Do not use `quick deploy`
to create a document—it overwrites the app site. For private documents the author can
edit; collaborative documents permit link holders to edit. Do not claim a permission
denial without a real 401/403 from the write CLI/API.

Evidence: `~/plans/llc-incentive/design-doc/inbox/2026-09-15-write-quick-permission-investigation.md`.
Scope: write.quick document publication and updates.
