# Wally lessons

- Treat root and service agent docs from V2 as legacy evidence, not active rebuild requirements; keep rebuild memory clean and concise.
- Never carry R-multiple or SQN objectives into the rebuild after the user explicitly rejected them.
- Record the user's top-down objective before proposing implementation details: consistent net gains over volatility, early loss exits, and room for winners to run.
- When a user-defined equation conflicts with standard metric terminology, preserve it verbatim and ask for term definitions rather than silently substituting another formula.
- Prefer a clean-room implementation directory and pull proven V2 components across explicit boundaries instead of evolving V2 in place.
- Do not lock the V3 schema before the research and backtesting workflow is understood; domain entities must follow the trusted lifecycle.
- Never present an LLM enum-selection loop as research intelligence. Use LLMs only where language reasoning adds value, and keep search or validation methods transparent to the user.
- During Discover, do not convert preferences such as “option 2 makes sense” into durable decisions. Record requirements inputs and hypotheses, gather evidence, then require explicit user confirmation before locking anything.
- Keep recommendations out of active agent memory until research validates them; label proposed research methods, data sources, metrics, and schemas as unvalidated.
- Treat generic trading wisdom such as 1% compounding as tie-breaker guidance, not quantitative acceptance criteria. Evidence wins; consult commandments only when options are otherwise even.
- Make environment-neutral diagnosis a first-class Wally requirement. Sim, paper, and live must expose enough common evidence to explain data, decisions, orders, fills, costs, state, and divergence.
- Do not hard-code flat-by-close from the initial intraday framing. Treat mandatory close versus evidence-governed overnight continuation as a hypothesis, and model overnight risk, ongoing-position decisions, and overlapping-entry constraints before choosing.
- Do not assume advertised signup credits, trial balances, or promotions apply to the user's existing vendor accounts. Treat them as unavailable until account-level entitlement is measured.
- Do not declare the just-in-time data-connection gate reached while the concrete build boundary and system architecture remain unconfirmed. Define what is being built, compare architecture options, and select boundaries before connecting production data.
- Do not ask the user to approve architecture before presenting a concrete research algorithm and trading-policy candidate. Product behavior, hypothesis search, admission, entry, risk, exit, and promotion logic must be reviewable first.
