# Spendr — product boundaries

## Linked funds and trip categories — 2026-09-08

Source: David's answers following the production-data/UX audit in the Spendr session on 2026-09-08.

- “Attachments” means linked funds: reimbursements, refunds, and related transactions. Never interpret this as receipt images, PDFs, or other file attachments in Spendr.
- Trips are lump-sum spending buckets. An Uber ride at EDC belongs to **EDC**, not Rideshare plus an EDC tag. David explicitly considers the extra granularity unhelpful. Preserve this category model when improving rules or analytics; do not treat differing trip/routine categories for one merchant as proof of misclassification.
- Those initial answers clarified scope; David subsequently authorized the proposed first implementation slice with “Skip to execution.” Neither that authorization nor merchant grouping permits automatic rule deletion, historical relabelling, or taxonomy migration. Preserve deliberate trip-specific decisions.

## EMT review expectations — 2026-09-08

Source: David's follow-up during implementation in the same Spendr session.

- Incoming e-transfers need a direct Income action in Review; requiring categorization as spending/refund misrepresents their purpose.
- When attaching funds to a purchase, allow category search and prioritize purchases closest before the EMT date. This is a relevance preference, not a ban on deliberate later-purchase links already present in the ledger.
- “Mark transfer” must not resolve and hide one side alone. An internal transfer needs an explicit pair whose two amounts cancel; unresolved counterparts remain visible. This supersedes the old one-sided manual acknowledgement experience for new actions. Do not infer permission to delete either ledger row or bulk rewrite existing/closed history.

## Useful spending views — 2026-09-08

Source: David's subsequent Trends feedback during implementation.

- Prefer monthly totals aligned by year (February versus February) over the full-history chronological “Every month” chart. The one-off list mainly repeats vacation expenses and does not help; remove it from this main view, not from accounting totals.
- Keep category small multiples (“What the money goes on”), with a shorter rolling 12-month range and useful monthly averages instead of lifetime averages. Show the actual range and coverage; missing imports are not zero spending.
- Keep Commitments, which identifies reducible costs, and Biggest movers. David explicitly finds both useful; do not remove them as hidden-feature cleanup.
- Cash withdrawals are not commitments. David identified `WITHDRAWAL PTB WD ---` at $200 as cash taken out when needed, not a $2,400 annual obligation. Repeated denominations can fool the amount-stability heuristic. Exclude recognizable ATM/cash-withdrawal descriptors from commitment inference, while preserving their spending rows, categories and totals; do not broadly exclude legitimate recurring debit payments.
- After trying the monthly comparison, David requested chart hover with a tooltip like YTD, rather than the implemented always-visible month dropdown/value table. Make hover the primary comparison; retain a compact keyboard/touch alternative without imposing a bulky permanent control panel.
- David also reported apparently broken styles after the functional pass and requested screenshots per page. Verify actual rendered pages and interactive states with images and computed styles; zero overflow and passing interaction tests alone do not establish visual quality. The specific style defects still required investigation when this feedback was recorded.
