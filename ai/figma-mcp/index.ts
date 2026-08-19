import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMcpAdapter} from 'pi-mcp-adapter';
import type {McpConfig} from 'pi-mcp-adapter/types';

// Passing `config` (not `configPath`) keeps this package hermetic: the adapter
// skips all ambient MCP config discovery (~/.config/mcp/mcp.json, .mcp.json,
// ~/.pi/agent/mcp.json, host configs) and sees only the files below.
const here = dirname(fileURLToPath(import.meta.url));
const read = (name: string) =>
  JSON.parse(readFileSync(join(here, name), 'utf8')) as McpConfig;

const shipped = read('mcp.json');
// mcp.local.json is gitignored: your machine's choices (which server, credentials
// policy) stay out of the shared default. Merged per server, one level deep.
const local = existsSync(join(here, 'mcp.local.json'))
  ? read('mcp.local.json')
  : undefined;

const config: McpConfig = local
  ? {
      ...shipped,
      ...local,
      settings: {...shipped.settings, ...local.settings},
      mcpServers: Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(shipped.mcpServers ?? {}),
            ...Object.keys(local.mcpServers ?? {}),
          ]),
        ].map((name) => [
          name,
          {...shipped.mcpServers?.[name], ...local.mcpServers?.[name]},
        ]),
      ),
    }
  : shipped;

export default createMcpAdapter({config});
