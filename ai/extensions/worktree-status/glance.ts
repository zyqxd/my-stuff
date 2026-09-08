import type { Theme } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { SpendSummary } from "./accounting.ts";

type ParentUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number; cacheHitRate?: number };
export type Glance = { parent: ParentUsage; agents: SpendSummary; percent: number | null; window: number; model: string; tokens: (count: number) => string };

export function spendingLine(theme: Theme, data: Glance, width: number): string {
 const { parent, agents, percent, tokens } = data;
 const separator = theme.fg("dim", " · ");
 const amount = parent.cost + agents.cost;
 const marker = agents.partial ? theme.fg("warning", " partial") : "";
 const moneyBudget = Math.max(1, width - 7 - (agents.partial ? 8 : 0));
 const amounts = [amount.toFixed(2), amount.toFixed(1), amount.toFixed(0), amount.toExponential(1), amount.toExponential(0)];
 const shown = amounts.find(value => value.length <= moneyBudget) ?? amounts.at(-1)!;
 const total = theme.bold(theme.fg("text", `Total $${shown}`)) + marker;
 const breakdown = theme.fg("muted", `main $${parent.cost.toFixed(2)}`) + separator + theme.fg("muted", `agents $${agents.cost.toFixed(2)}`);
 const contextColor = percent !== null && percent > 90 ? "error" : percent !== null && percent > 70 ? "warning" : "muted";
 const context = (compact = false) => theme.fg(contextColor, `ctx ${percent === null ? "?" : `${percent.toFixed(compact ? 0 : 1)}%`}${compact ? "" : `/${tokens(data.window)}`}`);
 const model = theme.fg("accent", data.model);
 const counters = [parent.input && `↑${tokens(parent.input)}`, parent.output && `↓${tokens(parent.output)}`, parent.cacheRead && `R${tokens(parent.cacheRead)}`, parent.cacheWrite && `W${tokens(parent.cacheWrite)}`, parent.cacheHitRate !== undefined && `CH${parent.cacheHitRate.toFixed(1)}%`].filter(Boolean).join(" ");
 const variants = [
  [total, breakdown, context(), model, theme.fg("muted", counters)],
  [total, breakdown, context(), model],
  [total, context(), model],
  [total, context(true), model],
  [total, context(true)],
  [total],
 ];
 for (const parts of variants) {
  const line = parts.filter(Boolean).join(separator);
  if (visibleWidth(line) <= width) return line;
 }
 return truncateToWidth(total, width, "");
}
