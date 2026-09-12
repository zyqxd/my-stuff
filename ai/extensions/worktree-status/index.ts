/**
 * Two-line footer: actual Pi cwd and its checkout, then usage/model totals.
 * Other extensions' statuses stay right-aligned on line 1.
 *
 * set_worktree and /worktree record a target; neither changes cwd.
 * /worktree auto (also clear/off) clears that record.
 */

import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	ReadonlyFooterDataProvider,
	Theme,
} from "@earendil-works/pi-coding-agent";
import { type AutocompleteItem, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { SPEND_ENTRY, SpendLedger, savedSpend, type SpendSummary } from "./accounting.ts";
import { spendingLine } from "./glance.ts";
import { contractMultiplier } from "./pricing.ts";

/** customType for the persisted focus, replayed on session_start. */
const FOCUS_ENTRY = "worktree-focus";

const REFRESH_DEBOUNCE_MS = 600;
const MIN_REFRESH_INTERVAL_MS = 2_000;
const GIT_TIMEOUT_MS = 20_000;
const PATH_DISPLAY_BUDGET = 46;

type Usage = {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	cost: number;
	cacheHitRate: number | undefined;
};

/**
 * The worktree the session is *meant* to be working in, plus what for.
 * `issue`/`purpose` are set by the agent via set_worktree; a human `/worktree`
 * target carries the path alone.
 */
export type Focus = {
	path: string;
	issue?: string;
	purpose?: string;
};

type RepoState = {
	cwd: string;
	root: string | null;
	linkedRoot: string | null;
	kind: "git" | "non-git" | "unknown";
	statusKnown: boolean;
	branch: string | null;
	staged: number;
	unstaged: number;
	untracked: number;
	checkedAt: number;
	refreshing: boolean;
	pendingForce?: boolean;
};

export function expandHome(input: string): string {
	const home = homedir();
	if (input === "~") return home;
	if (input.startsWith(`~${sep}`) || input.startsWith("~/")) return join(home, input.slice(2));
	return input;
}

function homePath(path: string): string {
	const home = homedir();
	return path === home ? "~" : path.startsWith(home + sep) ? `~${sep}${path.slice(home.length + 1)}` : path;
}

export function displayPath(path: string, width = PATH_DISPLAY_BUDGET, linkedRoot: string | null = null): string {
	if (width <= 0) return "";
	if (linkedRoot) {
		const labelRoot = basename(linkedRoot) === "src" ? dirname(linkedRoot) : linkedRoot;
		const label = relative(dirname(labelRoot), linkedRoot);
		const prefix = homePath(dirname(labelRoot));
		const suffix = relative(linkedRoot, path).split(sep).filter(Boolean);
		const full = `${prefix.endsWith(sep) ? prefix : prefix + sep}[${label}]${suffix.length ? `/${suffix.join(sep)}` : ""}`;
		if (visibleWidth(full) <= width) return full;

		const tail = suffix.length ? `${suffix.length > 1 ? "/…" : ""}/${suffix.at(-1)}` : "";
		const core = `[${label}]${tail}`;
		if (visibleWidth(core) <= width) {
			const budget = width - visibleWidth(core) - 1;
			if (budget < 1) return core;
			const ancestor = displayPath(dirname(labelRoot), budget);
			return `${ancestor === prefix || ancestor.startsWith("…/") ? ancestor : "…"}/${core}`;
		}
		const labelBudget = Math.max(Math.min(6, width - 2), width - visibleWidth(tail) - 2);
		const marker = `[${truncateToWidth(label, labelBudget, "…")}]`;
		return truncateToWidth(marker + truncateToWidth(tail, Math.max(0, width - visibleWidth(marker)), "…"), width, "…");
	}

	const shown = homePath(path);
	if (visibleWidth(shown) <= width) return shown;
	const parts = shown.split(sep).filter(Boolean);
	let kept = parts.slice(-1);
	for (let i = parts.length - 2; i >= 0; i--) {
		const candidate = [parts[i], ...kept];
		if (visibleWidth(`…/${candidate.join(sep)}`) > width) break;
		kept = candidate;
	}
	const tail = kept.join(sep);
	return visibleWidth(`…/${tail}`) <= width ? `…/${tail}` : truncateToWidth(tail, width, "…");
}

/** Session name for a focus: `#7343 reopen legal copy`. Null when there is nothing to say. */
export function focusLabel(focus: Focus): string | null {
	const issue = focus.issue?.trim().replace(/^#+/, "");
	const parts = [issue ? `#${issue}` : "", focus.purpose?.trim() ?? ""].filter(Boolean);
	return parts.length ? parts.join(" ") : null;
}

/**
 * Most recent focus in a session's entries, or null when the newest record is a
 * clear (`path: null`, written by `/worktree auto`). Timestamp-ordered rather
 * than positional, so it does not depend on getBranch's walk direction; ties
 * fall back to append order.
 */
export function lastFocus(entries: readonly unknown[]): Focus | null {
	let best: { focus: Focus | null; at: number } | null = null;
	for (const raw of entries) {
		const entry = raw as { type?: string; customType?: string; timestamp?: string; data?: unknown };
		if (entry.type !== "custom" || entry.customType !== FOCUS_ENTRY) continue;
		const data = entry.data as Partial<Focus> | undefined;
		const at = Date.parse(entry.timestamp ?? "") || 0;
		if (best && at < best.at) continue;
		best = {
			focus: data?.path ? { path: data.path, issue: data.issue, purpose: data.purpose } : null,
			at,
		};
	}
	return best?.focus ?? null;
}

/** Every session name this extension could have written in the given entries. */
export function focusLabels(entries: readonly unknown[]): Set<string> {
	const labels = new Set<string>();
	for (const raw of entries) {
		const entry = raw as { type?: string; customType?: string; data?: unknown };
		if (entry.type !== "custom" || entry.customType !== FOCUS_ENTRY) continue;
		const data = entry.data as Partial<Focus> | undefined;
		if (!data?.path) continue;
		const label = focusLabel(data as Focus);
		if (label) labels.add(label);
	}
	return labels;
}

export function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

/**
 * Parent usage excludes native child rollups, which belong to the spend ledger.
 * Cost is converted from Pi's list-priced cards to the contract rates the AI
 * Proxy records, so the footer reconciles with proxy reporting.
 */
export function collectUsage(entries: readonly unknown[]): Usage {
	const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, cacheHitRate: undefined };
	for (const raw of entries) {
		const entry = raw as { type?: string; message?: { role?: string; toolName?: string; model?: string; usage?: unknown }; model?: string; usage?: unknown };
		if (entry.message?.role === "toolResult" && ["subagent", "bg_wait"].includes(entry.message.toolName ?? "")) continue;
		let usage: AssistantMessage["usage"] | undefined;
		if (entry.type === "message" && (entry.message?.role === "assistant" || entry.message?.role === "toolResult")) {
			usage = entry.message.usage as AssistantMessage["usage"] | undefined;
		} else if (entry.type === "branch_summary" || entry.type === "compaction") {
			usage = entry.usage as AssistantMessage["usage"] | undefined;
		}
		if (!usage) continue;
		total.input += usage.input ?? 0;
		total.output += usage.output ?? 0;
		total.cacheRead += usage.cacheRead ?? 0;
		total.cacheWrite += usage.cacheWrite ?? 0;
		total.cost += (usage.cost?.total ?? 0) * contractMultiplier(entry.message?.model ?? entry.model);
		if (entry.message?.role === "assistant") {
			const prompt = (usage.input ?? 0) + (usage.cacheRead ?? 0) + (usage.cacheWrite ?? 0);
			total.cacheHitRate = prompt > 0 ? ((usage.cacheRead ?? 0) / prompt) * 100 : undefined;
		}
	}
	return total;
}

/** Left text, right text, padded to `width`; the right side is dropped if it cannot fit. */
export function padBetween(left: string, right: string, width: number, minGap = 2): string {
	const leftWidth = visibleWidth(left);
	if (!right) return truncateToWidth(left, width, "…");
	const gap = width - leftWidth - visibleWidth(right);
	if (gap < minGap) return truncateToWidth(left, width, "…");
	return left + " ".repeat(gap) + right;
}

/** Nearest existing directory at or above `path`. */
function nearestExistingDir(path: string): string | null {
	let dir = path;
	while (!existsSync(dir)) {
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
	try {
		return statSync(dir).isDirectory() ? dir : dirname(dir);
	} catch {
		return null;
	}
}

/** Worktree root containing `path`. Works for linked worktrees, where .git is a file. */
export function findWorktreeRoot(path: string): string | null {
	let dir = nearestExistingDir(path);
	if (!dir) return null;
	while (true) {
		if (existsSync(join(dir, ".git"))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

export function countPorcelain(porcelain: string): { staged: number; unstaged: number; untracked: number } {
	let staged = 0;
	let unstaged = 0;
	let untracked = 0;
	for (const line of porcelain.split("\n")) {
		if (!line) continue;
		if (line.startsWith("??")) {
			untracked++;
			continue;
		}
		if (line[0] !== " " && line[0] !== "?") staged++;
		if (line[1] !== " " && line[1] !== "?") unstaged++;
	}
	return { staged, unstaged, untracked };
}

export default function (pi: ExtensionAPI) {
	let focus: Focus | null = null;
	// The last name we set, so a human /name is never clobbered.
	let nameWeSet: string | null = null;
	const repos = new Map<string, RepoState>();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let requestRender: () => void = () => {};
	let disposeFooter: () => void = () => {};
	let generation = 0;
	let activeContext: ExtensionContext | undefined;
	let spend: SpendLedger | undefined;
	let parentUsage = collectUsage([]);
	let agentUsage: SpendSummary = { cost: 0, partial: false, unresolved: 0, pending: 0 };
	let spendTimer: ReturnType<typeof setTimeout> | undefined;
	let spendBusy = false;
	let spendAgain = false;
	let lastSnapshot = "";
	let eventDisposers: (() => void)[] = [];
	const pendingCalls = new Set<string>();

	function stopAccounting() {
		spend?.stop();
		spend = undefined;
		if (spendTimer) clearTimeout(spendTimer);
		spendTimer = undefined;
		for (const dispose of eventDisposers) dispose();
		eventDisposers = [];
		spendBusy = false;
		spendAgain = false;
		pendingCalls.clear();
	}

	async function updateAccounting(ctx: ExtensionContext) {
		const ledger = spend;
		if (!ledger || !activeContext || ledger.owner.sessionFile !== (ctx.sessionManager.getSessionFile() ?? undefined) || ledger.owner.sessionId !== ctx.sessionManager.getSessionId()) return;
		if (spendTimer) clearTimeout(spendTimer);
		spendTimer = undefined;
		if (spendBusy) { spendAgain = true; return; }
		spendBusy = true;
		try {
			const entries = ctx.sessionManager.getEntries();
			parentUsage = collectUsage(entries);
			ledger.ingest(entries);
			agentUsage = ledger.summary();
			await ledger.refresh();
			if (spend !== ledger) return;
			agentUsage = ledger.summary();
			const snapshot = ledger.snapshot();
			const serialized = JSON.stringify(snapshot);
			if (serialized !== lastSnapshot && (snapshot.records.length || snapshot.groups.length)) {
				pi.appendEntry(SPEND_ENTRY, snapshot);
			}
			lastSnapshot = serialized;
			requestRender();
		} catch (error) {
			if (spend === ledger) console.error("worktree-status: spending refresh failed", error);
		} finally {
			if (spend === ledger) {
				spendBusy = false;
				if (spendAgain) { spendAgain = false; void updateAccounting(ctx); }
				else if (ledger.active) {
					spendTimer = setTimeout(() => { spendTimer = undefined; void updateAccounting(ctx); }, 2000);
					spendTimer.unref?.();
				}
			}
		}
	}

	/**
	 * Name the session after the focus. Returns null when the name is left alone
	 * because the user owns it - the caller reports that instead of retrying.
	 */
	function nameSession(next: Focus): string | null {
		const label = focusLabel(next);
		if (!label) return null;
		const current = pi.getSessionName();
		if (current && current !== nameWeSet) return null;
		pi.setSessionName(label);
		nameWeSet = label;
		return label;
	}

	async function git(cwd: string, args: string[]) {
		return pi.exec("git", ["--no-optional-locks", "-C", cwd, ...args], { timeout: GIT_TIMEOUT_MS });
	}

	/** Line 1 left: cwd breadcrumb, branch, dirty counts. */
	function worktreeSegment(theme: Theme, ctx: ExtensionContext, width: number): string {
		const state = repos.get(ctx.cwd);
		const parts = [theme.fg("text", displayPath(state?.cwd ?? ctx.cwd, Math.min(PATH_DISPLAY_BUDGET, width), state?.linkedRoot))];
		const append = (text: string) => {
			if (visibleWidth([...parts, text].join(" ")) > width) return false;
			parts.push(text);
			return true;
		};
		if (state?.kind === "git") {
			append(theme.fg(state.branch === null ? "warning" : "accent", `git: ${state.branch ?? "unknown"}`));
			const dirty: string[] = [];
			if (state.staged) dirty.push(`${state.staged} staged`);
			if (state.unstaged) dirty.push(`${state.unstaged} unstaged`);
			if (state.untracked) dirty.push(`${state.untracked} untracked`);
			if (state.branch !== null) {
				const shown = append(!state.statusKnown ? theme.fg("warning", "status?")
					: dirty.length ? theme.fg("dim", "· ") + theme.fg("muted", dirty.join(" · ")) : theme.fg("muted", "clean"));
				if (!shown && state.statusKnown && dirty.length) append(theme.fg("muted", "dirty"));
			}
		} else if (state?.kind === "unknown" && !state.refreshing) {
			append(theme.fg("warning", "git: unknown"));
		}
		if (!state || state.refreshing) append(theme.fg("dim", "…"));
		return parts.join(" ");
	}

	function usageSegment(theme: Theme, ctx: ExtensionContext, width: number, providerCount: number): string {
		const context = ctx.getContextUsage();
		const model = ctx.model;
		return spendingLine(theme, {
			parent: parentUsage,
			agents: { ...agentUsage, partial: !!pendingCalls.size || agentUsage.partial },
			percent: context?.percent ?? null,
			window: context?.contextWindow ?? model?.contextWindow ?? 0,
			model: model ? `${providerCount > 1 ? `(${model.provider}) ` : ""}${model.id}${model.reasoning ? ` · ${ctx.thinkingLevel ?? "off"}` : ""}` : "no-model",
			tokens: formatTokens,
		}, width);
	}

	/** Line 1 right: statuses published by other extensions (setStatus). */
	function otherStatuses(statuses: ReadonlyMap<string, string>): string {
		return Array.from(statuses.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, text]) => text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim())
			.filter(Boolean)
			.join("  ");
	}

	async function refresh(ctx: ExtensionContext, force = false): Promise<void> {
		const root = ctx.cwd;
		const currentGeneration = generation;
		const existing = repos.get(root);
		if (existing?.refreshing) { existing.pendingForce ||= force; return; }
		if (!force && existing && Date.now() - existing.checkedAt < MIN_REFRESH_INTERVAL_MS) return;

		const state: RepoState = {
			cwd: root,
			root: null,
			linkedRoot: null,
			kind: "unknown",
			statusKnown: false,
			branch: null,
			staged: 0,
			unstaged: 0,
			untracked: 0,
			checkedAt: 0,
			refreshing: false,
		};
		state.refreshing = true;
		repos.set(root, state);
		requestRender();

		try {
			state.cwd = realpathSync(root);
			const metadata = await git(root, ["rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir"]);
			if (currentGeneration !== generation || ctx.cwd !== root) return;
			if (metadata.code !== 0) {
				if (/not a git repository/i.test(metadata.stderr) && !findWorktreeRoot(state.cwd)) state.kind = "non-git";
				return;
			}
			const [checkout, gitDir, commonDir] = metadata.stdout.trimEnd().split("\n");
			if (!checkout || !gitDir || !commonDir) return;
			state.root = realpathSync(checkout);
			state.linkedRoot = realpathSync(gitDir) !== realpathSync(commonDir) ? state.root : null;
			state.kind = "git";
			const named = await git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
			if (currentGeneration !== generation || ctx.cwd !== root) return;
			if (named.code === 0) state.branch = named.stdout.trim() || null;
			else if (named.code === 1) {
				const sha = await git(root, ["rev-parse", "--short", "HEAD"]);
				if (currentGeneration !== generation || ctx.cwd !== root) return;
				if (sha.code === 0 && sha.stdout.trim()) state.branch = `detached@${sha.stdout.trim()}`;
			}

			const porcelain = await git(root, ["status", "--porcelain=v1", "--untracked-files=normal"]);
			if (porcelain.code === 0) {
				Object.assign(state, countPorcelain(porcelain.stdout));
				state.statusKnown = true;
			}
		} catch {
			state.kind = "unknown";
			state.branch = null;
			state.statusKnown = false;
		} finally {
			state.checkedAt = Date.now();
			state.refreshing = false;
			if (repos.get(root) === state && currentGeneration === generation && ctx.cwd === root) {
				requestRender();
				if (state.pendingForce) { state.pendingForce = false; void refresh(ctx, true); }
			}
		}
	}

	function installFooter(ctx: ExtensionContext): void {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((tui, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
			requestRender = () => tui.requestRender();
			// A branch change under us (rebase, checkout in another terminal) also
			// invalidates the dirty counts.
			const unsubscribe = footerData.onBranchChange(() => {
				void refresh(ctx, true);
				tui.requestRender();
			});

			disposeFooter = unsubscribe;
			return {
				dispose: unsubscribe,
				invalidate() {},
				render(width: number): string[] {
					try {
						const top = padBetween(
							worktreeSegment(theme, ctx, width),
							theme.fg("dim", otherStatuses(footerData.getExtensionStatuses())),
							width,
						);
						const bottom = usageSegment(theme, ctx, width, footerData.getAvailableProviderCount());
						return [top, bottom];
					} catch (error) {
						return [truncateToWidth(theme.fg("error", `worktree-status: ${(error as Error).message}`), width, "…"), ""];
					}
				},
			};
		});
	}

	function scheduleRefresh(ctx: ExtensionContext, force = false): void {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			void refresh(ctx, force);
		}, REFRESH_DEBOUNCE_MS);
		debounceTimer.unref?.();
	}

	pi.on("session_start", async (_event, ctx) => {
		generation++;
		activeContext = undefined;
		disposeFooter();
		stopAccounting();
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = null;
		repos.clear();
		// A declared focus outlives /reload and /resume; re-declaring it on every
		// restart is not the agent's job.
		const entries = ctx.sessionManager.getEntries();
		const restored = lastFocus(entries);
		focus = restored && existsSync(restored.path) ? restored : null;
		// Any name this session could have written is ours to update later; anything
		// else is a /name the user typed, and stays.
		const current = pi.getSessionName();
		nameWeSet = current && focusLabels(entries).has(current) ? current : null;
		if (ctx.mode !== "tui") return;
		activeContext = ctx;
		const owner = { sessionFile: ctx.sessionManager.getSessionFile() ?? undefined, sessionId: ctx.sessionManager.getSessionId(), cwd: ctx.cwd };
		const restoredSpend = savedSpend(entries, owner);
		spend = new SpendLedger(owner, restoredSpend);
		parentUsage = collectUsage(entries);
		spend.ingest(entries);
		agentUsage = spend.summary();
		lastSnapshot = restoredSpend ? JSON.stringify(spend.snapshot()) : "";
		for (const event of ["subagent:async-started", "subagent:async-complete", "subagent:foreground-complete"]) {
			eventDisposers.push(pi.events.on(event, (payload) => {
				spend?.observeEvent(payload);
				void updateAccounting(ctx);
			}));
		}
		installFooter(ctx);
		void refresh(ctx, true);
		void updateAccounting(ctx);
	});

	pi.on("tool_call", async (_event, ctx) => { if (activeContext) void refresh(ctx); });

	pi.on("tool_execution_start", async (event) => {
		if (activeContext && event.toolName === "subagent" && (!event.args?.action || ["run", "resume"].includes(event.args.action))) {
			pendingCalls.add(event.toolCallId);
			requestRender();
		}
	});
	pi.on("tool_execution_update", async (event, ctx) => {
		if (!activeContext || event.toolName !== "subagent") return;
		spend?.observe(event.partialResult?.details);
		if (spend) agentUsage = spend.summary();
		requestRender();
		if (!spendTimer) {
			spendTimer = setTimeout(() => { spendTimer = undefined; void updateAccounting(ctx); }, 2000);
			spendTimer.unref?.();
		}
	});
	pi.on("tool_result", async (event, ctx) => {
		if (!activeContext) return;
		pendingCalls.delete(event.toolCallId);
		if (event.toolName === "subagent" || event.toolName === "bg_wait") spend?.observe(event.details);
		scheduleRefresh(ctx);
		void updateAccounting(ctx);
	});
	pi.on("turn_end", async (_event, ctx) => {
		if (!activeContext) return;
		scheduleRefresh(ctx);
		void updateAccounting(ctx);
	});

	for (const event of ["session_compact", "session_tree"] as const) {
		pi.on(event, async (_event, ctx) => { if (activeContext) await updateAccounting(ctx); });
	}

	pi.on("session_shutdown", async () => {
		generation++;
		activeContext = undefined;
		stopAccounting();
		disposeFooter();
		requestRender = () => {};
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = null;
	});

	pi.registerTool({
		name: "set_worktree",
		label: "Set Worktree",
		description:
			"Record a target git worktree and what the session is working on. " +
			"Names the session '#<issue> <purpose>' unless the user owns its name. " +
			"Does not change Pi's cwd or the footer location. The target must already exist; " +
			"call again to update the recorded target.",
		promptSnippet: "Declare the target git worktree, issue, and purpose for this session",
		promptGuidelines: [
			"Call set_worktree once feature or bug work has a worktree, before editing code in it, so the session records which issue it belongs to.",
			"Call set_worktree again when the work moves to a different worktree; reading or researching files in other repos does not need a call.",
		],
		parameters: Type.Object({
			path: Type.String({
				description: "Existing path inside the target worktree. Absolute or ~-relative.",
			}),
			issue: Type.Optional(
				Type.String({ description: "Issue number the work belongs to, e.g. 7343." }),
			),
			purpose: Type.Optional(
				Type.String({ description: "What the work is, in a few words, e.g. 'reopen legal copy'." }),
			),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const path = resolve(ctx.cwd, expandHome(params.path.trim()));
			if (!existsSync(path)) throw new Error(`No such path: ${path}. Create the worktree first.`);
			const root = findWorktreeRoot(path);
			if (!root) throw new Error(`Not inside a git worktree: ${path}. Run \`git worktree add\` first.`);

			const next: Focus = { path: root, issue: params.issue?.trim(), purpose: params.purpose?.trim() };
			focus = next;
			pi.appendEntry(FOCUS_ENTRY, next);
			const named = nameSession(next);
			requestRender();

			const label = focusLabel(next);
			const lines = [`Target: ${root} (cwd unchanged: ${ctx.cwd})`];
			if (named) lines.push(`Session named: ${named}`);
			else if (label) lines.push(`Session name left as "${pi.getSessionName()}" (set by the user).`);
			return { content: [{ type: "text", text: lines.join("\n") }], details: next };
		},
	});

	pi.registerCommand("worktree", {
		description: "Record a target worktree, report cwd and target, or clear the target with 'auto'",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const items: AutocompleteItem[] = [];
			if ("auto".startsWith(prefix)) {
				items.push({ value: "auto", label: "auto", description: "Clear recorded target; cwd unchanged" });
			}
			if ("ignored".startsWith(prefix)) {
				items.push({ value: "ignored", label: "ignored", description: "Explain legacy read-detection behavior" });
			}
			const expanded = expandHome(prefix);
			const base = prefix.endsWith(sep) ? expanded : dirname(expanded);
			const leaf = prefix.endsWith(sep) ? "" : (expanded.split(sep).pop() ?? "");
			try {
				for (const entry of readdirSync(base, { withFileTypes: true })) {
					if (!entry.isDirectory() || !entry.name.startsWith(leaf)) continue;
					if (entry.name.startsWith(".") && !leaf.startsWith(".")) continue;
					const full = join(base, entry.name);
					items.push({
						value: homePath(full),
						label: entry.name,
						description: existsSync(join(full, ".git")) ? "worktree" : undefined,
					});
				}
			} catch {
				// unreadable prefix directory - fall through to whatever we have
			}
			return items.length > 0 ? items.slice(0, 50) : null;
		},
		handler: async (args, ctx) => {
			const arg = args.trim();
			if (!arg) {
				await refresh(ctx, true);
				const state = repos.get(ctx.cwd);
				const label = focus ? focusLabel(focus) : null;
				const checkout = state?.kind === "non-git" ? "none (non-Git)" : state?.root ?? "unknown";
				const branch = state?.kind === "non-git" ? "" : `\ngit: ${state?.branch ?? "unknown"}`;
				ctx.ui.notify(`Cwd: ${ctx.cwd}\nCheckout: ${checkout}${branch}\nTarget: ${focus?.path ?? "none"}${label ? ` (${label})` : ""}`, "info");
				return;
			}
			if (arg === "ignored") {
				ctx.ui.notify("File-read detection is disabled. The footer always shows Pi's cwd.", "info");
				return;
			}
			if (arg === "auto" || arg === "clear" || arg === "off") {
				focus = null;
				pi.appendEntry(FOCUS_ENTRY, { path: null });
				ctx.ui.notify("Target cleared; cwd unchanged.", "info");
				requestRender();
				return;
			}
			const path = resolve(ctx.cwd, expandHome(arg));
			if (!existsSync(path)) {
				ctx.ui.notify(`Not found: ${path}`, "error");
				return;
			}
			focus = { path: findWorktreeRoot(path) ?? path };
			pi.appendEntry(FOCUS_ENTRY, focus);
			ctx.ui.notify(`Target: ${focus.path} (cwd unchanged: ${ctx.cwd})`, "info");
			requestRender();
		},
	});
}
