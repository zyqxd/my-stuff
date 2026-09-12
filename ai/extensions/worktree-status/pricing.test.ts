import assert from "node:assert/strict";
import { SpendLedger } from "./accounting.ts";
import { collectUsage } from "./index.ts";
import { contractMultiplier, rollupMultiplier } from "./pricing.ts";

const assistant = (model: string | undefined, cost: number) => ({
 type: "message", message: { role: "assistant", model, usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, cost: { total: cost } } },
});

export async function pricingTests(check: (name: string, fn: () => void | Promise<void>) => Promise<void>) {
 const owner = { sessionFile: "/sessions/parent.jsonl", sessionId: "parent", cwd: "/project" };

 await check("pricing: contract factors follow the vendor, including provider-qualified ids", () => {
  // ai_pricing_history, is_current, 2026-09-12: anthropic/azure/google-vertex 16% off, openai 18%.
  assert.equal(contractMultiplier("claude-opus-5"), 0.84);
  assert.equal(contractMultiplier("claude-fable-5-1"), 0.84);
  assert.equal(contractMultiplier("anthropic-250k/claude-sonnet-5"), 0.84);
  assert.equal(contractMultiplier("gpt-6-astra"), 0.82);
  assert.equal(contractMultiplier("openai-1m/gpt-5.6-sol"), 0.82);
 });

 await check("pricing: models the proxy bills at list, and unknown models, are not discounted", () => {
  // gemini, grok, muse, fireworks and groq all price from models.dev at discount 0.
  for (const model of ["gemini-3.1-pro", "grok-4.3", "muse-spark-1.3", "accounts/fireworks/models/kimi-k3", undefined, "", "future-model-9"])
   assert.equal(contractMultiplier(model), 1, `${model} must keep its list price`);
 });

 await check("pricing: parent cost converts per message, so a mixed-model session blends correctly", () => {
  const usage = collectUsage([assistant("gpt-6-astra", 100), assistant("claude-opus-5", 50), assistant("grok-4.3", 10)]);
  assert.equal(round(usage.cost), round(100 * 0.82 + 50 * 0.84 + 10));
  assert.equal(usage.output, 3); // tokens are untouched; only dollars are repriced
 });

 await check("pricing: compaction and branch-summary turns are repriced by their own model", () => {
  const entries = [
   { type: "compaction", model: "claude-opus-5", usage: { cost: { total: 10 } } },
   { type: "branch_summary", model: "gpt-6-astra", usage: { cost: { total: 10 } } },
  ];
  assert.equal(round(collectUsage(entries).cost), round(10 * 0.84 + 10 * 0.82));
 });

 await check("pricing: a native child is repriced from the model its metadata names", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observeEvent({ id: "solo:0", runId: "solo", source: "foreground", mode: "single", agent: "worker", success: true, state: "complete", sessionId: owner.sessionFile });
  await ledger.refresh(async path => path.endsWith("solo_worker_0_meta.json")
   ? { runId: "solo", agent: "worker", exitCode: 0, model: "claude-opus-5", usage: { cost: 10 } } : undefined);
  assert.equal(round(ledger.summary().cost), 8.4);
 });

 await check("pricing: a fallback run is priced by the model that actually answered", async () => {
  const ledger = new SpendLedger(owner);
  // attemptedModels ran Claude first, fell back to Astra; the last attempt is the billed one.
  ledger.observe({ mode: "single", runId: "fell-back", results: [{
   runId: "fell-back", agent: "worker", index: 0, exitCode: 0,
   modelAttempts: [{ model: "claude-opus-5", usage: { cost: 0 } }, { model: "gpt-6-astra", usage: { cost: 100 } }],
  }] });
  assert.equal(round(ledger.summary().cost), 82);
 });

 await check("pricing: workflow rollups borrow the factor of the members they cover", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", totalCost: { costUsd: 12, inputTokens: 1, outputTokens: 1 }, results: [
   { workflowKey: "a", runId: "child-a", index: 0, agent: "oracle", model: "claude-opus-5", exitCode: 0, usage: { cost: 4 } },
   { workflowKey: "b", runId: "child-b", index: 0, agent: "oracle", model: "gpt-6-astra", exitCode: 0, usage: { cost: 8 } },
  ] });
  // The $12 rollup replaces its members, so it takes their cost-weighted blend.
  assert.equal(round(ledger.summary().cost), round(12 * (4 * 0.84 + 8 * 0.82) / 12));
 });

 await check("pricing: a rollup over unnamed models stays at list rather than inventing a discount", () => {
  assert.equal(rollupMultiplier([]), 1);
  assert.equal(rollupMultiplier([{ cost: 5 }, { cost: 3, model: undefined }]), 1);
  assert.equal(rollupMultiplier([{ cost: 0, model: "claude-opus-5" }]), 1); // zero weight cannot skew the blend
 });

 await check("pricing: snapshots store list dollars, so an older snapshot reprices on reload", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "single", runId: "kept", results: [{ runId: "kept", agent: "worker", index: 0, exitCode: 0, model: "claude-opus-5", usage: { cost: 10 } }] });
  const snapshot = ledger.snapshot();
  assert.equal(snapshot.records[0].cost, 10, "persisted dollars stay as Pi recorded them");
  assert.equal(snapshot.records[0].model, "claude-opus-5");
  assert.equal(round(new SpendLedger(owner, snapshot).summary().cost), 8.4);
  // A snapshot written before models were captured keeps its list price instead of guessing.
  const legacy = { ...snapshot, records: snapshot.records.map(({ model, ...rest }) => rest) };
  assert.equal(round(new SpendLedger(owner, legacy).summary().cost), 10);
 });
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;
