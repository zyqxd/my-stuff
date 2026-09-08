import assert from "node:assert/strict";
import { SpendLedger, readAccountingFile } from "./accounting.ts";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function accountingTests(check: (name: string, fn: () => void | Promise<void>) => Promise<void>) {
 const owner = { sessionFile: "/sessions/parent.jsonl", sessionId: "parent", cwd: "/project" };
 const result = (runId: string, cost: unknown, extra = {}) => ({ runId, agent: "worker", index: 0, sessionFile: `/children/${runId}.jsonl`, exitCode: 0, usage: { cost }, ...extra });
 const details = (results: unknown[], extra = {}) => ({ mode: "single", results, ...extra });
 await check("accounting: foreground completion owns the parent sessionId, not the child's sessionFile", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observeEvent({ id: "done:0", runId: "done", source: "foreground", mode: "single", agent: "worker", success: true, state: "complete", sessionId: owner.sessionFile, sessionFile: "/children/done.jsonl" });
  await ledger.refresh(async path => path.endsWith("done_worker_0_meta.json") ? { runId: "done", agent: "worker", exitCode: 0, usage: { cost: 1.5 } } : undefined);
  assert.equal(ledger.summary().cost, 1.5);
 });
 await check("accounting: snapshots are immutable while later metadata and aliases reconcile", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("pending", undefined)]));
  const snapshot = ledger.snapshot();
  const serialized = JSON.stringify(snapshot);
  await ledger.refresh(async path => path.endsWith("pending_worker_0_meta.json") ? { runId: "pending", agent: "worker", exitCode: 0, usage: { cost: 1 } } : undefined);
  assert.equal(JSON.stringify(snapshot), serialized);
 });
 await check("accounting: workflow completion projections without indexes deduplicate status child refs", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "management", completions: [{ mode: "workflow", runId: "flow", results: [result("one", 1, { index: undefined, exitCode: undefined, success: true }), result("two", 2, { index: undefined, exitCode: undefined, success: true })] }] });
  ledger.observe({ mode: "workflow", runId: "flow", workflowChildren: { children: [{ runId: "one", agent: "worker" }, { runId: "two", agent: "worker" }] } });
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [3, true]);
 });
 await check("accounting: cancelled attempts retain billable usage without live polling", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("cancelled", 1, { exitCode: -1, stopped: true })]));
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial, ledger.active], [1, false, false]);
 });
 await check("accounting: direct snapshots, notices and fallback attempts count once", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("one", 3, { modelAttempts: [{ usage: { cost: 1 } }, { usage: { cost: 2 } }] })]));
  ledger.observe(details([result("one", 3)]));
  ledger.observe({ mode: "management", completions: [{ runId: "one", mode: "single", results: [result("one", 3)] }] });
  assert.equal(ledger.summary().cost, 3);
  assert.equal(ledger.summary().partial, false);
 });
 await check("accounting: fallback usage when aggregate missing and invalid is not zero", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("fallback", undefined, { modelAttempts: [{ usage: { cost: 0.4 } }, { usage: { cost: 0.6 } }] })]));
  ledger.observe(details([result("zero", 0, { exitCode: 1 }), result("missing", undefined), result("invalid", -3), result("nan", NaN)]));
  assert.equal(ledger.summary().cost, 1);
  assert.equal(ledger.summary().unresolved, 3);
  assert.equal(ledger.summary().partial, true);
 });
 await check("accounting: session aliases deduplicate but resumed run identities stay distinct", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("first", 1, { runId: undefined, sessionFile: "/child.jsonl" })]));
  ledger.observe(details([result("first", 1, { sessionFile: "/child.jsonl" })]));
  ledger.observe(details([result("resume", 2, { sessionFile: "/child.jsonl" })]));
  assert.equal(ledger.summary().cost, 3);
 });
 await check("accounting: foreground workflow forks use child IDs, not the forks directory", async () => {
  for (const aggregate of [undefined, { costUsd: 12, inputTokens: 1, outputTokens: 1 }]) {
   const ledger = new SpendLedger(owner);
   const children = [{ childId: "judge-a", runId: "actual-a", agent: "oracle", state: "complete" }, { childId: "judge-b", runId: "actual-b", agent: "oracle", state: "complete" }];
   ledger.observe({ mode: "workflow", runId: "flow", results: [
    { workflowKey: "judge-a", index: 0, agent: "oracle", sessionFile: "/sessions/parent/forks/one.jsonl", exitCode: 0, usage: { cost: 5 } },
    { workflowKey: "judge-b", index: 0, agent: "oracle", sessionFile: "/sessions/parent/forks/two.jsonl", exitCode: 0, usage: { cost: 7 } },
   ], totalCost: aggregate, workflowChildren: { children } });
   await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, mode: "workflow", state: "complete", steps: [] }
    : path.endsWith("workflow-receipt.json") ? { version: 1, workflowRunId: "flow", entries: { "judge-a": { agent: "oracle", latestRunId: "actual-a" }, "judge-b": { agent: "oracle", latestRunId: "actual-b" } } }
    : path.endsWith("actual-a_oracle_0_meta.json") ? { runId: "actual-a", agent: "oracle", exitCode: 0, usage: { cost: 5 } }
    : path.endsWith("actual-b_oracle_0_meta.json") ? { runId: "actual-b", agent: "oracle", exitCode: 0, usage: { cost: 7 } } : undefined);
   assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [12, false]);
   assert.deepEqual(ledger.snapshot().records.map(record => record.runId).sort(), ["actual-a", "actual-b"]);
  }
 });
 await check("accounting: later workflow identity resolves a fork alias and its aggregate coverage", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", totalCost: { costUsd: 5, inputTokens: 1, outputTokens: 1 }, results: [{ workflowKey: "judge", agent: "oracle", sessionFile: "/sessions/parent/forks/one.jsonl", exitCode: 0, usage: { cost: 5 } }] });
  assert.equal(ledger.snapshot().records[0].key, "session:/sessions/parent/forks/one.jsonl");
  ledger.observe({ mode: "workflow", runId: "flow", workflowChildren: { children: [{ childId: "judge", runId: "actual-child", agent: "oracle", state: "complete" }] } });
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [5, false]);
  assert.equal(ledger.snapshot().records.length, 1);
  assert.equal(ledger.snapshot().records[0].runId, "actual-child");
 });
 await check("accounting: a resumed fork alias belongs to the latest attempt, not its history", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", results: [{ workflowKey: "judge", agent: "oracle", sessionFile: "/sessions/parent/forks/one.jsonl", exitCode: 0, usage: { cost: 5 } }] });
  await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, mode: "workflow", state: "complete", steps: [{ runId: "second", agent: "oracle", status: "complete" }] }
   : path.endsWith("workflow-receipt.json") ? { version: 1, workflowRunId: "flow", entries: { judge: { agent: "oracle", latestRunId: "second", continuation: { runIds: ["first", "second"] } } }, workflowChildren: { children: [{ childId: "judge", runId: "second", agent: "oracle", state: "complete" }] } }
   : path.endsWith("first_oracle_0_meta.json") ? { runId: "first", agent: "oracle", exitCode: 0, usage: { cost: 1 } }
   : path.endsWith("second_oracle_0_meta.json") ? { runId: "second", agent: "oracle", exitCode: 0, usage: { cost: 5 } } : undefined);
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [6, false]);
  assert.equal(ledger.snapshot().records.find(record => record.runId === "first")?.cost, 1);
  assert.equal(ledger.snapshot().records.find(record => record.runId === "second")?.cost, 5);
 });
 await check("accounting: identity-before-alias retains usage and deduplicates aggregate coverage", () => {
  const ledger = new SpendLedger(owner);
  const ref = { mode: "workflow", runId: "flow", workflowChildren: { children: [{ childId: "judge", runId: "actual-child", agent: "oracle", state: "complete" }] } };
  ledger.observe(ref);
  ledger.observe({ mode: "workflow", runId: "flow", totalCost: { costUsd: 5, inputTokens: 1, outputTokens: 1 }, results: [{ workflowKey: "judge", agent: "oracle", sessionFile: "/sessions/parent/forks/one.jsonl", exitCode: 0, usage: { cost: 5 } }] });
  ledger.observe(ref);
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [5, false]);
  assert.equal(ledger.snapshot().records.length, 1);
  assert.equal(ledger.snapshot().records[0].cost, 5);
  assert.equal(ledger.snapshot().records[0].terminal, true);
  assert.equal(ledger.snapshot().groups[0].members.length, 1);
  assert.equal(ledger.snapshot().groups[0].aggregate?.members.length, 1);
 });
 await check("accounting: native run-directory inference retains the explicit result index", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "parallel", results: [{ agent: "worker", sessionFile: "/sessions/parent/native-id/run-1/session.jsonl", exitCode: 0, usage: { cost: 2 } }] });
  assert.equal(ledger.snapshot().records[0].key, "run:native-id:1");
 });
 await check("accounting: nested inclusive aggregate suppresses descendants and workflow totals", () => {
  const ledger = new SpendLedger(owner);
  const nested = { id: "nested", state: "complete", totalCost: { costUsd: 5 }, children: [{ id: "grandchild", state: "complete", totalCost: { costUsd: 2 } }] };
  ledger.observe(details([result("root", 1, { children: [nested] }), result("grandchild", 2)], { mode: "workflow", runId: "workflow", totalCost: { costUsd: 8 } }));
  assert.equal(ledger.summary().cost, 6);
 });
 await check("accounting: covered running descendants stay partial and recover through native status refs", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("root", 1, { children: [{ id: "nested", state: "complete", asyncDir: "/async/nested", sessionId: "nested-owner", totalCost: { costUsd: 3 }, children: [{ id: "leaf", state: "running", asyncDir: "/async/leaf", sessionId: "leaf-owner", totalCost: { costUsd: 2 } }] }] })]));
  assert.equal(ledger.summary().cost, 4);
  assert.equal(ledger.summary().partial, true);
  assert.ok(ledger.summary().pending > 0);
  const restored = new SpendLedger(owner, ledger.snapshot());
  const reads: string[] = [];
  await restored.refresh(async path => {
   reads.push(path);
   if (path === "/async/leaf/status.json") return { runId: "leaf", sessionId: "leaf-owner", state: "complete", totalCost: { costUsd: 3 } };
   if (path === "/async/nested/status.json") return { runId: "nested", sessionId: "nested-owner", state: "complete", totalCost: { costUsd: 4 }, children: [{ id: "leaf", state: "complete", totalCost: { costUsd: 3 } }] };
   return undefined;
  });
  assert.ok(reads.includes("/async/leaf/status.json"));
  assert.ok(reads.includes("/async/nested/status.json"));
  assert.deepEqual([restored.summary().cost, restored.summary().partial, restored.active], [5, false, false]);
 });
 await check("accounting: historical nested replay preserves finalized coverage after artifact cleanup", async () => {
  for (const finalLeaf of [2, 3]) {
   const original = details([result("root", 1, { children: [{ id: "nested", state: "complete", asyncDir: "/async/nested", totalCost: { costUsd: 3 }, children: [{ id: "leaf", state: "running", asyncDir: "/async/leaf", totalCost: { costUsd: 2 } }] }] })]);
   const ledger = new SpendLedger(owner);
   ledger.observe(original);
   await ledger.refresh(async path => path === "/async/leaf/status.json" ? { runId: "leaf", state: "complete", totalCost: { costUsd: finalLeaf } }
    : path === "/async/nested/status.json" ? { runId: "nested", state: "complete", totalCost: { costUsd: finalLeaf + 1 }, children: [{ id: "leaf", state: "complete", totalCost: { costUsd: finalLeaf } }] } : undefined);
   assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [finalLeaf + 2, false]);
   const restored = new SpendLedger(owner, ledger.snapshot());
   restored.ingest([{ type: "message", message: { role: "toolResult", toolName: "subagent", details: original } }]);
   await restored.refresh(async () => undefined);
   assert.deepEqual([restored.summary().cost, restored.summary().partial], [finalLeaf + 2, false]);
  }
 });
 await check("accounting: missing final nested coverage remains partial after the leaf finishes", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("root", 1, { children: [{ id: "nested", state: "complete", totalCost: { costUsd: 3 }, children: [{ id: "leaf", state: "running", totalCost: { costUsd: 2 } }] }] })]));
  ledger.observe(details([result("leaf-event", 0, { children: [{ id: "leaf", state: "complete", totalCost: { costUsd: 3 } }] })]));
  await ledger.refresh(async () => undefined);
  assert.equal(ledger.summary().partial, true);
 });
 await check("accounting: terminal inclusive workflow aggregate survives missing receipt and covers descendants", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, mode: "workflow", state: "complete", totalCost: { costUsd: 5, inputTokens: 10, outputTokens: 20 }, steps: [{ runId: "one", agent: "worker", status: "complete", async: false }, { runId: "two", agent: "worker", status: "complete", async: false }] } : path.endsWith("one_worker_0_meta.json") ? { runId: "one", agent: "worker", exitCode: 0, usage: { cost: 2 } } : undefined);
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [5, false]);
  const restored = new SpendLedger(owner, ledger.snapshot());
  await restored.refresh(async () => undefined);
  assert.deepEqual([restored.summary().cost, restored.summary().partial], [5, false]);
 });
 await check("accounting: terminal zero aggregate needs corroborated zero attempts", async () => {
  for (const cost of [undefined, 0, 2]) {
   const ledger = new SpendLedger(owner);
   ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
   await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, mode: "workflow", state: "complete", totalCost: { costUsd: 0, inputTokens: 0, outputTokens: 0 }, steps: [{ runId: "one", agent: "worker", status: "complete", async: false }] } : cost !== undefined && path.endsWith("one_worker_0_meta.json") ? { runId: "one", agent: "worker", exitCode: 0, usage: { cost } } : undefined);
   assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [cost ?? 0, cost !== 0]);
  }
 });
 await check("accounting: detached async workflow aggregate does not conceal missing async cost", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, mode: "workflow", state: "complete", totalCost: { costUsd: 5, inputTokens: 10, outputTokens: 20 }, steps: [{ runId: "one", agent: "worker", status: "running", async: true }] } : undefined);
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [0, true]);
 });
 await check("accounting: async-start single records recover even before status lists steps", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observeEvent({ id: "started", sessionId: owner.sessionFile, mode: "single", agent: "worker", asyncDir: "/async/started" });
  await ledger.refresh(async path => path.endsWith("started_worker_0_meta.json") ? { runId: "started", agent: "worker", usage: { cost: 0.25 }, exitCode: 1 } : undefined);
  assert.equal(ledger.summary().cost, 0.25);
  assert.equal(ledger.summary().partial, true);
 });
 await check("accounting: aggregate-only nested missing own usage cannot imply an exact subtotal", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("root", 1, { children: [{ id: "missing-nested", state: "complete", children: [{ id: "leaf", state: "complete", totalCost: { costUsd: 2 } }] }] })]));
  assert.equal(ledger.summary().cost, 3);
  assert.equal(ledger.summary().partial, true);
 });
 await check("accounting: a terminal identity-only projection cannot finalize stale live usage", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("live-final", 1, { exitCode: undefined, progress: { status: "running" } })]));
  ledger.observe(details([result("live-final", undefined)]));
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [1, true]);
  await ledger.refresh(async path => path.endsWith("live-final_worker_0_meta.json") ? { runId: "live-final", agent: "worker", exitCode: 0, usage: { cost: 2 } } : undefined);
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [2, false]);
 });
 await check("accounting: terminal artifacts missing at first observation are retried", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("late", undefined)]));
  await ledger.refresh(async () => undefined);
  await ledger.refresh(async path => path.endsWith("late_worker_0_meta.json") ? { runId: "late", agent: "worker", usage: { cost: 0.5 }, exitCode: 0 } : undefined);
  assert.equal(ledger.summary().cost, 0.5);
  assert.equal(ledger.summary().partial, false);
 });
 await check("accounting: live costs remain partial and stale snapshots cannot undo completion", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("live", 1, { exitCode: undefined, progress: { status: "running" } })]));
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [1, true]);
  ledger.observe(details([result("live", 2)]));
  ledger.observe(details([result("live", 1, { exitCode: undefined, progress: { status: "running" } })]));
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [2, false]);
 });
 await check("accounting: async workflow receipts recover every attempt, status and notices deduplicate", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  const files: Record<string, any> = {
   "/async/flow/status.json": { runId: "flow", sessionId: owner.sessionFile, state: "complete", steps: [{ runId: "second", agent: "worker", status: "complete" }] },
   "/async/flow/workflow-receipt.json": { version: 1, workflowRunId: "flow", entries: { build: { agent: "worker", continuation: { runIds: ["first", "second"] } } }, workflowChildren: { children: [{ childId: "build", runId: "second", agent: "worker", state: "complete" }] } },
   "/sessions/subagent-artifacts/first_worker_0_meta.json": { runId: "first", agent: "worker", exitCode: 1, usage: { cost: 1.25 } },
   "/sessions/subagent-artifacts/second_worker_0_meta.json": { runId: "second", agent: "worker", exitCode: 0, usage: { cost: 2.75 }, modelAttempts: [{ usage: { cost: 2.75 } }] },
  };
  await ledger.refresh(async path => files[path]);
  ledger.observe({ completions: [{ mode: "workflow", runId: "flow", results: [result("second", 2.75)] }] });
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [4, false]);
  const restored = new SpendLedger(owner, ledger.snapshot());
  restored.ingest([{ type: "message", message: { role: "toolResult", toolName: "subagent", details: { mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] } } }]);
  await restored.refresh(async () => undefined);
  assert.deepEqual([restored.summary().cost, restored.summary().partial], [4, false]);
 });
 await check("accounting: owned status cwd resolves project-scoped metadata without directory scans", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "single", runId: "one", agent: "worker", asyncDir: "/async/one", asyncId: "one", results: [] });
  const reads: string[] = [];
  await ledger.refresh(async path => {
   reads.push(path);
   return path.endsWith("status.json") ? { runId: "one", sessionId: owner.sessionFile, cwd: "/target", mode: "single", state: "complete", steps: [{ agent: "worker", status: "complete" }] }
    : path === "/target/.pi/subagents/artifacts/one_worker_0_meta.json" ? { runId: "one", agent: "worker", usage: { cost: 2 }, exitCode: 0 } : undefined;
  });
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [2, false]);
  assert.ok(reads.includes("/target/.pi/subagents/artifacts/one_worker_0_meta.json"));
 });
 await check("accounting: live status without receipt reports known spend, pending and missing history", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  await ledger.refresh(async path => path.endsWith("status.json") ? { runId: "flow", sessionId: owner.sessionFile, state: "running", steps: [{ runId: "done", agent: "worker", status: "complete" }, { runId: "live", agent: "worker", status: "running" }] } : path.endsWith("done_worker_0_meta.json") ? { runId: "done", agent: "worker", exitCode: 0, usage: { cost: 2 } } : undefined);
  assert.equal(ledger.summary().cost, 2);
  assert.ok(ledger.summary().partial && ledger.summary().pending);
 });
 await check("accounting: unrelated async status and event cannot attribute foreign spending", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observeEvent({ sessionId: "/other.jsonl", mode: "single", runId: "foreign", results: [result("foreign", 100)] });
  assert.equal(ledger.summary().cost, 0);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  const reads: string[] = [];
  await ledger.refresh(async path => { reads.push(path); return { runId: "flow", sessionId: "/other.jsonl", steps: [{ runId: "foreign", agent: "worker" }] }; });
  assert.deepEqual(reads, ["/async/flow/status.json"]);
  assert.equal(ledger.summary().cost, 0);
  assert.equal(ledger.summary().partial, true);
 });
 await check("accounting: record and read budgets disclose partial rather than silently truncating totals", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details(Array.from({ length: 2001 }, (_, index) => result(`bounded-${index}`, 1))));
  assert.deepEqual([ledger.summary().cost, ledger.summary().partial], [2000, true]);
  const pending = new SpendLedger(owner);
  pending.observe(details(Array.from({ length: 60 }, (_, index) => result(`missing-${index}`, undefined))));
  let reads = 0;
  await pending.refresh(async () => { reads++; return undefined; });
  assert.ok(reads <= 256);
  assert.equal(pending.summary().partial, true);
 });
 await check("accounting: bounded malformed, oversized and non-file artifacts are missing, recorded zero survives", async () => {
  const base = mkdtempSync(join(tmpdir(), "footer-accounting-"));
  try {
   writeFileSync(join(base, "invalid.json"), "{");
   writeFileSync(join(base, "large.json"), " ".repeat(2 * 1024 * 1024 + 1));
   mkdirSync(join(base, "directory.json"));
   writeFileSync(join(base, "zero.json"), JSON.stringify({ usage: { cost: 0 } }));
   for (const name of ["invalid.json", "large.json", "directory.json", "missing.json"]) assert.equal(await readAccountingFile(join(base, name)), undefined);
   assert.deepEqual(await readAccountingFile(join(base, "zero.json")), { usage: { cost: 0 } });
  } finally { rmSync(base, { recursive: true, force: true }); }
 });
 await check("accounting: shutdown stops in-flight accounting and further reads", async () => {
  const ledger = new SpendLedger(owner);
  ledger.observe({ mode: "workflow", runId: "flow", asyncDir: "/async/flow", results: [] });
  let release!: (value: any) => void;
  const pending = ledger.refresh(() => new Promise(resolve => { release = resolve; }));
  ledger.stop();
  const before = JSON.stringify(ledger.snapshot());
  release({ runId: "flow", sessionId: owner.sessionFile, state: "complete", steps: [] });
  await pending;
  assert.equal(JSON.stringify(ledger.snapshot()), before);
 });
 await check("accounting: versioned snapshots retain costs and reject unrelated owners", () => {
  const ledger = new SpendLedger(owner);
  ledger.observe(details([result("done", 4)]));
  const restored = new SpendLedger(owner, ledger.snapshot());
  assert.equal(restored.summary().cost, 4);
  assert.equal(new SpendLedger({ ...owner, sessionFile: "/other.jsonl" }, ledger.snapshot()).summary().cost, 0);
  assert.equal(new SpendLedger(owner, { ...ledger.snapshot(), version: 900 }).summary().cost, 0);
 });
}
