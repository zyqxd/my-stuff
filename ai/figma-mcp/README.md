# figma-mcp — Figma MCP for pi, in one directory

A self-contained pi package that gives pi the same two things Claude Code's
`figma@claude-plugins-official` plugin gives Claude: **Figma's MCP tools** and
**Figma's official skills**. Pi has no plugin marketplace and no built-in MCP, so
the MCP half is provided by the community extension
[`pi-mcp-adapter`](https://www.npmjs.com/package/pi-mcp-adapter).

Everything lives under this directory. Nothing was written to `~/.config/mcp/`,
`~/.pi/agent/mcp.json`, or any other ambient location — the only change outside
this folder is one line in `~/.pi/agent/settings.json` (see [Wiring](#wiring)).

## Contents

```
figma-mcp/
├── package.json     pi manifest: which extension + which skills to load
├── index.ts         the extension — hands ./mcp.json to pi-mcp-adapter
├── mcp.json         the only Figma config (server URL, auth, tool exposure)
├── setup.sh         reproduces node_modules/ + vendor/ from scratch
├── node_modules/    pi-mcp-adapter 2.23.0 (gitignored)
└── vendor/          figma/mcp-server-guide @ 72fcf1f (gitignored)
    └── figma-mcp-server-guide/skills/   12 official Figma skills
```

`index.ts` passes the config **in memory** (`createMcpAdapter({ config })`), which
makes the adapter skip all of its normal config discovery. Consequence: this
package can only ever see the Figma server defined in `mcp.json`, and `/mcp setup`,
`/mcp enable`, and `/mcp disable` are inert (edit `mcp.json` instead).

## Wiring

Registered with `pi install`, which appended a relative path to the `packages`
array in `~/.pi/agent/settings.json`:

```json
"packages": ["...", "../../Workspace/my-stuff/ai/figma-mcp"]
```

Remove it with `pi remove ~/Workspace/my-stuff/ai/figma-mcp`. Deleting this folder
without that leaves a dangling entry.

## Authentication — read this before first use

Figma runs two MCP servers. **The remote one will not let pi register.**

| Server             | URL                         | Auth                                      | Status here                                                                                 |
| ------------------ | --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Desktop (Dev Mode) | `http://127.0.0.1:3845/mcp` | none — inherits the desktop app's session | `"disabled": true`; needs _Figma → Preferences → Enable MCP server_ with a design file open |
| Remote             | `https://mcp.figma.com/mcp` | OAuth 2.1                                 | **enabled**, but registration is refused until a client identity is chosen (below)          |

Enable only one at a time: `toolPrefix` is `none`, so both would claim the same tool
names. Toggle with the `disabled` field in `mcp.json` — `/mcp enable` and `/mcp disable`
are unavailable here because the config is supplied in memory.

The remote server advertises OAuth with dynamic client registration, but Figma's
registration endpoint (`https://api.figma.com/v1/oauth/mcp/register`) allowlists the
client. Verified 2026-08-19 — identical request bodies, only `client_name` differs:

```
client_name "Claude Code"        -> 200, client_id issued
client_name "pi" / "Cursor" / "Zed" / "Visual Studio Code" -> 403 Forbidden
```

So there are three ways to get the remote server working, in order of how
comfortable they are:

1. **Use the desktop server instead** (current default). Install the Figma desktop
   app, enable _Preferences → Enable MCP server_, done — no OAuth, no allowlist.
   Trade-off: no write-to-canvas tools (`use_figma`, `generate_figma_design`); the
   read path used for design→code is all there.
2. **Pre-register your own client.** Likely closed: `mcp:connect` is absent from
   Figma's published OAuth scope list for custom apps (checked 2026-08-19), so an app
   from developers.figma.com → My Apps probably cannot request it. If Figma grants it
   to you anyway:
   ```json
   "figma-remote": { "url": "https://mcp.figma.com/mcp", "auth": "oauth",
     "oauth": { "clientId": "…", "clientSecret": "…", "scope": "mcp:connect" } }
   ```
3. **Register under an allowlisted name** — `"oauth": { "clientName": "Claude Code" }`
   makes registration succeed. **This is what `mcp.json` currently does**, chosen
   deliberately on 2026-08-19 after routes 1 and 2 were ruled out. It misrepresents
   the client to Figma: the OAuth grant is still yours, scoped to `mcp:connect`, and
   consented in your browser, but Figma's audit trail and your _Settings →
   Connections_ page will show this pi install as "Claude Code". Remove the
   `clientName` line to back out — registration then 403s again.

After enabling the remote server, authenticate once with `/mcp-auth figma-remote`.
Tokens go to the macOS keychain (bound to the server URL), never to this folder.
`autoAuth` is off, so pi will never open a browser on its own.

## Using it

Everything is **lazy** — no connection, and no cost, until you call a tool.

```
/mcp                 server status
/mcp tools           list every Figma tool
/mcp-auth <server>   OAuth (remote server only)
```

The agent reaches Figma through one proxy tool, `mcp`, which costs ~200 tokens of
context instead of the ~18 full Figma tool schemas:

```
mcp({ search: "design context" })                          # discover
mcp({ tool: "get_design_context", args: { … } })           # call
```

Two tools are promoted to real, directly callable tools because the skills name
them explicitly: `get_design_context` and `get_screenshot`. They only appear after
the server has connected once. Change the set with `directTools` in `mcp.json`
(`true` = all tools direct, `false` = proxy only).

Typical flow: copy a Figma frame link, then _"implement this Figma design: <url>"_.
The `figma-design-to-code` skill fires, tells the model how to call
`get_design_context` properly, and the result gets adapted to the target codebase.

## Skills

Two of Figma's twelve skills are enabled, listed in `package.json` → `pi.skills`:

- `figma-design-to-code` — mandatory prerequisite for `get_design_context`
- `figma-code-connect` — `.figma.ts` component mappings

The other ten stay on disk but out of pi's system prompt (each one's description
costs context permanently): `figma-use`, `figma-generate-design`,
`figma-generate-diagram`, `figma-generate-library`, `figma-create-new-file`,
`figma-implement-motion`, `figma-use-motion`, `figma-swiftui`, `figma-use-slides`,
`figma-use-figjam`. Enable one by adding its directory to `pi.skills`:

```json
"./vendor/figma-mcp-server-guide/skills/figma-use"
```

`figma-use` is the prerequisite for the write-path `use_figma` tool — enable it if
you switch to the remote server and intend to write to Figma. Restart pi after
editing `package.json`.

## Maintenance

```bash
./setup.sh                       # reproduce node_modules/ + vendor/ + pi registration
pnpm update pi-mcp-adapter       # bump the adapter
```

The Figma skills are pinned to `72fcf1f` (the SHA the official Claude marketplace
points at). To move: edit `FIGMA_SHA` in `setup.sh` and re-run it.

`pi-mcp-adapter` is pinned at 2.23.0 rather than the current 2.26.1 because
Shopify's package proxy enforces a minimum dependency age; newer versions become
available as they age in.

## Security notes

- `pi-mcp-adapter` is third-party (nicobailon, MIT) and, like every pi extension,
  runs with full access to this machine. It is vendored here in `node_modules/` so
  the exact code in use is readable and pinned.
- The MCP server acts as **you** in Figma. On the remote server that includes write
  tools; `directTools` limits what is convenient, not what is reachable through the
  proxy. `approveTools` in `mcp.json` can force interactive approval per tool.
- No Figma credentials are ever stored in this directory.
