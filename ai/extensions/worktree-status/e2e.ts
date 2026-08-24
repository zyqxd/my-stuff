/**
 * Drives the real footer component against real git repos through a fake TUI.
 * Run: node --experimental-strip-types --import ./test-resolve.ts e2e.ts
 */

import { execFile, execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { visibleWidth } from "@earendil-works/pi-tui";
import factory from "./index.ts";

const home = homedir();
const WIDTH = 100;

/** Worktrees come and go; pick real ones instead of pinning names that rot. */
const trees = readdirSync(`${home}/world/trees`)
	.map((name) => `${home}/world/trees/${name}/src`)
	.filter((path) => existsSync(`${path}/.git`));
const SESSION_TREE = trees.find((t) => t.endsWith("/root/src")) ?? trees[0];
const TREE_A = trees.find((t) => t !== SESSION_TREE) ?? trees[0];
const TREE_B = trees.find((t) => t !== SESSION_TREE && t !== TREE_A) ?? TREE_A;
if (!SESSION_TREE || !TREE_A || TREE_A === TREE_B) throw new Error("need three distinct worktrees under ~/world/trees");
const shortName = (path: string) => path.replace(`${home}/world/trees/`, "").replace("/src", "");
console.log(`session tree: ${shortName(SESSION_TREE)} | A: ${shortName(TREE_A)} | B: ${shortName(TREE_B)}`);

let failures = 0;
const check = (name: string, cond: boolean, detail = "") => {
	if (cond) console.log(`ok   ${name}`);
	else {
		failures++;
		console.log(`FAIL ${name} ${detail}`);
	}
};

const theme = { fg: (_c: string, t: string) => t, bold: (t: string) => t };
const entries = [
	{
		type: "message",
		message: {
			role: "assistant",
			usage: { input: 2, output: 210, cacheRead: 9400, cacheWrite: 68000, cost: { total: 0.435 } },
		},
	},
	{
		type: "message",
		message: { role: "toolResult", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: { total: 0.001 } } },
	},
];

/**
 * One isolated extension instance with its own cwd, footer and fake TUI.
 * `seed` prepends session entries, standing in for a session being resumed.
 */
function makeEnv(cwd: string, seed: any[] = []) {
	const handlers = new Map<string, Function[]>();
	const commands = new Map<string, any>();
	const tools = new Map<string, any>();
	const notices: string[] = [];
	// Live session log. pi derives the session name from the newest session_info
	// entry, so appending one here is what really happens on setSessionName.
	const log: any[] = [...seed, ...entries];
	const sessionName = (): string | undefined => {
		for (let i = log.length - 1; i >= 0; i--) {
			if (log[i].type === "session_info") return log[i].name?.trim() || undefined;
		}
		return undefined;
	};
	let footer: any = null;
	let renderRequests = 0;

	const tui = {
		requestRender: () => {
			renderRequests++;
		},
	};
	const footerData = {
		getGitBranch: () => null,
		getExtensionStatuses: () => new Map([["mcp", "MCP 0/1"]]),
		getAvailableProviderCount: () => 1,
		onBranchChange: (_cb: Function) => () => {},
	};

	const pi: any = {
		on: (e: string, h: Function) => handlers.set(e, [...(handlers.get(e) ?? []), h]),
		registerCommand: (name: string, opts: any) => commands.set(name, opts),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		appendEntry: (customType: string, data: any) =>
			log.push({ type: "custom", customType, timestamp: new Date().toISOString(), data }),
		setSessionName: (name: string) => log.push({ type: "session_info", timestamp: new Date().toISOString(), name }),
		getSessionName: sessionName,
		exec: (cmd: string, args: string[], opts: any = {}) =>
			new Promise((res) =>
				execFile(cmd, args, { encoding: "utf8", timeout: opts.timeout }, (err: any, stdout, stderr) =>
					res({ stdout, stderr, code: err ? (err.code ?? 1) : 0, killed: false }),
				),
			),
	};

	const ctx: any = {
		hasUI: true,
		mode: "tui",
		cwd,
		model: { id: "claude-opus-5", provider: "anthropic", reasoning: true, contextWindow: 1_000_000 },
		thinkingLevel: "high",
		sessionManager: { getEntries: () => log, getSessionName: sessionName },
		getContextUsage: () => ({ tokens: 80_000, contextWindow: 1_000_000, percent: 8.0 }),
		ui: {
			setFooter: (f: any) => {
				footer = f ? f(tui, theme, footerData) : null;
			},
			setStatus: () => {
				throw new Error("setStatus should no longer be used");
			},
			notify: (m: string) => notices.push(m),
			theme,
		},
	};

	const fire = async (event: string, payload: any = {}) => {
		for (const h of handlers.get(event) ?? []) await h(payload, ctx);
	};
	const lines = () => footer.render(WIDTH) as string[];
	const settle = async (ms = 4000) => {
		const deadline = Date.now() + ms;
		let last = lines()[0];
		let stableSince = Date.now();
		while (Date.now() < deadline) {
			await new Promise((r) => setTimeout(r, 100));
			const now = lines()[0];
			if (now !== last) {
				last = now;
				stableSince = Date.now();
			} else if (Date.now() - stableSince > 700 && !now.trimEnd().endsWith("…")) break;
		}
		return lines();
	};
	const show = (label: string) => {
		const [top, bottom] = lines();
		console.log(`\n${label}`);
		console.log(`  |${top}|`);
		console.log(`  |${bottom}|`);
	};

	factory(pi);
	const callTool = (name: string, params: any) => tools.get(name).execute("call-1", params, undefined, undefined, ctx);
	return {
		fire,
		lines,
		settle,
		show,
		commands,
		tools,
		callTool,
		ctx,
		notices,
		log,
		sessionName,
		renderCount: () => renderRequests,
		render: (w: number) => footer.render(w) as string[],
	};
}

// ---------------------------------------------------------------- main session
const env = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`);
await env.fire("session_start", { reason: "startup" });
await env.settle();
env.show("1. session_start (cwd = a subdirectory of the session tree)");
check("exactly two lines", env.lines().length === 2, `got ${env.lines().length}`);
check(
	"line 1 shows worktree root, not session cwd",
	env.lines()[0].startsWith(`${SESSION_TREE.replace(home, "~")} `) && !env.lines()[0].includes("admin-web"),
);
check("line 1 right-aligns other extensions' statuses", env.lines()[0].trimEnd().endsWith("MCP 0/1"));
check("both lines exactly terminal width", env.lines().every((l) => visibleWidth(l) === WIDTH), env.lines().map(visibleWidth).join(","));
check(
	"line 2 has usage left, model right",
	/^↑2 ↓210 R9\.4k W68k CH12\.1% \$0\.436 8\.0%\/1\.0M/.test(env.lines()[1]) &&
		env.lines()[1].trimEnd().endsWith("claude-opus-5 • high"),
	JSON.stringify(env.lines()[1]),
);

await env.fire("tool_call", { toolName: "bash", input: { command: `cd ${TREE_A} && ls` } });
await env.settle();
env.show(`2. bash cd into the ${shortName(TREE_A)} tree`);
check("follows tool call to other worktree", env.lines()[0].startsWith(`${TREE_A.replace(home, "~")} `), env.lines()[0]);

const raw = execFileSync(
	"git",
	["-C", TREE_A, "status", "--porcelain=v1", "--untracked-files=normal"],
	{ encoding: "utf8" },
);
let staged = 0;
let unstaged = 0;
let untracked = 0;
for (const l of raw.split("\n")) {
	if (!l) continue;
	if (l.startsWith("??")) untracked++;
	else {
		if (l[0] !== " ") staged++;
		if (l[1] !== " ") unstaged++;
	}
}
const expected = [staged && `+${staged}`, unstaged && `~${unstaged}`, untracked && `?${untracked}`].filter(Boolean).join(" ") || "clean";
check("dirty counts match raw git", env.lines()[0].includes(expected), `expected ${expected}`);

await env.fire("tool_call", { toolName: "bash", input: { command: "ls /tmp" } });
await env.settle(1200);
check("non-repo tool call is sticky", env.lines()[0].includes(shortName(TREE_A)));

// Notes side-quests must not repoint the footer.
for (const [label, payload] of [
	["edit a lesson", { toolName: "edit", input: { path: `${home}/Workspace/my-stuff/ai/lessons/admin-web.md` } }],
	["edit a dotfile in my-stuff", { toolName: "edit", input: { path: `${home}/Workspace/my-stuff/preferences/git/config` } }],
	["write a plan report", { toolName: "write", input: { path: `${home}/plans/some-project/2026-08-21-report.md` } }],
	["bash into the brain bank", { toolName: "bash", input: { command: "cd ~/.brain/memory-bank/personal && git status" } }],
	["edit dailyContext", { toolName: "edit", input: { path: `${home}/.brain/memory-bank/personal/core/dailyContext.md` } }],
] as [string, any][]) {
	await env.fire("tool_call", payload);
	await env.settle(1200);
	check(`ignored: ${label} keeps previous worktree`, env.lines()[0].includes(shortName(TREE_A)), env.lines()[0]);
}

await env.fire("tool_call", { toolName: "read", input: { path: `${TREE_B}/README.md` } });
await env.settle();
check("a real worktree still switches the footer", env.lines()[0].startsWith(`${TREE_B.replace(home, "~")} `), env.lines()[0]);

await env.commands.get("worktree").handler(`${home}/Workspace/my-stuff`, env.ctx);
await env.settle();
env.show("3. /worktree ~/Workspace/my-stuff (pin beats the ignore list)");
check("pin marker shown for an otherwise-ignored path", env.lines()[0].startsWith("📌 ~/Workspace/my-stuff master"));
await env.fire("tool_call", { toolName: "read", input: { path: `${SESSION_TREE}/README.md` } });
await env.settle(1200);
check("pin overrides detection", env.lines()[0].startsWith("📌 ~/Workspace/my-stuff"));
await env.commands.get("worktree").handler("auto", env.ctx);
await env.settle();
check("auto restores detection", env.lines()[0].startsWith(SESSION_TREE.replace(home, "~")));

// Narrow terminals: right-hand segments are dropped, never wrapped.
for (const w of [120, 80, 60, 40, 20]) {
	const out = env.render(w);
	check(`width ${w}: 2 lines, none over budget`, out.length === 2 && out.every((l) => visibleWidth(l) <= w), out.map(visibleWidth).join(","));
}
console.log(`\nwidth 40:\n  |${env.render(40).join("|\n  |")}|`);

check("render requested on state changes", env.renderCount() > 0, `${env.renderCount()}`);
await env.fire("session_shutdown", {});

// ------------------------------------------- pi launched inside an ignored repo
const inMyStuff = makeEnv(`${home}/Workspace/my-stuff`);
await inMyStuff.fire("session_start", { reason: "startup" });
await inMyStuff.settle();
inMyStuff.show("4. session launched inside my-stuff (ignore list is detection-only)");
check("session cwd is exempt from the ignore list", inMyStuff.lines()[0].startsWith("~/Workspace/my-stuff master"), inMyStuff.lines()[0]);
await inMyStuff.fire("tool_call", { toolName: "edit", input: { path: `${home}/Workspace/my-stuff/ai/AGENTS.md` } });
await inMyStuff.settle(1200);
check("stays put while editing that repo", inMyStuff.lines()[0].startsWith("~/Workspace/my-stuff master"), inMyStuff.lines()[0]);
await inMyStuff.fire("tool_call", { toolName: "read", input: { path: `${TREE_A}/package.json` } });
await inMyStuff.settle();
check("still follows a real worktree when one is touched", inMyStuff.lines()[0].startsWith(`${TREE_A.replace(home, "~")} `), inMyStuff.lines()[0]);
await inMyStuff.fire("session_shutdown", {});

// ------------------------------------------------- agent declares its worktree
const agent = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`);
await agent.fire("session_start", { reason: "startup" });
await agent.settle();
check("set_worktree is registered for the LLM", agent.tools.has("set_worktree"));
check(
	"set_worktree carries prompt guidance",
	(agent.tools.get("set_worktree").promptGuidelines ?? []).length > 0 &&
		typeof agent.tools.get("set_worktree").promptSnippet === "string",
);

const declared = await agent.callTool("set_worktree", {
	path: `${TREE_A}/areas/clients/admin-web`,
	issue: "7343",
	purpose: "reopen legal copy",
});
await agent.settle();
agent.show("5. agent declared #7343 in the " + shortName(TREE_A) + " tree");
check("declaring reports the worktree root, not the path given", declared.content[0].text.includes(TREE_A));
check("footer follows the declaration", agent.lines()[0].startsWith(`📌 ${TREE_A.replace(home, "~")} `), agent.lines()[0]);
check("footer shows issue and purpose", agent.lines()[0].includes("• #7343 reopen legal copy"), agent.lines()[0]);
check("session is named for context switching", agent.sessionName() === "#7343 reopen legal copy", `${agent.sessionName()}`);

// Requirement 3: research elsewhere must not move the target.
for (const [label, payload] of [
	["read another worktree", { toolName: "read", input: { path: `${TREE_B}/README.md` } }],
	["bash cd into the session tree", { toolName: "bash", input: { command: `cd ${SESSION_TREE} && git log -1` } }],
	["grep /tmp", { toolName: "bash", input: { command: "rg foo /tmp" } }],
] as [string, any][]) {
	await agent.fire("tool_call", payload);
	await agent.settle(1200);
	check(`declaration survives: ${label}`, agent.lines()[0].startsWith(`📌 ${TREE_A.replace(home, "~")} `), agent.lines()[0]);
}

// Requirement 4: moving to another worktree is the same call again.
await agent.callTool("set_worktree", { path: TREE_B, issue: "#7256", purpose: "announce selection" });
await agent.settle();
agent.show("6. agent moved to #7256 in the " + shortName(TREE_B) + " tree");
check("re-declaring moves the target", agent.lines()[0].startsWith(`📌 ${TREE_B.replace(home, "~")} `), agent.lines()[0]);
check("issue prefix is normalized once", agent.lines()[0].includes("• #7256 announce selection"), agent.lines()[0]);

let rejected = "";
try {
	await agent.callTool("set_worktree", { path: "/tmp", issue: "9999" });
} catch (error) {
	rejected = (error as Error).message;
}
check("declaring a non-worktree fails loudly", rejected.includes("Not inside a git worktree"), rejected);
check("a rejected declaration leaves the target alone", agent.lines()[0].startsWith(`📌 ${TREE_B.replace(home, "~")} `));

await agent.commands.get("worktree").handler("", agent.ctx);
check(
	"/worktree reports the declaration",
	agent.notices.at(-1)?.includes("(declared: #7256 announce selection)") === true,
	`${agent.notices.at(-1)}`,
);
await agent.fire("session_shutdown", {});

// ------------------------------------------- a declaration outlives the process
const resumed = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`, [
	{ type: "custom", customType: "worktree-focus", timestamp: "2026-08-22T01:00:00.000Z", data: { path: TREE_A } },
	{
		type: "custom",
		customType: "worktree-focus",
		timestamp: "2026-08-22T02:00:00.000Z",
		data: { path: TREE_B, issue: "7256", purpose: "announce selection" },
	},
]);
await resumed.fire("session_start", { reason: "startup" });
await resumed.settle();
resumed.show("7. session resumed with a declaration already on record");
check("newest declaration is restored, not the session cwd", resumed.lines()[0].startsWith(`📌 ${TREE_B.replace(home, "~")} `), resumed.lines()[0]);
await resumed.fire("session_shutdown", {});

const cleared = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`, [
	{ type: "custom", customType: "worktree-focus", timestamp: "2026-08-22T01:00:00.000Z", data: { path: TREE_A } },
	{ type: "custom", customType: "worktree-focus", timestamp: "2026-08-22T02:00:00.000Z", data: { path: null } },
]);
await cleared.fire("session_start", { reason: "startup" });
await cleared.settle();
check("a cleared declaration stays cleared", cleared.lines()[0].startsWith(SESSION_TREE.replace(home, "~")), cleared.lines()[0]);
await cleared.fire("session_shutdown", {});

// --------------------------------------------------- the user owns /name
const named = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`, [
	{ type: "session_info", timestamp: "2026-08-22T01:00:00.000Z", name: "my own title" },
]);
await named.fire("session_start", { reason: "startup" });
await named.settle();
const kept = await named.callTool("set_worktree", { path: TREE_A, issue: "7343", purpose: "reopen legal copy" });
await named.settle();
check("a user-set session name is never clobbered", named.sessionName() === "my own title", `${named.sessionName()}`);
check("and the tool says so instead of retrying", kept.content[0].text.includes("set by the user"), kept.content[0].text);
check("the worktree is still declared", named.lines()[0].startsWith(`📌 ${TREE_A.replace(home, "~")} `), named.lines()[0]);
await named.fire("session_shutdown", {});

// A name we wrote before a restart is still ours, even when the newest record is
// a human pin that carries no name of its own.
const reowned = makeEnv(`${SESSION_TREE}/areas/clients/admin-web`, [
	{
		type: "custom",
		customType: "worktree-focus",
		timestamp: "2026-08-22T01:00:00.000Z",
		data: { path: TREE_A, issue: "7343", purpose: "reopen legal copy" },
	},
	{ type: "session_info", timestamp: "2026-08-22T01:00:01.000Z", name: "#7343 reopen legal copy" },
	{ type: "custom", customType: "worktree-focus", timestamp: "2026-08-22T02:00:00.000Z", data: { path: TREE_B } },
]);
await reowned.fire("session_start", { reason: "startup" });
await reowned.settle();
const renamed = await reowned.callTool("set_worktree", { path: TREE_B, issue: "7256", purpose: "announce selection" });
await reowned.settle();
check("our own earlier name is reclaimed after a restart", reowned.sessionName() === "#7256 announce selection", `${reowned.sessionName()}`);
check("and the tool reports the rename", renamed.content[0].text.includes("Session named: #7256"), renamed.content[0].text);
await reowned.fire("session_shutdown", {});

console.log(`\nnotices: ${JSON.stringify(env.notices)}`);

process.exit(failures ? 1 : 0);
