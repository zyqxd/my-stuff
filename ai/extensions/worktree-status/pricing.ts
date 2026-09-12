/**
 * Pi's model cards price at the vendors' public list rates. Shopify buys through
 * the AI Proxy on negotiated contracts, so every proxied dollar is cheaper than
 * the card says. This module converts a list-priced amount into the contract
 * amount the proxy records, which is what team dashboards, `ai_proxy_requests_
 * with_pricing` and finance reporting all count.
 *
 * Rates are read from `shopify-dw.infrastructure.ai_pricing_history`, the same
 * table the warehouse prices requests from. The discount is uniform across
 * input, output, cache read and cache write within a vendor, so one factor per
 * model family reproduces the warehouse exactly, without a per-dimension table.
 *
 * Refresh with (2026-09-12: 932 current rows, one discount per vendor family):
 *
 *   SELECT normalized_vendor, normalized_model_name,
 *     uncached_input_text_tokens.effective_discount
 *   FROM `shopify-dw.infrastructure.ai_pricing_history`
 *   WHERE is_current AND service_tier = 'standard'
 *
 * Contracts are renegotiated and promotional rates expire — gpt-5.6-sol's runs
 * out around 2026-11-21 — so a stale table here drifts silently. Re-derive when
 * the footer stops agreeing with the dashboard.
 */

/**
 * Verified 2026-09-12 against `ai_pricing_history`, `is_current`:
 *
 * - `claude-*`: 16% off list on all of anthropic, azure and google-vertex, so
 *   the proxy's Anthropic load balancing cannot change the factor.
 * - `gpt-*`: 18% off on openai direct, 20% on Azure OpenAI. Azure is a fallback
 *   route (7% of requests, 4% of spend over a 14-day sample), and the two differ
 *   by 2.4%, so the direct rate stands in for both.
 * - Everything else — gemini, grok, meta muse, fireworks, groq — prices from
 *   models.dev at list, discount 0.
 *
 * Applies to flex and batch too: those tiers discount the list rate first, and
 * the contract discount then applies to the result, so the factor is unchanged.
 */
const CONTRACT_MULTIPLIERS: readonly (readonly [prefix: string, multiplier: number])[] = [
	["claude-", 0.84],
	["gpt-", 0.82],
];

/** List-priced dollars are returned unchanged for models priced at list. */
export const LIST_PRICED = 1;

/**
 * The contract factor for `model`, or `LIST_PRICED` when the model is unknown or
 * genuinely bills at list. An unrecognized model keeps its list price rather
 * than inheriting some other family's discount: being visibly high in the same
 * direction as the old behavior beats being quietly wrong in a new one.
 */
export function contractMultiplier(model: string | undefined): number {
	if (!model) return LIST_PRICED;
	const id = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
	for (const [prefix, multiplier] of CONTRACT_MULTIPLIERS) if (id.startsWith(prefix)) return multiplier;
	return LIST_PRICED;
}

/**
 * The factor for a rollup that reports dollars without naming a model — native
 * workflow and nested-tree totals. Weighted by the known cost of the members it
 * covers, so a rollup over priced children matches those children, and one whose
 * members are all unknown stays at list rather than inventing a discount.
 */
export function rollupMultiplier(members: readonly { cost?: number; model?: string }[]): number {
	let weighted = 0;
	let known = 0;
	for (const member of members) {
		if (member.cost === undefined || !member.model) continue;
		weighted += member.cost * contractMultiplier(member.model);
		known += member.cost;
	}
	return known > 0 ? weighted / known : LIST_PRICED;
}
