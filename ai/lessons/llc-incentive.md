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
