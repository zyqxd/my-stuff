import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SPEND_ENTRY, SpendLedger, savedSpend } from "./accounting.ts";
import { collectUsage } from "./index.ts";

export async function reconcileSession(sessionFile: string, cwd?: string) {
 const path = resolve(sessionFile);
 if ((await stat(path)).size > 64 * 1024 * 1024) throw new Error("Parent session exceeds 64 MiB diagnostic limit");
 const input = createReadStream(path);
 const lines = createInterface({ input, crlfDelay: Infinity });
 const entries: unknown[] = [];
 let sessionId: string | undefined;
 let sessionCwd = cwd;
 let incompleteLines = 0;
 try {
  for await (const line of lines) {
   if (line.length > 2 * 1024 * 1024) { incompleteLines++; continue; }
   let entry;
   try { entry = JSON.parse(line); } catch { incompleteLines++; continue; }
   if (entry.type === "session") { sessionId = entry.id; sessionCwd ??= entry.cwd; }
   if (["compaction", "branch_summary"].includes(entry.type)) entries.push({ type: entry.type, usage: entry.usage });
   if (entry.type === "custom" && entry.customType === SPEND_ENTRY) entries.push(entry);
   const message = entry.type === "message" ? entry.message : entry;
   if (message?.role === "assistant" || message?.role === "toolResult") entries.push({ type: "message", message: {
    role: message.role, toolName: message.toolName, usage: message.usage,
    details: ["subagent", "bg_wait"].includes(message.toolName) ? message.details : undefined,
   } });
   if (["subagent-notify", "subagent-slash-result"].includes(message?.customType)) entries.push({ type: "custom_message", customType: message.customType, details: message.details });
  }
 } finally { lines.close(); input.destroy(); }
 const owner = { sessionFile: path, sessionId, cwd: sessionCwd ?? process.cwd() };
 const ledger = new SpendLedger(owner, savedSpend(entries, owner));
 ledger.ingest(entries);
 await ledger.refresh();
 const parent = collectUsage(entries);
 return { parent, agents: ledger.diagnostic(), total: parent.cost + ledger.summary().cost, partial: ledger.summary().partial || incompleteLines > 0, incompleteLines };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const sessionFile = process.argv[2] ?? process.env.PI_SESSION_FILE;
 if (!sessionFile) throw new Error("Usage: diagnostic.ts <parent-session.jsonl> [cwd]");
 console.log(JSON.stringify(await reconcileSession(sessionFile, process.argv[3]), null, 2));
}
