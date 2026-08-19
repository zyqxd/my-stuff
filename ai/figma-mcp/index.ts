import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createMcpAdapter} from 'pi-mcp-adapter';
import type {McpConfig} from 'pi-mcp-adapter/types';

// Passing `config` (not `configPath`) keeps this package hermetic: the adapter
// skips all ambient MCP config discovery (~/.config/mcp/mcp.json, .mcp.json,
// ~/.pi/agent/mcp.json, host configs) and sees only the file below.
const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(here, 'mcp.json'), 'utf8'),
) as McpConfig;

export default createMcpAdapter({config});
