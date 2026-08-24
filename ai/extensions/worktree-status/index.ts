/**
 * Two-line footer keyed to the worktree the agent is actually touching.
 *
 *   ~/world/trees/i7343-payment-section/src  payment-section-7343  ~1 ?1   MCP 0/1
 *   ↑2 ↓210 R9.4k W68k CH12.2% $0.435 8.0%/1.0M              claude-opus-5 • high
 *
 * Replaces the built-in footer, whose first line is the *session* cwd and never
 * moves — bash tool calls run in a fresh process rooted at that cwd, so `cd`
 * does not stick. Line 1 tracks the last git root seen in a tool-call path
 * instead; line 2 mirrors the built-in usage line. Other extensions' statuses
 * are right-aligned on line 1 so they no longer need a row of their own.
 *
 * The agent declares its target with the set_worktree tool, which also names the
 * session `#<issue> <purpose>`; detection is only the fallback until it does.
 *
 * /worktree <path>   pin a worktree (overrides detection)
 * /worktree auto     go back to detection
 * /worktree          report current target
 * /worktree ignored  list the paths detection skips
 */

import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	ReadonlyFooterDataProvider,
	Theme,
} from "@earendil-works/pi-coding-agent";
import { type AutocompleteItem, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";

/**
 * Paths that are notes about the work rather than the work. Editing a lesson or
 * a plan should not repoint the footer at the notes repo. Entries are compared
 * after resolving symlinks, so `~/plans` (-> ~/.brain/...) and
 * `~/.pi/agent/memory` (-> ai/memory) are covered by their targets.
 *
 * Detection only. Launching pi inside one of these still shows it, and an
 * explicit `/worktree <path>` pin always wins. Add a line to extend.
 */
const IGNORED_PATHS = [
	"~/.brain", // brain memory banks, and ~/plans which links into them
	"~/Workspace/my-stuff", // agent config, lessons, memory - single-tree, never the subject of the work
];

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
 * pin carries the path alone.
 */
export type Focus = {
	path: string;
	issue?: string;
	purpose?: string;
};

type RepoState = {
	branch: string | null;
	staged: number;
	unstaged: number;
	untracked: number;
	checkedAt: number;
	refreshing: boolean;
};

export function expandHome(input: string): string {
	const home = homedir();
	if (input === "~") return home;
	if (input.startsWith(`~${sep}`) || input.startsWith("~/")) return join(home, input.slice(2));
	return input;
}

export function displayPath(path: string): string {
	const home = homedir();
	const shown = path === home ? "~" : path.startsWith(home + sep) ? `~${sep}${path.slice(home.length + 1)}` : path;
	if (shown.length <= PATH_DISPLAY_BUDGET) return shown;

	// Elide from the left: the trailing segments carry the worktree's identity.
	const parts = shown.split(sep).filter(Boolean);
	let kept = parts.slice(-2);
	for (let i = parts.length - 3; i >= 0; i--) {
		const candidate = [parts[i], ...kept];
		if (`…${sep}${candidate.join(sep)}`.length > PATH_DISPLAY_BUDGET) break;
		kept = candidate;
	}
	return `…${sep}${kept.join(sep)}`;
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

/** Session usage totals, matching what the built-in footer counts. */
export function collectUsage(entries: readonly unknown[]): Usage {
	const total: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, cacheHitRate: undefined };
	for (const raw of entries) {
		const entry = raw as { type?: string; message?: { role?: string; usage?: unknown }; usage?: unknown };
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
		total.cost += usage.cost?.total ?? 0;
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

/** `path` with its existing portion resolved through symlinks. */
function resolveLinks(path: string): string {
	const existing = nearestExistingDir(path);
	if (!existing) return path;
	try {
		return realpathSync(existing) + path.slice(existing.length);
	} catch {
		return path;
	}
}

let ignoredPrefixes: string[] | null = null;

/** True when `path` sits inside one of IGNORED_PATHS, symlinks resolved. */
export function isIgnored(path: string): boolean {
	ignoredPrefixes ??= IGNORED_PATHS.map((entry) => resolveLinks(expandHome(entry)));
	const real = resolveLinks(path);
	return ignoredPrefixes.some((prefix) => real === prefix || real.startsWith(prefix + sep));
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

function unquote(token: string): string {
	if (token.length > 1 && (token.startsWith('"') || token.startsWith("'")) && token.endsWith(token[0])) {
		return token.slice(1, -1);
	}
	return token;
}

/** Path-ish arguments in a bash command, most explicit first. */
export function bashPathCandidates(command: string): string[] {
	const candidates: string[] = [];
	for (const match of command.matchAll(/(?:^|[;&|]\s*|\s&&\s*)cd\s+(?:-{1,2}\S+\s+)*("[^"]+"|'[^']+'|[^\s;&|)]+)/g)) {
		candidates.push(unquote(match[1]));
	}
	for (const match of command.matchAll(/git\s+(?:--\S+\s+)*-C\s+("[^"]+"|'[^']+'|[^\s;&|)]+)/g)) {
		candidates.push(unquote(match[1]));
	}
	for (const match of command.matchAll(/(?:^|[\s"'=(])((?:~|\/|\.\/)[^\s"';|&()]+)/g)) {
		candidates.push(match[1]);
	}
	return candidates;
}

export function toolPathCandidates(toolName: string, input: unknown): string[] {
	if (!input || typeof input !== "object") return [];
	const record = input as Record<string, unknown>;
	if (toolName === "bash") {
		return typeof record.command === "string" ? bashPathCandidates(record.command) : [];
	}
	// read / write / edit / ls / grep / find all use `path`.
	return typeof record.path === "string" ? [record.path] : [];
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
	let detectedRoot: string | null = null;
	let sessionRoot: string | null = null;
	// The last name we set, so a human /name is never clobbered.
	let nameWeSet: string | null = null;
	const repos = new Map<string, RepoState>();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let requestRender: () => void = () => {};

	const targetRoot = () => focus?.path ?? detectedRoot ?? sessionRoot;

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

	/** Raw stdout - porcelain status is column-sensitive, so callers trim only when safe. */
	async function git(root: string, args: string[]): Promise<string | null> {
		const result = await pi.exec("git", ["--no-optional-locks", "-C", root, ...args], {
			timeout: GIT_TIMEOUT_MS,
		});
		return result.code === 0 ? result.stdout : null;
	}

	/** Line 1 left: worktree, branch, dirty counts. */
	function worktreeSegment(theme: Theme, sessionName: string | undefined): string {
		const root = targetRoot();
		if (!root) return theme.fg("dim", "no worktree");

		const state = repos.get(root);
		const parts = [theme.fg("dim", `${focus ? "📌 " : ""}${displayPath(root)}`)];
		if (!state) {
			parts.push(theme.fg("dim", "…"));
		} else {
			parts.push(theme.fg("accent", state.branch ?? "no-git"));
			const dirty: string[] = [];
			if (state.staged) dirty.push(`+${state.staged}`);
			if (state.unstaged) dirty.push(`~${state.unstaged}`);
			if (state.untracked) dirty.push(`?${state.untracked}`);
			if (state.branch !== null) {
				parts.push(dirty.length ? theme.fg("warning", dirty.join(" ")) : theme.fg("success", "clean"));
			}
			if (state.refreshing) parts.push(theme.fg("dim", "…"));
		}
		if (sessionName) parts.push(theme.fg("dim", `• ${sessionName}`));
		return parts.join(" ");
	}

	/** Line 2 left: token, cache, cost and context totals. */
	function usageSegment(theme: Theme, ctx: ExtensionContext): string {
		const usage = collectUsage(ctx.sessionManager.getEntries());
		const parts: string[] = [];
		if (usage.input) parts.push(`↑${formatTokens(usage.input)}`);
		if (usage.output) parts.push(`↓${formatTokens(usage.output)}`);
		if (usage.cacheRead) parts.push(`R${formatTokens(usage.cacheRead)}`);
		if (usage.cacheWrite) parts.push(`W${formatTokens(usage.cacheWrite)}`);
		if ((usage.cacheRead || usage.cacheWrite) && usage.cacheHitRate !== undefined) {
			parts.push(`CH${usage.cacheHitRate.toFixed(1)}%`);
		}
		if (usage.cost) parts.push(`$${usage.cost.toFixed(3)}`);

		const context = ctx.getContextUsage();
		const window = context?.contextWindow ?? ctx.model?.contextWindow ?? 0;
		const percent = context?.percent ?? null;
		const contextText = `${percent === null ? "?" : `${percent.toFixed(1)}%`}/${formatTokens(window)}`;
		const left = theme.fg("dim", parts.join(" "));
		const colored =
			percent !== null && percent > 90
				? theme.fg("error", contextText)
				: percent !== null && percent > 70
					? theme.fg("warning", contextText)
					: theme.fg("dim", contextText);
		return parts.length ? `${left} ${colored}` : colored;
	}

	/** Line 2 right: provider, model, thinking level. */
	function modelSegment(theme: Theme, ctx: ExtensionContext, providerCount: number): string {
		const model = ctx.model;
		if (!model) return theme.fg("dim", "no-model");
		const thinking = model.reasoning ? ` • ${ctx.thinkingLevel ?? "off"}` : "";
		const provider = providerCount > 1 ? `(${model.provider}) ` : "";
		return theme.fg("dim", `${provider}${model.id}${thinking}`);
	}

	/** Line 1 right: statuses published by other extensions (setStatus). */
	function otherStatuses(statuses: ReadonlyMap<string, string>): string {
		return Array.from(statuses.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([, text]) => text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim())
			.filter(Boolean)
			.join("  ");
	}

	async function refresh(ctx: ExtensionContext, root: string, force = false): Promise<void> {
		const existing = repos.get(root);
		if (existing?.refreshing) return;
		if (!force && existing && Date.now() - existing.checkedAt < MIN_REFRESH_INTERVAL_MS) return;

		const state: RepoState = existing ?? {
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
			const named = (await git(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]))?.trim();
			const sha = named ? undefined : (await git(root, ["rev-parse", "--short", "HEAD"]))?.trim();
			const branch = named || (sha ? `detached@${sha}` : null);
			state.branch = branch;

			const counts =
				branch === null
					? { staged: 0, unstaged: 0, untracked: 0 }
					: countPorcelain((await git(root, ["status", "--porcelain=v1", "--untracked-files=normal"])) ?? "");
			state.staged = counts.staged;
			state.unstaged = counts.unstaged;
			state.untracked = counts.untracked;
		} catch {
			state.branch = null;
		} finally {
			state.checkedAt = Date.now();
			state.refreshing = false;
			repos.set(root, state);
			requestRender();
		}
	}

	function installFooter(ctx: ExtensionContext): void {
		if (ctx.mode !== "tui") return;
		ctx.ui.setFooter((tui, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
			requestRender = () => tui.requestRender();
			// A branch change under us (rebase, checkout in another terminal) also
			// invalidates the dirty counts.
			const unsubscribe = footerData.onBranchChange(() => {
				const root = targetRoot();
				if (root) void refresh(ctx, root, true);
				tui.requestRender();
			});

			return {
				dispose: unsubscribe,
				invalidate() {},
				render(width: number): string[] {
					try {
						const top = padBetween(
							worktreeSegment(theme, ctx.sessionManager.getSessionName()),
							theme.fg("dim", otherStatuses(footerData.getExtensionStatuses())),
							width,
						);
						const bottom = padBetween(
							usageSegment(theme, ctx),
							modelSegment(theme, ctx, footerData.getAvailableProviderCount()),
							width,
						);
						return [top, bottom];
					} catch (error) {
						return [theme.fg("error", `worktree-status: ${(error as Error).message}`)];
					}
				},
			};
		});
	}

	function scheduleRefresh(ctx: ExtensionContext, force = false): void {
		const root = targetRoot();
		if (!root) return;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			void refresh(ctx, root, force);
		}, REFRESH_DEBOUNCE_MS);
		debounceTimer.unref?.();
	}

	pi.on("session_start", async (_event, ctx) => {
		sessionRoot = findWorktreeRoot(ctx.cwd) ?? ctx.cwd;
		detectedRoot = null;
		// A declared focus outlives /reload and /resume; re-declaring it on every
		// restart is not the agent's job.
		const entries = ctx.sessionManager.getEntries();
		const restored = lastFocus(entries);
		if (restored && existsSync(restored.path)) focus = restored;
		// Any name this session could have written is ours to update later; anything
		// else is a /name the user typed, and stays.
		const current = pi.getSessionName();
		if (current && focusLabels(entries).has(current)) nameWeSet = current;
		installFooter(ctx);
		const root = targetRoot();
		if (root) void refresh(ctx, root, true);
	});

	pi.on("tool_call", async (event, ctx) => {
		// Sticky by design: a tool call outside any repo (/tmp, scratch dirs) leaves
		// the last known worktree on screen rather than blanking the line.
		for (const candidate of toolPathCandidates(event.toolName, event.input)) {
			const absolute = isAbsolute(candidate) || candidate.startsWith("~")
				? expandHome(candidate)
				: resolve(ctx.cwd, candidate);
			if (isIgnored(absolute)) continue;
			const root = findWorktreeRoot(absolute);
			if (!root) continue;
			if (root !== detectedRoot) {
				detectedRoot = root;
				if (!focus) {
					requestRender();
					void refresh(ctx, root, true);
				}
			}
			break;
		}
	});

	pi.on("tool_result", async (_event, ctx) => scheduleRefresh(ctx));
	pi.on("turn_end", async (_event, ctx) => scheduleRefresh(ctx, true));

	pi.on("session_shutdown", async () => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = null;
	});

	pi.registerTool({
		name: "set_worktree",
		label: "Set Worktree",
		description:
			"Declare the git worktree this session is working in, and what it is working on. " +
			"Pins the footer to that worktree and names the session '#<issue> <purpose>', so the " +
			"target survives reading and editing files elsewhere. The worktree must already exist - " +
			"create it with `git worktree add` first. Call it again to move to a different worktree.",
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
			const path = resolve(expandHome(params.path.trim()));
			if (!existsSync(path)) throw new Error(`No such path: ${path}. Create the worktree first.`);
			const root = findWorktreeRoot(path);
			if (!root) throw new Error(`Not inside a git worktree: ${path}. Run \`git worktree add\` first.`);

			const next: Focus = { path: root, issue: params.issue?.trim(), purpose: params.purpose?.trim() };
			focus = next;
			pi.appendEntry(FOCUS_ENTRY, next);
			const named = nameSession(next);
			requestRender();
			void refresh(ctx, root, true);

			const label = focusLabel(next);
			const lines = [`Worktree: ${root}`];
			if (named) lines.push(`Session named: ${named}`);
			else if (label) lines.push(`Session name left as "${pi.getSessionName()}" (set by the user).`);
			return { content: [{ type: "text", text: lines.join("\n") }], details: next };
		},
	});

	pi.registerCommand("worktree", {
		description: "Pin the worktree shown in the footer (or 'auto' to detect from tool calls)",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const items: AutocompleteItem[] = [];
			if ("auto".startsWith(prefix)) {
				items.push({ value: "auto", label: "auto", description: "Detect from tool calls" });
			}
			if ("ignored".startsWith(prefix)) {
				items.push({ value: "ignored", label: "ignored", description: "List skipped paths" });
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
						value: displayPath(full).startsWith("…") ? full : displayPath(full),
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
				const root = targetRoot();
				const source = focus ? "declared" : detectedRoot ? "detected" : "session cwd";
				const label = focus ? focusLabel(focus) : null;
				const detail = `${source}${label ? `: ${label}` : ""}`;
				ctx.ui.notify(root ? `${root} (${detail})` : "No worktree", "info");
				return;
			}
			if (arg === "ignored") {
				ctx.ui.notify(`Detection skips: ${IGNORED_PATHS.join(", ")}`, "info");
				return;
			}
			if (arg === "auto" || arg === "clear" || arg === "off") {
				focus = null;
				pi.appendEntry(FOCUS_ENTRY, { path: null });
				ctx.ui.notify("Worktree: auto-detect", "info");
				requestRender();
				const root = targetRoot();
				if (root) void refresh(ctx, root, true);
				return;
			}
			const path = resolve(expandHome(arg));
			if (!existsSync(path)) {
				ctx.ui.notify(`Not found: ${path}`, "error");
				return;
			}
			focus = { path: findWorktreeRoot(path) ?? path };
			pi.appendEntry(FOCUS_ENTRY, focus);
			ctx.ui.notify(`Worktree pinned: ${focus.path}`, "info");
			requestRender();
			void refresh(ctx, focus.path, true);
		},
	});
}
