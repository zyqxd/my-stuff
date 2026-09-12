import assert from "node:assert/strict";
import { homedir } from "node:os";
import { visibleWidth } from "@earendil-works/pi-tui";
import { SpendLedger } from "./accounting.ts";
import {
  countPorcelain,
  displayPath,
  expandHome,
  findWorktreeRoot,
  collectUsage,
  focusLabel,
  focusLabels,
  formatTokens,
  lastFocus,
  padBetween,
} from "./index.ts";

const focusEntry = (data: unknown, timestamp: string) => ({
  type: "custom",
  customType: "worktree-focus",
  timestamp,
  data,
});

import { makeFixtures } from "./test-fixtures.ts";
const fixture = makeFixtures();
const home = homedir();
let failures = 0;
let checks = 0;
function check(name: string, fn: () => void) {
  checks++;
  try { fn(); console.log("ok   " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + (e as Error).message); }
}

check("worktree root: linked worktree resolves to itself, not main clone", () => {
  const wt = fixture.linked;
  const root = findWorktreeRoot(wt + "/areas/clients/web/app/foo/bar.ts");
  assert.equal(root, wt, `got ${root}`);
});
check("worktree root: main repo", () => {
  assert.equal(findWorktreeRoot(fixture.main + "/README.md"), fixture.main);
});
check("worktree root: non-existent path walks up to existing ancestor", () => {
  assert.equal(findWorktreeRoot(fixture.main + "/does/not/exist.ts"), fixture.main);
});
check("worktree root: outside any repo is null", () => {
  assert.equal(findWorktreeRoot(fixture.nonGit), null);
});

check("porcelain counts", () => {
  const s = ["M  a.ts", " M b.ts", "MM c.ts", "?? d.ts", "A  e.ts", "R  f.ts -> g.ts", ""].join("\n");
  assert.deepEqual(countPorcelain(s), { staged: 4, unstaged: 2, untracked: 1 });
});
check("porcelain empty = clean", () => {
  assert.deepEqual(countPorcelain(""), { staged: 0, unstaged: 0, untracked: 0 });
});

check("displayPath shortens long paths to last two segments", () => {
  assert.equal(displayPath(home + "/Workspace/my-stuff"), "~/Workspace/my-stuff");
  assert.equal(displayPath(home + "/world/trees/i7343-payment-section/src"), "~/world/trees/i7343-payment-section/src");
  assert.equal(
    displayPath(home + "/world/trees/payment-wait-event-schema-6154/src/areas/clients/web"),
    "…/src/areas/clients/web",
  );
});
check("linked breadcrumb retains root identity and cwd before ancestors", () => {
  const root = home + "/world/trees/i7343-payment-section/src";
  for (const width of [100, 80, 60, 40, 20]) {
    const text = displayPath(root + "/areas/clients/admin-web", width, root);
    assert.ok(visibleWidth(text) <= width, text);
    assert.match(text, /\[i7343[^\]]*\].*admin-web/);
    if (width >= 40) assert.match(text, /\[i7343-payment-section\/src\]/);
  }
  assert.equal(displayPath(root + "/areas/clients/admin-web", 46, root), "…/[i7343-payment-section/src]/…/admin-web");
  assert.equal(displayPath(root, 100, root), "~/world/trees/[i7343-payment-section/src]");
  assert.equal(displayPath("/topic/leaf", 100, "/topic"), "/[topic]/leaf");
  assert.equal(displayPath(home + "/trees/topic/nested", 100, home + "/trees/topic"), "~/trees/[topic]/nested");
});
check("ordinary narrow path preserves leaf and respects Unicode cell widths", () => {
  for (const width of [100, 80, 60, 40, 20]) {
    const text = displayPath(home + "/very/long/path/祖先/admin-web", width);
    assert.ok(visibleWidth(text) <= width, text);
    assert.ok(text.endsWith("admin-web"), text);
  }
});
check("expandHome", () => {
  assert.equal(expandHome("~/x"), home + "/x");
  assert.equal(expandHome("/x"), "/x");
});

check("formatTokens ramps", () => {
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(9400), "9.4k");
  assert.equal(formatTokens(68000), "68k");
  assert.equal(formatTokens(1_000_000), "1.0M");
});
check("collectUsage sums assistant, toolResult and compaction entries", () => {
  const total = collectUsage([
    { type: "message", message: { role: "assistant", usage: { input: 10, output: 5, cacheRead: 90, cacheWrite: 0, cost: { total: 0.5 } } } },
    { type: "message", message: { role: "toolResult", usage: { input: 1, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0.25 } } } },
    { type: "compaction", usage: { input: 4, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0.25 } } },
    { type: "message", message: { role: "user" } },
  ]);
  assert.equal(total.input, 15);
  assert.equal(total.output, 5);
  assert.equal(total.cost, 1);
  assert.equal(total.cacheHitRate?.toFixed(1), "90.0"); // 90 of (10+90+0) prompt tokens
});
check("native child rollups never enter main spend or counters, including repeated bg_wait projections", () => {
  const child = { runId: "child", agent: "worker", index: 0, exitCode: 0, usage: { cost: 3 } };
  const rollup = { input: 100, output: 200, cacheRead: 300, cacheWrite: 400, cost: { total: 3 } };
  const entries = [
    { type: "message", message: { role: "assistant", usage: { input: 10, output: 20, cacheRead: 30, cacheWrite: 40, cost: { total: 2 } } } },
    { type: "message", message: { role: "toolResult", toolName: "subagent", usage: rollup, details: { mode: "single", runId: "child", results: [child] } } },
    { type: "message", message: { role: "toolResult", toolName: "bg_wait", usage: rollup, details: { mode: "management", results: [], completions: [{ mode: "single", runId: "child", results: [child] }] } } },
    { type: "message", message: { role: "toolResult", toolName: "web_search", usage: { input: 7, cost: { total: 0.5 } } } },
  ];
  const main = collectUsage(entries);
  const ledger = new SpendLedger({ sessionFile: "/sessions/parent.jsonl", sessionId: "parent", cwd: "/project" });
  ledger.ingest(entries);
  assert.deepEqual([main.input, main.output, main.cacheRead, main.cacheWrite], [17, 20, 30, 40]);
  assert.equal(main.cost, 2.5);
  assert.equal(ledger.summary().cost, 3);
  assert.equal(main.cost + ledger.summary().cost, 5.5);
  assert.equal(ledger.summary().partial, false);
});
check("focusLabel joins a normalized issue with the purpose", () => {
  assert.equal(focusLabel({ path: "/w", issue: "7343", purpose: "reopen legal copy" }), "#7343 reopen legal copy");
  assert.equal(focusLabel({ path: "/w", issue: "#7343" }), "#7343");
  assert.equal(focusLabel({ path: "/w", purpose: " trailing space " }), "trailing space");
  assert.equal(focusLabel({ path: "/w" }), null); // nothing to say -> do not touch the session name
});
check("lastFocus replays the newest declaration", () => {
  const found = lastFocus([
    focusEntry({ path: "/w/a", issue: "1" }, "2026-08-22T01:00:00.000Z"),
    { type: "message", message: { role: "user" } },
    focusEntry({ path: "/w/b", issue: "2", purpose: "newer" }, "2026-08-22T02:00:00.000Z"),
  ]);
  assert.deepEqual(found, { path: "/w/b", issue: "2", purpose: "newer" });
});
check("lastFocus ignores walk order and other extensions' entries", () => {
  const found = lastFocus([
    focusEntry({ path: "/w/b" }, "2026-08-22T02:00:00.000Z"), // leaf-first walk
    focusEntry({ path: "/w/a" }, "2026-08-22T01:00:00.000Z"),
    { type: "custom", customType: "other-extension", timestamp: "2026-08-22T03:00:00.000Z", data: { path: "/nope" } },
  ]);
  assert.deepEqual(found, { path: "/w/b", issue: undefined, purpose: undefined });
});
check("lastFocus honours a clear, and a re-declare after it", () => {
  const cleared = [
    focusEntry({ path: "/w/a" }, "2026-08-22T01:00:00.000Z"),
    focusEntry({ path: null }, "2026-08-22T02:00:00.000Z"),
  ];
  assert.equal(lastFocus(cleared), null);
  assert.deepEqual(lastFocus([...cleared, focusEntry({ path: "/w/c" }, "2026-08-22T03:00:00.000Z")])?.path, "/w/c");
});
check("lastFocus falls back to append order when timestamps tie", () => {
  const at = "2026-08-22T01:00:00.000Z";
  assert.equal(lastFocus([focusEntry({ path: "/w/a" }, at), focusEntry({ path: "/w/b" }, at)])?.path, "/w/b");
});
check("focusLabels collects every name we could have written", () => {
  const labels = focusLabels([
    focusEntry({ path: "/w/a", issue: "7343", purpose: "legal copy" }, "2026-08-22T01:00:00.000Z"),
    focusEntry({ path: "/w/b" }, "2026-08-22T02:00:00.000Z"), // human pin, no label to write
    focusEntry({ path: null }, "2026-08-22T03:00:00.000Z"),
    focusEntry({ path: "/w/c", issue: "7256" }, "2026-08-22T04:00:00.000Z"),
  ]);
  assert.deepEqual([...labels].sort(), ["#7256", "#7343 legal copy"]);
});
check("lastFocus returns null with no declarations", () => {
  assert.equal(lastFocus([{ type: "message", message: { role: "user" } }]), null);
});
check("padBetween right-aligns, and drops the right side when it cannot fit", () => {
  assert.equal(padBetween("ab", "yz", 10), "ab      yz");
  assert.equal(padBetween("abcdef", "wxyz", 10), "abcdef"); // gap < 2 -> right dropped
  assert.match(padBetween("abcdefghijkl", "wxyz", 10), /^abcdefghi.*…/); // left alone overflows -> truncated
  assert.equal(padBetween("ab", "", 6), "ab");
});

(await import("./glance.test.ts")).glanceTests(check);
const asyncCheck = async (name: string, fn: () => void | Promise<void>) => {
  checks++;
  try { await fn(); console.log("ok   " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + (e as Error).message); }
};
await (await import("./accounting.test.ts")).accountingTests(asyncCheck);
await (await import("./pricing.test.ts")).pricingTests(asyncCheck);
fixture.cleanup();
console.log(`\n${checks - failures}/${checks} unit checks passed`);
process.exit(failures ? 1 : 0);
