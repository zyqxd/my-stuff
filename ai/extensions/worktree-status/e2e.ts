import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { visibleWidth } from "@earendil-works/pi-tui";
import { getThemeByName } from "@earendil-works/pi-coding-agent/theme";
import { stripVTControlCharacters } from "node:util";
import factory, { displayPath } from "./index.ts";
import { SpendLedger } from "./accounting.ts";
import { reconcileSession } from "./diagnostic.ts";
import { makeFixtures } from "./test-fixtures.ts";

const fixture = makeFixtures();
let failures = 0;
let checks = 0;
const theme = { fg: (_color: string, text: string) => text, bold: (text: string) => text };
const usage = [
	{ type: "message", message: { role: "assistant", usage: { input: 2, output: 210, cacheRead: 9400, cacheWrite: 68000, cost: { total: 0.435 } } } },
	{ type: "message", message: { role: "toolResult", usage: { cost: { total: 0.001 } } } },
];
const record = (path: string | null, issue?: string, purpose?: string) => ({
	type: "custom", customType: "worktree-focus", timestamp: "2026-08-22T01:00:00.000Z", data: { path, issue, purpose },
});

function check(name: string, fn: () => void) {
	checks++;
	try { fn(); console.log(`ok   ${name}`); }
	catch (error) { failures++; console.log(`FAIL ${name}\n${(error as Error).message}`); }
}

function makeEnv(cwd: string, seed: any[] = [], renderTheme = theme) {
	const handlers = new Map<string, Function[]>();
	const commands = new Map<string, any>();
	const tools = new Map<string, any>();
	const notices: string[] = [];
	const log: any[] = [...seed, ...usage];
	const calls: string[][] = [];
	const pending = new Set<Promise<unknown>>();
	let footer: any;
	let renderRequests = 0;
	let branchChange = () => {};
	let failGit: (args: string[]) => boolean = () => false;
	let holdGit: (args: string[]) => boolean = () => false;
	let releaseGit: (() => void) | undefined;
	const events = new Map<string, Set<Function>>();
	const sessionName = () => log.findLast((entry) => entry.type === "session_info")?.name;
	const pi: any = {
		on: (name: string, handler: Function) => handlers.set(name, [...(handlers.get(name) ?? []), handler]),
		events: { on: (name: string, fn: Function) => { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(fn); return () => events.get(name)!.delete(fn); } },
		registerCommand: (name: string, options: any) => commands.set(name, options),
		registerTool: (tool: any) => tools.set(tool.name, tool),
		appendEntry: (customType: string, data: any) => log.push({ type: "custom", customType, timestamp: new Date().toISOString(), data }),
		getSessionName: sessionName,
		setSessionName: (name: string) => log.push({ type: "session_info", name }),
		exec: (command: string, args: string[], options: any = {}) => {
			calls.push(args);
			const task = new Promise((res) => {
				if (failGit(args)) return res({ stdout: "", stderr: "fatal: injected failure", code: 128, killed: false });
				execFile(command, args, { encoding: "utf8", timeout: options.timeout, env: fixture.env }, (error: any, stdout, stderr) => {
					const done = () => res({ stdout, stderr, code: error ? (error.code ?? 1) : 0, killed: false });
					if (holdGit(args)) releaseGit = done; else done();
				});
			});
			pending.add(task);
			task.finally(() => pending.delete(task));
			return task;
		},
	};
	const ctx: any = {
		cwd, hasUI: true, mode: "tui",
		model: { id: "claude-opus-5", provider: "anthropic", reasoning: true, contextWindow: 1_000_000 },
		thinkingLevel: "high",
		sessionManager: { getEntries: () => log, getSessionName: sessionName, getSessionFile: () => `${fixture.base}/parent.jsonl`, getSessionId: () => "parent" },
		getContextUsage: () => ({ tokens: 80_000, contextWindow: 1_000_000, percent: 8.0 }),
		ui: {
			setFooter: (build: any) => {
				footer?.dispose();
				footer = build({ requestRender: () => renderRequests++ }, renderTheme, {
					getGitBranch: () => "wrong-provider-branch",
					getExtensionStatuses: () => new Map([["mcp", "MCP 0/1"]]),
					getAvailableProviderCount: () => 1,
					onBranchChange: (callback: () => void) => { branchChange = callback; return () => { branchChange = () => {}; }; },
				});
			},
			notify: (message: string) => notices.push(message), theme,
		},
	};
	factory(pi);
	return {
		ctx, log, calls, notices, commands, tools, sessionName,
		fire: async (event: string, payload: any = {}, eventContext = ctx) => { for (const handler of handlers.get(event) ?? []) await handler(payload, eventContext); },
		callTool: (params: any) => tools.get("set_worktree").execute("call-1", params, undefined, undefined, ctx),
		command: (args: string) => commands.get("worktree").handler(args, ctx),
		render: (width = 100) => footer.render(width) as string[],
		settle: async () => { await new Promise((res) => setTimeout(res, 650)); while (pending.size) await Promise.all([...pending]); },
		branchChange: () => branchChange(),
		failGit: (predicate: (args: string[]) => boolean) => { failGit = predicate; },
		holdGit: (predicate: (args: string[]) => boolean) => { holdGit = predicate; },
		waitForHeld: async () => { for (let i = 0; i < 200 && !releaseGit; i++) await new Promise(resolve => setTimeout(resolve, 10)); assert.ok(releaseGit, "git command held"); },
		releaseGit: () => { holdGit = () => false; releaseGit?.(); releaseGit = undefined; },
		emit: (name: string, event: any) => { for (const fn of events.get(name) ?? []) fn(event); },
		listenerCount: () => [...events.values()].reduce((sum, listeners) => sum + listeners.size, 0),
		renderCount: () => renderRequests,
	};
}

const envs: ReturnType<typeof makeEnv>[] = [];
async function start(cwd: string, seed: any[] = []) {
	const env = makeEnv(cwd, seed);
	envs.push(env);
	await env.fire("session_start", { reason: "startup" });
	await env.settle();
	return env;
}

try {
	const env = await start(`${fixture.main}/areas/clients/admin-web`);
	check("session starts at actual nested cwd, not containing root", () => assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]));
	check("usage/model line and extension status are preserved", () => {
		assert.equal(env.render().length, 2);
		assert.ok(env.render()[0].endsWith("MCP 0/1"));
		assert.match(env.render()[1], /^Total \$0\.44 · main \$0\.44 · agents \$0\.00/);
		assert.match(env.render()[1], /ctx 8\.0%\/1\.0M/);
		assert.match(env.render()[1], /claude-opus-5 · high/);
	});
	assert.equal(readFileSync(`${fixture.linked}/README.md`, "utf8"), "fixture\n");
	await env.fire("tool_call", { toolName: "read", input: { path: `${fixture.linked}/README.md` } });
	await env.settle();
	check("reading another repo preserves actual cwd and branch", () => assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]));
	const shellCommand = `cd "${fixture.other}" && pwd`;
	assert.equal(execFileSync("bash", ["-c", shellCommand], { cwd: env.ctx.cwd, encoding: "utf8" }).trim(), fixture.other);
	await env.fire("tool_call", { toolName: "bash", input: { command: shellCommand } });
	await env.settle();
	check("one-call bash cd preserves actual cwd and branch", () => assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]));

	const declared = await env.callTool({ path: `${fixture.linked}/areas/clients/admin-web`, issue: "7343", purpose: "reopen legal copy" });
	await env.settle();
	check("target records containing root and names the session", () => {
		assert.equal(declared.details.path, fixture.linked);
		assert.equal(env.sessionName(), "#7343 reopen legal copy");
		assert.ok(env.tools.get("set_worktree").promptGuidelines.length);
	});
	check("declared target and task label never leak into location", () => {
		assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]);
		assert.doesNotMatch(env.render()[0], /📌|7343|reopen legal copy/);
		assert.match(declared.content[0].text, /Target:/);
		assert.match(declared.content[0].text, /cwd unchanged/);
	});
	await env.command("");
	check("command distinguishes actual cwd and recorded target", () => {
		assert.ok(env.notices.at(-1)?.includes(`Cwd: ${env.ctx.cwd}`), env.notices.at(-1));
		assert.ok(env.notices.at(-1)?.includes(`Target: ${fixture.linked}`), env.notices.at(-1));
	});
	check("command reports actual checkout and branch separately from target", () => {
		assert.ok(env.notices.at(-1)?.includes(`Checkout: ${fixture.main}`), env.notices.at(-1));
		assert.ok(env.notices.at(-1)?.includes("git: trunk"), env.notices.at(-1));
	});
	await env.callTool({ path: fixture.other, issue: "#7256", purpose: "announce selection" });
	check("re-declaring updates our session name", () => assert.equal(env.sessionName(), "#7256 announce selection"));
	await assert.rejects(env.callTool({ path: fixture.nonGit }), /Not inside a git worktree/);
	await env.command("auto");
	check("auto persists a clear without following reads again", () => {
		assert.equal(env.log.at(-1).data.path, null);
		assert.match(env.notices.at(-1)!, /Target cleared; cwd unchanged/);
		assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]);
	});
	await env.command(fixture.other);
	check("manual target command does not move location", () => {
		assert.equal(env.log.at(-1).data.path, fixture.other);
		assert.ok(env.render()[0].startsWith(displayPath(env.ctx.cwd) + " git: trunk"), env.render()[0]);
	});
	check("descriptions no longer promise footer pinning or read detection", () => {
		assert.doesNotMatch(env.tools.get("set_worktree").description, /Pins the footer|move to a different worktree/);
		assert.doesNotMatch(env.commands.get("worktree").description, /Pin|detect from tool calls/);
	});
	for (const width of [100, 80, 60, 40, 20]) {
		check(`width ${width}: two lines within budget`, () => assert.ok(env.render(width).length === 2 && env.render(width).every((line) => visibleWidth(line) <= width)));
	}
	check("state changes request render", () => assert.ok(env.renderCount() > 0));

	const resumed = await start(fixture.main, [record(fixture.linked)]);
	check("restoring a target never moves actual cwd", () => assert.ok(resumed.render()[0].startsWith(displayPath(fixture.main) + " git: trunk"), resumed.render()[0]));
	await resumed.command("");
	check("restored target remains discoverable", () => assert.ok(resumed.notices.at(-1)?.includes(`Target: ${fixture.linked}`)));
	resumed.ctx.cwd = `${fixture.other}/areas/clients/admin-web`;
	await resumed.fire("tool_call", { toolName: "read", input: { path: `${fixture.main}/README.md` } });
	await resumed.settle();
	check("actual live cwd change updates location and branch", () => assert.ok(resumed.render()[0].startsWith(displayPath(resumed.ctx.cwd) + " git: research"), resumed.render()[0]));
	resumed.ctx.cwd = fixture.nonGit;
	resumed.log.splice(0, resumed.log.length, ...usage);
	await resumed.fire("session_start", { reason: "new" });
	await resumed.settle();
	await resumed.command("");
	check("same-instance session switch clears stale target", () => assert.ok(resumed.notices.at(-1)?.includes("Target: none"), resumed.notices.at(-1)));
	const linked = await start(`${fixture.linked}/areas/clients/admin-web`);
	check("linked checkout embeds meaningful World src identity and matching branch", () => {
		assert.match(linked.render()[0], /\[i7343-payment-section\/src\].*admin-web.*git: payment-section-7343/);
		assert.doesNotMatch(linked.render()[0], /📌|wrong-provider-branch/);
	});
	check("main checkout has no worktree marker", () => assert.doesNotMatch(env.render()[0], /\[/));
	for (const width of [100, 80, 60, 40, 20]) {
		check(`linked width ${width}: cwd leaf and worktree identity survive without overflow`, () => {
			const lines = linked.render(width);
			assert.ok(lines.length === 2 && lines.every((line) => visibleWidth(line) <= width), lines.join("\n"));
			assert.match(lines[0], /\[i7343[^\]]*\].*admin-web/);
			if (width >= 80) assert.match(lines[0], /git: payment-section-7343/);
		});
		console.log(`linked width ${width}: |${stripVTControlCharacters(linked.render(width)[0])}|`);
	}
	check("render performs no git IO", () => {
		const before = linked.calls.length;
		for (let i = 0; i < 20; i++) linked.render(80);
		assert.equal(linked.calls.length, before);
	});
	const submodule = `${fixture.main}/modules/library`;
	fixture.git(fixture.main, "-c", "protocol.file.allow=always", "submodule", "add", "--quiet", fixture.other, "modules/library");
	check("fixture submodule and linked roots both have gitfiles", () => {
		assert.ok(statSync(`${submodule}/.git`).isFile());
		assert.ok(statSync(`${fixture.linked}/.git`).isFile());
	});
	const sub = await start(submodule);
	check("submodule gitfile is not marked as linked worktree", () => {
		assert.match(sub.render()[0], /library git: research/);
		assert.doesNotMatch(sub.render()[0], /\[/);
	});
	fixture.git(fixture.linked, "checkout", "--quiet", "--detach");
	linked.branchChange();
	await linked.settle();
	check("branch change resolves detached SHA from that checkout", () => assert.ok(linked.render()[0].includes(`git: detached@${fixture.git(fixture.linked, "rev-parse", "--short", "HEAD").trim()}`), linked.render()[0]));
	const plain = await start(fixture.nonGit);
	check("nonGit is directory only, without bogus git or clean", () => {
		assert.ok(plain.render()[0].startsWith(displayPath(fixture.nonGit)));
		assert.doesNotMatch(plain.render()[0], /git:|no-git|clean|unknown/);
	});
	const outside = `${fixture.main}/outside`;
	symlinkSync(fixture.nonGit, outside);
	const linkedPlain = await start(outside);
	check("a symlink inside Git pointing to nonGit stays directory only", () => {
		assert.equal(linkedPlain.render()[0], plain.render()[0]);
	});
	await linkedPlain.command("");
	check("nonGit symlink details do not borrow the lexical parent's checkout", () => {
		assert.match(linkedPlain.notices.at(-1)!, /Checkout: none \(non-Git\)/);
		assert.doesNotMatch(linkedPlain.notices.at(-1)!, /git: unknown/);
	});
	const broken = `${fixture.base}/broken`;
	mkdirSync(broken);
	writeFileSync(`${broken}/.git`, "gitdir: /missing/footer-git-dir\n");
	const invalid = await start(broken);
	check("broken git metadata reports unknown rather than nonGit or clean", () => {
		assert.match(invalid.render()[0], /git: unknown/);
		assert.doesNotMatch(invalid.render()[0], /clean/);
	});
	linked.failGit((args) => args.includes("status"));
	linked.branchChange();
	await linked.settle();
	check("failed git status is not falsely clean", () => {
		assert.match(linked.render()[0], /status\?/);
		assert.doesNotMatch(linked.render()[0], /clean/);
	});
	linked.failGit((args) => args.includes("--git-common-dir"));
	linked.branchChange();
	await linked.settle();
	check("missing common-dir metadata is unknown", () => {
		assert.match(linked.render()[0], /git: unknown/);
		assert.doesNotMatch(linked.render()[0], /clean/);
	});
	linked.failGit((args) => args.includes("symbolic-ref") || args.includes("--short"));
	linked.branchChange();
	await linked.settle();
	check("missing branch metadata never claims clean", () => {
		assert.match(linked.render()[0], /git: unknown/);
		assert.doesNotMatch(linked.render()[0], /clean/);
	});
	linked.failGit((args) => args.includes("symbolic-ref"));
	linked.branchChange();
	await linked.settle();
	check("symbolic-ref failure is unknown, not a fabricated detached HEAD", () => {
		assert.match(linked.render()[0], /git: unknown/);
		assert.doesNotMatch(linked.render()[0], /detached@|clean/);
	});
	linked.failGit(() => false);
	fixture.git(fixture.linked, "checkout", "--quiet", "payment-section-7343");
	writeFileSync(`${fixture.linked}/README.md`, "unstaged\n");
	writeFileSync(`${fixture.linked}/added.txt`, "staged\n");
	fixture.git(fixture.linked, "add", "added.txt");
	writeFileSync(`${fixture.linked}/untracked.txt`, "untracked\n");
	linked.branchChange();
	await linked.settle();
	check("dirty counts match real checkout status", () => assert.match(linked.render(140)[0], /git: payment-section-7343 · 1 staged · 1 unstaged · 1 untracked/));
	check("narrow Git counts are omitted atomically, never claim clean or show cryptic symbols", () => {
		for (const width of [100, 80, 60, 40, 20]) assert.doesNotMatch(linked.render(width)[0], /clean|\+1|~1|\?1|untrack…|stag…/);
	});
	await linked.callTool({ path: fixture.other, issue: "9999", purpose: "target only" });
	await linked.fire("session_start", { reason: "reload" });
	await linked.settle();
	await linked.command("");
	check("same-instance reload restores target without changing location", () => {
		assert.match(linked.render()[0], /\[i7343-payment-section\/src\].*admin-web.*git: payment-section-7343/);
		assert.doesNotMatch(linked.render()[0], /9999|target only|research/);
		assert.ok(linked.notices.at(-1)?.includes(`Target: ${fixture.other}`));
	});
	const beforeAliases = linked.render()[0];
	for (const alias of ["auto", "clear", "off"]) {
		await linked.command(fixture.other);
		await linked.command(alias);
		await linked.fire("tool_call", { toolName: "read", input: { path: `${fixture.other}/README.md` } });
		await linked.settle();
		check(`${alias} clears only target and never enables read-following`, () => {
			assert.equal(linked.log.at(-1).data.path, null);
			assert.equal(linked.render()[0], beforeAliases);
		});
	}
	await linked.command("ignored");
	check("legacy ignored alias explains disabled detection", () => assert.match(linked.notices.at(-1)!, /File-read detection is disabled/));
	const completion = linked.commands.get("worktree").getArgumentCompletions(`${fixture.base}/other`);
	check("path completion preserves full executable path with spaces and Unicode", () => assert.equal(completion[0].value, fixture.other));
	const longTarget = `${fixture.base}/${"long-directory-".repeat(5)}`;
	mkdirSync(longTarget);
	const longCompletion = linked.commands.get("worktree").getArgumentCompletions(`${fixture.base}/long-`);
	check("long path completion is never an elided display label", () => assert.equal(longCompletion[0].value, longTarget));
	const beforeRejected = linked.log.length;
	await linked.command(`${fixture.base}/missing`);
	await assert.rejects(linked.callTool({ path: `${fixture.base}/missing` }), /No such path/);
	check("rejected commands do not change target records", () => assert.equal(linked.log.length, beforeRejected));
	await linked.callTool({ path: "../../../README.md" });
	check("relative tool target resolves from ctx cwd", () => assert.equal(linked.log.at(-1).data.path, fixture.linked));
	const alias = `${fixture.base}/alias`;
	symlinkSync(`${fixture.main}/areas/clients/admin-web`, alias);
	const aliased = await start(alias);
	check("physical cwd is resolved outside render", () => {
		assert.match(aliased.render()[0], /admin-web git: trunk/);
		assert.doesNotMatch(aliased.render()[0], /alias/);
	});
	const unicode = await start(fixture.other);
	check("spaces and Unicode cwd remain intact", () => assert.match(unicode.render()[0], /other repo 日本 git: research/));
	for (const width of [100, 80, 60, 40, 20]) {
		check(`Unicode width ${width} is measured in terminal cells`, () => assert.ok(unicode.render(width).every((line) => visibleWidth(line) <= width)));
	}
	const named = await start(fixture.main, [{ type: "session_info", name: "my own title" }]);
	const kept = await named.callTool({ path: fixture.linked, issue: "7343", purpose: "legal copy" });
	check("user name remains owned by user", () => {
		assert.equal(named.sessionName(), "my own title");
		assert.match(kept.content[0].text, /set by the user/);
	});
	const reowned = await start(fixture.main, [record(fixture.linked, "7343", "legal copy"), { type: "session_info", name: "#7343 legal copy" }, record(fixture.other)]);
	await reowned.callTool({ path: fixture.other, issue: "7256", purpose: "announce selection" });
	check("our prior name is reclaimed after restart", () => assert.equal(reowned.sessionName(), "#7256 announce selection"));
	reowned.log.splice(0, reowned.log.length, { type: "session_info", name: "#7256 announce selection" });
	reowned.ctx.cwd = fixture.other;
	await reowned.fire("session_start", { reason: "resume" });
	await reowned.settle();
	await reowned.callTool({ path: fixture.linked, issue: "123", purpose: "new target" });
	check("same-instance session switch forgets previous name ownership", () => assert.equal(reowned.sessionName(), "#7256 announce selection"));
	const racing = await start(fixture.other);
	racing.holdGit(args => args.includes("symbolic-ref"));
	racing.branchChange();
	await racing.waitForHeld();
	fixture.git(fixture.other, "checkout", "--quiet", "-b", "branch-after-refresh-start");
	racing.branchChange();
	racing.branchChange();
	racing.releaseGit();
	await racing.settle();
	check("forced branch event during in-flight refresh is coalesced, never dropped", () => {
		assert.match(racing.render()[0], /branch-after-refresh-start/);
		assert.equal(racing.calls.filter(args => args.includes("symbolic-ref")).length, 3);
	});
	const beforeThrottle = racing.calls.length;
	await racing.fire("tool_call", { toolName: "read" });
	await racing.fire("tool_result", { toolName: "read" });
	await racing.fire("turn_end");
	await racing.settle();
	check("read and turn events do not force duplicate refresh inside throttle", () => assert.equal(racing.calls.length, beforeThrottle));
	const ansiTheme = getThemeByName("dark")!;
	const styled = makeEnv(fixture.other, [], ansiTheme);
	envs.push(styled);
	await styled.fire("session_start");
	await styled.settle();
	for (const width of [100, 80, 60, 40, 20]) check(`ANSI theme width ${width}: total survives before cache counters`, () => {
		const lines = styled.render(width);
		assert.equal(lines.length, 2);
		assert.ok(lines.every(line => visibleWidth(line) <= width));
		assert.ok(lines[1].startsWith(ansiTheme.bold(ansiTheme.fg("text", "Total $0.44"))), lines[1]);
		assert.doesNotMatch(stripVTControlCharacters(lines[1]), /R9\.4k|W68k/);
	});
	check("normal Git state is not warning or success colored", () => {
		assert.ok(styled.render(160)[0].includes(ansiTheme.fg("muted", "clean")));
	});
	await styled.fire("tool_execution_start", { toolCallId: "live-call", toolName: "subagent", args: { agent: "worker" } });
	check("unidentified live launch is partial before its first usage record", () => assert.match(stripVTControlCharacters(styled.render(20)[1]), /^Total \$0\.44 partial$/));
	await styled.fire("tool_execution_update", { toolName: "subagent", partialResult: { details: { mode: "single", runId: "direct", results: [{ runId: "direct", agent: "worker", usage: { cost: 1 }, progress: { status: "running" } }] } } });
	check("reported foreground live spending is visible without waiting for completion", () => assert.match(stripVTControlCharacters(styled.render(20)[1]), /^Total \$1\.44 partial$/));
	const agentResult = { mode: "single", runId: "direct", results: [{ agent: "worker", runId: "direct", index: 0, exitCode: 0, usage: { cost: 3 }, sessionFile: "/children/direct.jsonl" }] };
	styled.log.push({ type: "message", message: { role: "toolResult", toolName: "subagent", usage: { input: 100, output: 200, cacheRead: 300, cacheWrite: 400, cost: { total: 3 } }, details: agentResult } });
	await styled.fire("tool_result", { toolCallId: "live-call", toolName: "subagent", details: agentResult }, { ...styled.ctx });
	await styled.settle();
	check("event-driven spending leads footer without contaminating parent context", () => {
		const line = stripVTControlCharacters(styled.render(140)[1]);
		assert.match(line, /^Total \$3\.44 · main \$0\.44 · agents \$3\.00/);
		assert.match(line, /ctx 8\.0%\/1\.0M/);
	});
	const waitResult = { mode: "management", results: [], completions: [{ mode: "single", runId: "direct", results: agentResult.results }] };
	styled.log.push({ type: "message", message: { role: "toolResult", toolName: "bg_wait", usage: { input: 100, output: 200, cacheRead: 300, cacheWrite: 400, cost: { total: 3 } }, details: waitResult } });
	await styled.fire("tool_result", { toolName: "bg_wait", details: waitResult });
	await styled.settle();
	check("native wait rollup keeps combined cost and parent counters unchanged", () => {
		const line = stripVTControlCharacters(styled.render(200)[1]);
		assert.match(line, /^Total \$3\.44 · main \$0\.44 · agents \$3\.00/);
		assert.match(line, /↑2 ↓210 R9\.4k W68k/);
	});
	const snapshotCount = () => styled.log.filter(entry => entry.customType === "worktree-spend-v1").length;
	const beforePaints = snapshotCount();
	for (let i = 0; i < 100; i++) styled.render();
	await styled.fire("turn_end");
	await styled.settle();
	check("unchanged polls and paints never append accounting snapshots", () => assert.equal(snapshotCount(), beforePaints));
	await styled.fire("session_start", { reason: "reload" });
	await styled.settle();
	check("reload restores spending without duplicate event listeners", () => {
		assert.match(stripVTControlCharacters(styled.render()[1]), /^Total \$3\.44/);
		assert.equal(styled.listenerCount(), 3);
	});
	const costSnapshots = snapshotCount();
	const getsEntries = styled.ctx.sessionManager.getEntries;
	styled.ctx.sessionManager.getEntries = () => { throw new Error("render must not walk session entries"); };
	const summarize = SpendLedger.prototype.summary;
	SpendLedger.prototype.summary = () => { throw new Error("render must not aggregate records"); };
	check("render uses accounting snapshots without scanning session history or aggregating", () => assert.match(stripVTControlCharacters(styled.render()[1]), /^Total \$3\.44/));
	SpendLedger.prototype.summary = summarize;
	styled.ctx.sessionManager.getEntries = getsEntries;
	assert.equal(snapshotCount(), costSnapshots);
	await styled.fire("session_shutdown");
	check("shutdown removes accounting event subscriptions", () => assert.equal(styled.listenerCount(), 0));
	const afterStyledShutdown = styled.calls.length;
	styled.branchChange();
	await styled.settle();
	check("shutdown removes forced Git refresh subscription", () => assert.equal(styled.calls.length, afterStyledShutdown));
	const summarized = makeEnv(fixture.nonGit);
	envs.push(summarized);
	summarized.log.splice(0, summarized.log.length, { type: "message", message: { role: "assistant", usage: { cost: { total: 2 } } } });
	await summarized.fire("session_start");
	await summarized.settle();
	const summaryGitCalls = summarized.calls.length;
	summarized.log.push({ type: "compaction", usage: { cost: { total: 1 } } });
	await summarized.fire("session_compact");
	await summarized.settle();
	check("manual compaction refreshes parent spend without a model turn or Git refresh", () => {
		assert.match(summarized.render()[1], /^Total \$3\.00 · main \$3\.00/);
		assert.equal(summarized.calls.length, summaryGitCalls);
	});
	summarized.log.push({ type: "branch_summary", usage: { cost: { total: 1 } } });
	await summarized.fire("session_tree");
	await summarized.settle();
	check("manual tree summary refreshes parent spend without a model turn or Git refresh", () => {
		assert.match(summarized.render()[1], /^Total \$4\.00 · main \$4\.00/);
		assert.equal(summarized.calls.length, summaryGitCalls);
	});
	await summarized.fire("session_shutdown");
	summarized.log.push({ type: "branch_summary", usage: { cost: { total: 10 } } });
	await summarized.fire("session_tree");
	await summarized.settle();
	check("summary events after shutdown cannot mutate cached spending", () => assert.match(summarized.render()[1], /^Total \$4\.00/));
	const switched = await start(fixture.other);
	switched.holdGit(args => args.includes("--git-common-dir"));
	switched.branchChange();
	await switched.waitForHeld();
	switched.branchChange();
	switched.ctx.cwd = fixture.nonGit;
	await switched.fire("session_start", { reason: "new" });
	const beforeRelease = switched.calls.length;
	switched.releaseGit();
	await switched.settle();
	check("session and cwd generation discard old forced refreshes in flight", () => {
		assert.equal(switched.calls.length, beforeRelease);
		assert.doesNotMatch(switched.render()[0], /git:|research|branch-after/);
	});
	const headless = makeEnv(fixture.main);
	envs.push(headless);
	headless.ctx.mode = "json";
	await headless.fire("session_start");
	await headless.fire("tool_call");
	await headless.fire("turn_end");
	await headless.settle();
	check("headless children start no footer IO or cost listeners", () => {
		assert.equal(headless.calls.length, 0);
		assert.equal(headless.listenerCount(), 0);
	});
	const diagnosticFile = `${fixture.base}/diagnostic-parent.jsonl`;
	writeFileSync(diagnosticFile, [
		{ type: "session", id: "diagnostic-parent", cwd: fixture.main },
		{ type: "message", message: { role: "assistant", usage: { cost: { total: 0.5 } } } },
		{ type: "message", message: { role: "toolResult", toolName: "subagent", details: agentResult } },
	].map(entry => JSON.stringify(entry)).join("\n"));
	const diagnosticBefore = readFileSync(diagnosticFile, "utf8");
	const diagnosed = await reconcileSession(diagnosticFile);
	check("read-only diagnostic reconciles native parent and child records without modifying session", () => {
		assert.equal(diagnosed.parent.cost, 0.5);
		assert.equal(diagnosed.agents.cost, 3);
		assert.equal(diagnosed.total, 3.5);
		assert.equal(diagnosed.partial, false);
		assert.equal(readFileSync(diagnosticFile, "utf8"), diagnosticBefore);
	});
	const callsBeforeShutdown = reowned.calls.length;
	await reowned.fire("tool_result");
	await reowned.fire("session_shutdown");
	await reowned.settle();
	check("shutdown cancels pending refresh", () => assert.equal(reowned.calls.length, callsBeforeShutdown));
} finally {
	for (const env of envs) await env.fire("session_shutdown");
	for (const env of envs) await env.settle();
	fixture.cleanup();
}
console.log(`\n${checks - failures}/${checks} integration checks passed`);
process.exitCode = failures ? 1 : 0;
