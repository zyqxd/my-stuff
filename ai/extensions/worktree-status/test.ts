import assert from "node:assert/strict";
import { homedir } from "node:os";
import {
  bashPathCandidates,
  countPorcelain,
  displayPath,
  expandHome,
  findWorktreeRoot,
  toolPathCandidates,
  isIgnored,
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

const home = homedir();
let failures = 0;
function check(name: string, fn: () => void) {
  try { fn(); console.log("ok   " + name); }
  catch (e) { failures++; console.log("FAIL " + name + "\n     " + (e as Error).message); }
}

check("bash: cd target wins over later paths", () => {
  assert.deepEqual(
    bashPathCandidates("cd ~/world/trees/i7343-payment-section/src && git status")[0],
    "~/world/trees/i7343-payment-section/src",
  );
});
check("bash: cd after &&", () => {
  assert.equal(bashPathCandidates("set -e && cd /tmp/foo; ls")[0], "/tmp/foo");
});
check("bash: quoted cd path", () => {
  assert.equal(bashPathCandidates(`cd "/tmp/a b" && ls`)[0], "/tmp/a b");
});
check("bash: git -C", () => {
  assert.equal(bashPathCandidates("git -C ~/world/trees/root/src log -1")[0], "~/world/trees/root/src");
});
check("bash: bare absolute path arg", () => {
  assert.deepEqual(bashPathCandidates("rg foo /Users/x/proj/src"), ["/Users/x/proj/src"]);
});
check("bash: no path", () => {
  assert.deepEqual(bashPathCandidates("git status --porcelain"), []);
});
check("bash: flags are not paths", () => {
  assert.deepEqual(bashPathCandidates("ls -la --color=auto"), []);
});
check("tool: read/write/edit path", () => {
  assert.deepEqual(toolPathCandidates("read", { path: "/a/b.ts" }), ["/a/b.ts"]);
  assert.deepEqual(toolPathCandidates("edit", { path: "rel/x.ts" }), ["rel/x.ts"]);
  assert.deepEqual(toolPathCandidates("grep", { pattern: "x" }), []);
});

check("worktree root: linked worktree resolves to itself, not main clone", () => {
  const wt = home + "/world/trees/i7343-payment-section/src";
  const root = findWorktreeRoot(wt + "/areas/clients/web/app/foo/bar.ts");
  assert.equal(root, wt, `got ${root}`);
});
check("worktree root: main repo", () => {
  assert.equal(findWorktreeRoot(home + "/Workspace/my-stuff/ai/AGENTS.md"), home + "/Workspace/my-stuff");
});
check("worktree root: non-existent path walks up to existing ancestor", () => {
  assert.equal(findWorktreeRoot(home + "/Workspace/my-stuff/does/not/exist.ts"), home + "/Workspace/my-stuff");
});
check("worktree root: outside any repo is null", () => {
  assert.equal(findWorktreeRoot("/tmp"), null);
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
check("expandHome", () => {
  assert.equal(expandHome("~/x"), home + "/x");
  assert.equal(expandHome("/x"), "/x");
});

check("ignores brain memory bank paths", () => {
  assert.equal(isIgnored(home + "/.brain/memory-bank/personal/core/dailyContext.md"), true);
});
check("ignores ~/plans through its symlink into the bank", () => {
  assert.equal(isIgnored(home + "/plans/improve-cancellation-reactivation/todo.md"), true);
  assert.equal(isIgnored(home + "/plans"), true);
});
check("ignores all of my-stuff, including via symlinks into it", () => {
  assert.equal(isIgnored(home + "/Workspace/my-stuff/ai/lessons/admin-web.md"), true);
  assert.equal(isIgnored(home + "/Workspace/my-stuff/ai/memory/MEMORY.md"), true);
  assert.equal(isIgnored(home + "/Workspace/my-stuff/preferences/git/config"), true);
  assert.equal(isIgnored(home + "/Workspace/my-stuff"), true);
  assert.equal(isIgnored(home + "/.pi/agent/memory/MEMORY.md"), true); // symlink into ai/memory
});
check("prefix match respects path boundaries", () => {
  assert.equal(isIgnored(home + "/Workspace/my-stuff-scratch/x.md"), false);
  assert.equal(isIgnored(home + "/Workspace/other/x.md"), false);
  assert.equal(isIgnored(home + "/world/trees/i7343-payment-section/src/app.ts"), false);
});
check("ignores paths that do not exist yet under an ignored dir", () => {
  assert.equal(isIgnored(home + "/plans/new-project/2026-08-21-report.md"), true);
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

process.exit(failures ? 1 : 0);
