import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { contractMultiplier, rollupMultiplier } from "./pricing.ts";

export const SPEND_ENTRY = "worktree-spend-v1";
const MAX_RECORDS = 2000;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const tempRoot = process.env.PI_SUBAGENTS_TEMP_ROOT
 ? resolve(process.env.PI_SUBAGENTS_TEMP_ROOT)
 : join(tmpdir(), `pi-subagents-uid-${process.getuid?.() ?? "unknown"}`);
type ObjectValue = Record<string, any>;
const object = (value: unknown): ObjectValue => value && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const list = (value: unknown): any[] => Array.isArray(value) ? value.slice(0, MAX_RECORDS) : [];
const text = (value: unknown): string | undefined => typeof value === "string" && value.length > 0 && value.length < 4096 ? value : undefined;
const id = (value: unknown): string | undefined => text(value) && /^[A-Za-z0-9._-]+$/.test(value as string) ? value as string : undefined;
const money = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
const terminal = (value: unknown) => ["complete", "completed", "failed", "cancelled", "canceled", "stopped", "rejected"].includes(String(value));

export type SpendOwner = { sessionFile?: string; sessionId?: string; cwd: string };
type RunCost = {
 key: string; runId?: string; index: number; agent?: string; sessionFile?: string; workflowKey?: string;
 cost?: number; terminal: boolean; source: string; metadataPath?: string; asyncDir?: string; sessionId?: string;
 covers: string[]; issue?: string; model?: string;
};
type RunGroup = { runId: string; mode: string; asyncDir?: string; cwd?: string; members: string[]; terminal: boolean; discovered: boolean; issue?: string; aggregate?: { cost: number; members: string[] } };
export type SpendSnapshot = { version: 1; owner: SpendOwner; records: RunCost[]; groups: RunGroup[]; limited: boolean };
export type SpendSummary = { cost: number; partial: boolean; unresolved: number; pending: number };

function usageCost(value: ObjectValue): number | undefined {
 const cost = money(object(value.usage).cost);
 if (cost !== undefined) return cost;
 const attempts = list(value.modelAttempts);
 if (Array.isArray(value.modelAttempts) && value.modelAttempts.length > MAX_RECORDS) return undefined;
 if (!attempts.length) return undefined;
 const costs = attempts.map(attempt => money(object(object(attempt).usage).cost));
 return costs.every(cost => cost !== undefined) ? costs.reduce<number>((sum, cost) => sum + cost!, 0) : undefined;
}

export async function readAccountingFile(path: string): Promise<ObjectValue | undefined> {
 let file;
 try {
  file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  const stat = await file.stat();
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return undefined;
  const buffer = Buffer.alloc(stat.size);
  let offset = 0;
  while (offset < buffer.length) {
   const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset);
   if (!bytesRead) return undefined;
   offset += bytesRead;
  }
  return object(JSON.parse(buffer.toString("utf8")));
 } catch { return undefined; }
 finally { await file?.close(); }
}

export class SpendLedger {
 readonly owner: SpendOwner;
 private records = new Map<string, RunCost>();
 private groups = new Map<string, RunGroup>();
 private limited = false;
 private stopped = false;
 constructor(owner: SpendOwner, saved?: unknown) {
  this.owner = owner;
  const snapshot = object(saved);
  if (snapshot.version !== 1 || !this.owns(object(snapshot.owner))) return;
  for (const raw of this.items(snapshot.records)) {
   const record = object(raw);
   if (!text(record.key) || !Array.isArray(record.covers)) continue;
   this.records.set(record.key, { key: record.key, runId: id(record.runId), index: Number.isInteger(record.index) ? record.index : 0,
    agent: text(record.agent), sessionFile: text(record.sessionFile), workflowKey: text(record.workflowKey), cost: money(record.cost), terminal: record.terminal === true,
    source: text(record.source) ?? "snapshot", metadataPath: text(record.metadataPath), asyncDir: text(record.asyncDir), sessionId: text(record.sessionId), covers: this.items(record.covers).filter(text), issue: text(record.issue), model: text(record.model) });
  }
  for (const raw of this.items(snapshot.groups)) {
   const group = object(raw);
   if (!id(group.runId)) continue;
   this.groups.set(group.runId, { runId: group.runId, mode: text(group.mode) ?? "single", asyncDir: text(group.asyncDir), cwd: text(group.cwd),
    members: this.items(group.members).filter(text), terminal: group.terminal === true, discovered: group.discovered === true, issue: text(group.issue),
    aggregate: money(object(group.aggregate).cost) !== undefined ? { cost: group.aggregate.cost, members: this.items(group.aggregate.members).filter(text) } : undefined });
  }
  this.limited ||= snapshot.limited === true;
 }
 private items(value: unknown): any[] {
  if (Array.isArray(value) && value.length > MAX_RECORDS) this.limited = true;
  return list(value);
 }
 private owns(value: ObjectValue): boolean {
  if (value.sessionFile && value.sessionFile !== this.owner.sessionFile) return false;
  if (value.sessionId && value.sessionId !== this.owner.sessionId && value.sessionId !== this.owner.sessionFile) return false;
  if (value.sessionRoot && value.sessionRoot !== this.owner.sessionFile?.replace(/\.jsonl$/, "")) return false;
  return !!(value.sessionFile || value.sessionId || value.sessionRoot);
 }
 stop() { this.stopped = true; }
 get active() { return [...this.groups.values()].some(group => !group.terminal) || [...this.records.values()].some(record => !record.terminal); }
 ingest(entries: readonly unknown[]) {
  for (const raw of entries) {
   const entry = object(raw);
   const message = entry.type === "message" ? object(entry.message) : entry;
   if (message.role === "toolResult" && ["subagent", "bg_wait"].includes(message.toolName)) this.observe(message.details);
   if (message.customType === "subagent-slash-result") this.observe(object(object(message.details).result).details);
   if (message.customType === "subagent-notify") this.observe(message.details);
  }
 }
 observeEvent(value: unknown) {
  const event = object(value);
  if (!this.owns({ sessionId: event.sessionId, sessionRoot: event.sessionRoot })) return;
  this.observe({ ...event, runId: event.runId ?? event.id });
 }
 observe(value: unknown) {
  if (this.stopped) return;
  const details = object(value);
  if ((details.sessionId || details.sessionRoot) && !this.owns({ sessionId: details.sessionId, sessionRoot: details.sessionRoot })) return;
  for (const completion of this.items(details.completions)) this.observe(completion);
  const runId = id(details.runId ?? details.asyncId);
  const results = this.items(details.results);
  const mode = text(details.mode) ?? "single";
  let group = runId ? this.groups.get(runId) : undefined;
  if (runId && (mode === "workflow" || details.asyncDir || details.asyncId || !results.length)) {
   if (!group && this.groups.size >= MAX_RECORDS) { this.limited = true; return; }
   group ??= { runId, mode, members: [], terminal: false, discovered: false };
   group.asyncDir = text(details.asyncDir) ?? group.asyncDir ?? join(tempRoot, "async-subagent-runs", runId);
   group.terminal ||= terminal(details.state) || typeof details.success === "boolean";
   this.groups.set(runId, group);
  }
  const workflowChildren = this.items(object(details.workflowChildren).children);
  for (const [position, raw] of results.entries()) {
   const result = object(raw);
   const childRunId = text(result.workflowKey) ? id(object(workflowChildren.find(child => child.childId === result.workflowKey)).runId) : undefined;
   const key = this.addResult({ ...result, runId: id(result.runId) ?? childRunId }, mode === "single" ? runId : undefined, position);
   if (key && group && !group.members.includes(key)) group.members.push(key);
  }
  if (group && results.length && !details.asyncId && !details.asyncDir) {
   group.discovered ||= mode !== "workflow";
   group.terminal ||= results.every(result => this.isTerminal(object(result)));
   const total = object(details.totalCost);
   if (mode === "workflow" && group.terminal && money(total.costUsd) !== undefined && money(total.inputTokens) !== undefined && money(total.outputTokens) !== undefined) {
    const nested = results.flatMap(result => this.items(object(result).children).flatMap(child => this.addNested(object(child), 0)));
    group.aggregate = { cost: total.costUsd, members: [...new Set([...group.members, ...nested])] };
   }
  }
  for (const child of workflowChildren) this.addChildRef(group, object(child));
  if (group?.mode === "single" && !results.length && details.agent) this.addChildRef(group, { runId, agent: details.agent, sessionFile: details.sessionFile, state: details.state });
 }
 private isTerminal(result: ObjectValue) {
  return !["running", "pending", "queued"].includes(object(result.progress).status ?? result.state)
   && !result.detached && (typeof result.exitCode === "number" && result.exitCode !== -1 || typeof result.success === "boolean" || terminal(result.state) || result.stopped === true || result.interrupted === true || result.timedOut === true);
 }
 private addResult(result: ObjectValue, fallbackRun?: string, position = 0): string | undefined {
  if (result.runner || result.externalProcess) return undefined;
  const sessionFile = text(result.sessionFile ?? result.sessionPath);
  const sessionRoot = this.owner.sessionFile?.replace(/\.jsonl$/, "") + "/";
  const nativeSession = sessionFile?.startsWith(sessionRoot) ? /^([A-Za-z0-9._-]+)\/run-(\d+)\/session\.jsonl$/.exec(sessionFile.slice(sessionRoot.length)) : null;
  const runId = id(result.runId) ?? fallbackRun ?? nativeSession?.[1];
  const index = Number.isInteger(result.index) && result.index >= 0 ? result.index : nativeSession ? Number(nativeSession[2]) : runId && !fallbackRun ? 0 : position;
  let key = runId ? `run:${runId}:${index}` : sessionFile ? `session:${sessionFile}` : undefined;
  if (!key) { this.limited = true; return undefined; }
  const alias = sessionFile ? this.records.get(`session:${sessionFile}`) : undefined;
  if (!runId && sessionFile) {
   const matches = [...this.records.values()].filter(record => record.sessionFile === sessionFile && record.runId);
   if (matches.length === 1) key = matches[0].key;
   else if (matches.length > 1) { this.limited = true; return undefined; }
  }
  let previous = this.records.get(key) ?? alias;
  if (runId && alias) {
   const canonical = this.records.get(key);
   if (canonical) {
    const evidence = [canonical, alias].filter(record => record.cost !== undefined).sort((a, b) => b.cost! - a.cost! || Number(b.terminal && !b.issue) - Number(a.terminal && !a.issue))[0];
    previous = { ...alias, ...canonical, cost: evidence?.cost, terminal: canonical.terminal || alias.terminal,
     sessionFile: canonical.sessionFile ?? alias.sessionFile, workflowKey: canonical.workflowKey ?? alias.workflowKey,
     model: canonical.model ?? alias.model,
     metadataPath: evidence?.metadataPath ?? canonical.metadataPath ?? alias.metadataPath,
     source: evidence?.source ?? canonical.source, covers: [...new Set([...canonical.covers, ...alias.covers])],
     issue: evidence ? evidence.terminal ? evidence.issue : canonical.terminal || alias.terminal ? "final usage unavailable" : evidence.issue : canonical.issue ?? alias.issue };
   }
   const rekey = (keys: string[]) => [...new Set(keys.map(member => member === alias.key ? key! : member))];
   this.records.delete(alias.key);
   for (const group of this.groups.values()) {
    group.members = rekey(group.members);
    if (group.aggregate) group.aggregate.members = rekey(group.aggregate.members);
   }
   for (const record of this.records.values()) record.covers = rekey(record.covers);
   if (previous) previous.covers = rekey(previous.covers);
  }
  if (!previous && this.records.size >= MAX_RECORDS) { this.limited = true; return undefined; }
  const isTerminal = this.isTerminal(result);
  const cost = usageCost(result);
  const metadataPath = text(object(result.artifactPaths).metadataPath);
  const attempts = list(result.modelAttempts).map(attempt => text(object(attempt).model)).filter(Boolean);
  const next: RunCost = { key, runId: runId ?? previous?.runId, index, agent: text(result.agent) ?? previous?.agent,
   model: text(result.model) ?? attempts.at(-1) ?? previous?.model,
   sessionFile: sessionFile ?? previous?.sessionFile, workflowKey: text(result.workflowKey) ?? previous?.workflowKey, cost: previous?.cost, terminal: previous?.terminal || isTerminal,
   source: previous?.source ?? "record", metadataPath: metadataPath ?? previous?.metadataPath, covers: previous?.covers ?? [], issue: previous?.issue };
  if (isTerminal && previous && !previous.terminal && previous.cost !== undefined && cost === undefined) next.issue = "final usage unavailable";
  if (cost !== undefined && (!previous?.terminal || isTerminal)) {
   next.cost = Math.max(previous?.cost ?? 0, cost);
   next.source = "record";
   next.issue = undefined;
  }
  this.records.set(key, next);
  for (const child of this.items(result.children)) this.addNested(object(child), 0);
  return key;
 }
 private addNested(child: ObjectValue, depth: number): string[] {
  if (depth > 20) { this.limited = true; return []; }
  const runId = id(child.id ?? child.runId);
  const children = [...this.items(child.children), ...this.items(child.steps).flatMap(step => this.items(object(step).children))];
  const descendants = children.flatMap(raw => this.addNested(object(raw), depth + 1));
  if (!runId) { if (!descendants.length) this.limited = true; return descendants; }
  const key = `tree:${runId}`;
  const cost = money(object(child.totalCost).costUsd);
  const previous = this.records.get(key);
  if (!previous && this.records.size >= MAX_RECORDS) { this.limited = true; return descendants; }
  const isTerminal = terminal(child.state);
  const finalizedCoverage = previous?.terminal && previous.cost !== undefined && !previous.issue;
  const liveCoverage = descendants.some(key => {
   const record = this.records.get(key);
   return record && (!record.terminal || record.issue === "nested coverage incomplete");
  });
  const staleCoverage = children.some(raw => {
   const value = object(raw);
   const reported = money(object(value.totalCost).costUsd);
   const known = this.records.get(`tree:${id(value.id ?? value.runId)}`)?.cost;
   return reported !== undefined && known !== undefined && reported < known;
  });
  const regressiveProjection = children.some(raw => !terminal(object(raw).state)) || staleCoverage;
  let issue = liveCoverage || (!finalizedCoverage && regressiveProjection) ? "nested coverage incomplete" : undefined;
  if (previous?.issue === "nested coverage incomplete" && !children.length && previous.covers.some(key => key.startsWith("tree:"))) issue = previous.issue;
  if (isTerminal && cost === undefined) issue ??= "nested aggregate unavailable";
  this.records.set(key, { key, runId, index: 0, agent: text(child.agent) ?? previous?.agent, cost: cost === undefined ? previous?.cost : Math.max(previous?.cost ?? 0, cost),
   terminal: previous?.terminal || isTerminal, source: "nested aggregate", covers: [...new Set([...(previous?.covers ?? []), `run:${runId}:0`, ...descendants])],
   asyncDir: text(child.asyncDir) ?? previous?.asyncDir, sessionId: text(child.sessionId) ?? previous?.sessionId, issue,
  });
  return [key, `run:${runId}:0`, ...descendants];
 }
 private addChildRef(group: RunGroup | undefined, child: ObjectValue, index = 0) {
  const workflowKey = text(child.childId ?? child.workflowKey);
  const alias = workflowKey ? group?.members.map(key => this.records.get(key)).find(record => record?.workflowKey === workflowKey && !record.runId) : undefined;
  const key = this.addResult({ ...child, workflowKey, sessionFile: child.sessionFile ?? alias?.sessionFile, index: child.index ?? index, state: child.state ?? child.status });
  if (key && group && !group.members.includes(key)) group.members.push(key);
  return key;
 }
 /**
  * Records keep the list-priced dollars Pi recorded, so a snapshot written by an
  * older build still reads correctly; the contract conversion happens here, at
  * the point the total is reported. Rollups that name no model borrow the factor
  * of the members they cover.
  */
 private factor(record: RunCost): number {
  if (record.model) return contractMultiplier(record.model);
  return rollupMultiplier(record.covers.map(key => this.records.get(key)).filter(Boolean) as RunCost[]);
 }
 private inclusive(group: RunGroup): boolean {
  if (!group.terminal || !group.aggregate || group.issue === "ownership mismatch") return false;
  const members = group.aggregate.members.map(key => this.records.get(key));
  const covered = new Set(members.filter(record => record?.cost !== undefined).flatMap(record => record!.covers));
  const known = members.filter(record => record && !covered.has(record.key)).reduce((sum, record) => sum + (record?.cost ?? 0), 0);
  return group.aggregate.cost + 1e-9 >= known && (group.aggregate.cost > 0 || members.length > 0 && members.every(record => record?.terminal && record.cost === 0));
 }
 async refresh(read = readAccountingFile): Promise<void> {
  let reads = 0;
  const bounded = async (path: string) => {
   if (this.stopped || ++reads > 256) { if (!this.stopped) this.limited = true; return undefined; }
   return read(path);
  };
  for (const group of this.groups.values()) {
   if (this.stopped) return;
   if ((group.terminal && group.discovered && !group.issue) || this.inclusive(group)) continue;
   const asyncDir = group.asyncDir;
   if (!asyncDir || !isAbsolute(asyncDir) || basename(asyncDir) !== group.runId) continue;
   const status = await bounded(join(asyncDir, "status.json"));
   if (this.stopped) return;
   if (status && (status.runId !== group.runId || !this.owns({ sessionId: status.sessionId, sessionRoot: status.sessionRoot }))) {
    group.issue = "ownership mismatch";
    continue;
   }
   const receipt = await bounded(join(asyncDir, "workflow-receipt.json"));
   if (this.stopped) return;
   group.issue = !status && !receipt ? "artifacts unavailable" : undefined;
   if (status) {
    if (status.mode === "workflow" || status.mode === "single") group.mode = status.mode;
    if (text(status.cwd) && isAbsolute(status.cwd)) group.cwd = status.cwd;
    group.terminal ||= terminal(status.state);
    const steps = this.items(status.steps);
    const statusMembers: string[] = [];
    for (const [index, step] of steps.entries()) {
     const value = object(step);
     const key = this.addChildRef(group, { ...value, runId: value.runId ?? (group.mode === "single" ? group.runId : undefined) }, value.runId ? 0 : index);
     if (key) statusMembers.push(key);
     for (const child of this.items(value.children)) statusMembers.push(...this.addNested(object(child), 0));
    }
    for (const child of this.items(status.children)) statusMembers.push(...this.addNested(object(child), 0));
    const total = object(status.totalCost);
    if (group.mode === "workflow" && group.terminal && money(total.costUsd) !== undefined && money(total.inputTokens) !== undefined && money(total.outputTokens) !== undefined
     && steps.length > 0 && steps.every(step => step.async === false && terminal(step.status))) {
     group.aggregate = { cost: total.costUsd, members: [...new Set(statusMembers)] };
    }
    for (const child of this.items(object(status.workflowChildren).children)) this.addChildRef(group, object(child));
    if (steps.length && group.mode === "single") group.discovered = true;
   }
   if (receipt && receipt.version === 1 && receipt.workflowRunId === group.runId) {
    for (const [childId, raw] of this.items(Object.entries(object(receipt.entries)))) {
     const entry = object(raw);
     if (entry.externalAdapter) continue;
     const runs = this.items(object(entry.continuation).runIds);
     const latest = id(entry.latestRunId) ?? id(runs.at(-1));
     for (const runId of [...new Set([...runs, latest])]) if (id(runId)) this.addChildRef(group, { runId, agent: entry.agent, childId: runId === latest ? childId : undefined, state: "complete" });
    }
    for (const child of this.items(object(receipt.workflowChildren).children)) this.addChildRef(group, object(child));
    group.discovered = true;
   }
   if (group.mode === "workflow" && (!receipt || receipt.version !== 1 || receipt.workflowRunId !== group.runId)) group.issue = "attempt history unavailable";
  }
  const nestedTargets = [...this.records.values()].filter(record => record.key.startsWith("tree:") && (!record.terminal || record.issue));
  for (const record of nestedTargets) {
   if (this.stopped) return;
   if (!record.asyncDir || !isAbsolute(record.asyncDir) || basename(record.asyncDir) !== record.runId) continue;
   const status = await bounded(join(record.asyncDir, "status.json"));
   if (this.stopped) return;
   if (!status) continue;
   if (status.runId !== record.runId || (record.sessionId && status.sessionId !== record.sessionId)) {
    record.issue = "nested ownership mismatch";
    continue;
   }
   this.addNested({ ...status, id: record.runId, asyncDir: record.asyncDir, sessionId: record.sessionId }, 0);
  }
  for (const record of this.records.values()) {
   if (this.stopped) return;
   if (record.key.startsWith("tree:") || !record.runId || !record.agent) continue;
   if (record.cost !== undefined && record.terminal && !record.issue) continue;
   const safeAgent = record.agent.replace(/[^\w.-]/g, "_");
   const projectDirs = [...new Set([this.owner.cwd, ...[...this.groups.values()].filter(group => group.members.includes(record.key)).map(group => group.cwd)].filter(Boolean) as string[])];
   const dirs = [this.owner.sessionFile && join(dirname(this.owner.sessionFile), "subagent-artifacts"), ...projectDirs.map(cwd => join(cwd, ".pi/subagents/artifacts")), join(tempRoot, "artifacts")].filter(Boolean) as string[];
   const paths = [...new Set([record.metadataPath, ...dirs.flatMap(dir => [join(dir, `${record.runId}_${safeAgent}_${record.index}_meta.json`), ...(record.index === 0 ? [join(dir, `${record.runId}_${safeAgent}_meta.json`)] : [])])].filter(Boolean))] as string[];
   let found = false;
   for (const path of paths) {
    if (!isAbsolute(path) || !path.endsWith("_meta.json")) continue;
    const metadata = await bounded(path);
    if (this.stopped) return;
    if (!metadata || metadata.runId !== record.runId || metadata.agent !== record.agent) continue;
    const cost = usageCost(metadata);
    if (cost === undefined) continue;
    record.cost = Math.max(record.cost ?? 0, cost);
    record.model = text(metadata.model) ?? list(metadata.modelAttempts).map(attempt => text(object(attempt).model)).filter(Boolean).at(-1) ?? record.model;
    record.terminal ||= typeof metadata.exitCode === "number";
    record.source = "metadata";
    record.metadataPath = path;
    record.issue = undefined;
    found = true;
    break;
   }
   if (!found) record.issue = "usage artifact unavailable";
  }
 }
 summary(): SpendSummary {
  const covered = new Set([...this.records.values()].filter(record => record.cost !== undefined).flatMap(record => record.covers));
  const coveredRuns = new Set([...covered].filter(key => key.startsWith("run:")).map(key => key.split(":")[1]));
  const groups = [...this.groups.values()];
  const candidates = groups.filter(group => this.inclusive(group));
  const inclusive = candidates.filter(group => !candidates.some(other => other !== group && other.aggregate!.members.some(key => group.aggregate!.members.includes(key))));
  for (const group of inclusive) for (const key of group.aggregate!.members) covered.add(key);
  const records = [...this.records.values()].filter(record => !covered.has(record.key) && !(record.key.startsWith("run:") && coveredRuns.has(record.runId!)));
  const unresolved = records.filter(record => record.cost === undefined || record.issue).length
   + [...this.records.values()].filter(record => covered.has(record.key) && record.key.startsWith("tree:") && record.issue && record.issue !== "nested aggregate unavailable").length
   + groups.filter(group => !inclusive.includes(group) && (group.issue || !group.discovered)).length + Number(this.limited);
  const terminalByIdentity = new Map<string, boolean>();
  for (const record of this.records.values()) {
   const identity = record.runId ? `run:${record.runId}:${record.index}` : record.key;
   terminalByIdentity.set(identity, (terminalByIdentity.get(identity) ?? false) || record.terminal);
  }
  const pending = [...terminalByIdentity.values()].filter(done => !done).length + groups.filter(group => !group.terminal && !group.members.some(key => !this.records.get(key)?.terminal)).length;
  const groupCost = (group: RunGroup) => group.aggregate!.cost
   * rollupMultiplier(group.aggregate!.members.map(key => this.records.get(key)).filter(Boolean) as RunCost[]);
  return { cost: records.reduce((total, record) => total + (record.cost ?? 0) * this.factor(record), 0) + inclusive.reduce((total, group) => total + groupCost(group), 0), partial: !!(unresolved || pending), unresolved, pending };
 }
 snapshot(): SpendSnapshot {
  return structuredClone({ version: 1, owner: this.owner, records: [...this.records.values()], groups: [...this.groups.values()], limited: this.limited });
 }
 diagnostic() {
  return { ...this.summary(), ...this.snapshot(), coverage: [...this.groups.values()].map(group => ({ runId: group.runId, inclusiveTotal: this.inclusive(group) })) };
 }
}

export function savedSpend(entries: readonly unknown[], owner: SpendOwner): unknown {
 const entry = entries.findLast(raw => {
  const entry = object(raw);
  const savedOwner = object(object(entry.data).owner);
  return entry.type === "custom" && entry.customType === SPEND_ENTRY && object(entry.data).version === 1
   && savedOwner.sessionFile === owner.sessionFile && savedOwner.sessionId === owner.sessionId;
 });
 return object(entry).data;
}
