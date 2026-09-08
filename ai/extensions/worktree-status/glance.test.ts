import assert from "node:assert/strict";
import { getThemeByName } from "@earendil-works/pi-coding-agent/theme";
import { visibleWidth } from "@earendil-works/pi-tui";
import { stripVTControlCharacters } from "node:util";
import { spendingLine, type Glance } from "./glance.ts";
import { formatTokens } from "./index.ts";

export function glanceTests(check: (name: string, fn: () => void) => void) {
 const data: Glance = { parent: { input: 2, output: 210, cacheRead: 9400, cacheWrite: 68000, cacheHitRate: 12.1, cost: 130.32 }, agents: { cost: 29.88, partial: false, pending: 0, unresolved: 0 }, percent: 8, window: 1000000, model: "astra 日本 · high", tokens: formatTokens };
 for (const themeName of ["dark", "light"]) {
  const theme = getThemeByName(themeName)!;
  for (const partial of [false, true]) for (const width of [100, 80, 60, 40, 20]) check(`glance: ${themeName} ${width} cells ${partial ? "partial" : "complete"} prioritizes total`, () => {
   const line = spendingLine(theme, { ...data, agents: { ...data.agents, partial } }, width);
   const plain = stripVTControlCharacters(line);
   assert.ok(visibleWidth(line) <= width, plain);
   assert.match(plain, /^Total \$160\.2/);
   if (partial) assert.match(plain, /partial/);
   if (width <= 80) assert.doesNotMatch(plain, /R9\.4k|W68k|CH12/);
   if (width >= 60) assert.match(plain, /astra 日本 · high/);
   assert.match(line, /\x1b\[1m/);
  });
  check(`glance: ${themeName} ctx pressure alone uses warning and error semantics`, () => {
   for (const [percent, color] of [[70, "muted"], [71, "warning"], [90, "warning"], [91, "error"]] as const) {
    assert.ok(spendingLine(theme, { ...data, percent }, 180).includes(theme.fg(color, `ctx ${percent.toFixed(1)}%/1.0M`)));
   }
   assert.match(stripVTControlCharacters(spendingLine(theme, { ...data, percent: null }, 120)), /ctx \?\/1.0M/);
  });
  check(`glance: ${themeName} wide counters remain secondary, no padding gap`, () => {
   const line = stripVTControlCharacters(spendingLine(theme, data, 180));
   assert.match(line, /^Total \$160\.20 · main \$130\.32 · agents \$29\.88 · ctx 8\.0%\/1\.0M · astra 日本 · high · ↑2 ↓210 R9\.4k W68k CH12\.1%$/);
   assert.doesNotMatch(line, /  /);
  });
 }
}
