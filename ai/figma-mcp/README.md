# pi-figma-mcp

Figma's MCP tools and Figma's official skills, packaged for the
[pi coding agent](https://pi.dev) — the equivalent of Claude Code's
`figma@claude-plugins-official` plugin.

Pi has no plugin marketplace and no built-in MCP, so this package supplies both
halves: the MCP client is the community extension
[`pi-mcp-adapter`](https://www.npmjs.com/package/pi-mcp-adapter), and the skills are
cloned from [`figma/mcp-server-guide`](https://github.com/figma/mcp-server-guide) at
the same SHA the official Claude marketplace pins.

## Install

```bash
pi install git:github.com/zyqxd/pi-figma-mcp@v1
```

Pi clones the package, installs `pi-mcp-adapter`, and the `postinstall` fetches the
Figma skills into `vendor/`. Restart pi, then `/mcp` shows the server.

Two things every installer does for themselves:

1. Pick a server and get it talking — see [Authentication](#authentication--read-before-first-use).
   The shipped default is Figma's **desktop** server, which needs
   _Figma → Preferences → Enable MCP server_ and no OAuth at all.
2. Put any per-machine overrides in `mcp.local.json` (gitignored), never in
   `mcp.json` — that keeps the shared default neutral for the next person.

From a local checkout instead: `./setup.sh`. Uninstall with
`pi remove git:github.com/zyqxd/pi-figma-mcp`.

## Republish

The working copy lives inside a larger personal repo at `ai/figma-mcp`; the published
repo is a split-out mirror. To cut it the first time:

```bash
cd ~/Workspace/my-stuff
git subtree split --prefix=ai/figma-mcp -b figma-mcp-export

gh repo create zyqxd/pi-figma-mcp --private \
  --description "Figma MCP + Figma's official skills, packaged for the pi coding agent"

git push git@github.com:zyqxd/pi-figma-mcp.git figma-mcp-export:main
git push git@github.com:zyqxd/pi-figma-mcp.git figma-mcp-export:refs/tags/v1
```

After later edits, commit them in the working copy and repeat the split and push,
moving the tag:

```bash
git branch -D figma-mcp-export
git subtree split --prefix=ai/figma-mcp -b figma-mcp-export
git push git@github.com:zyqxd/pi-figma-mcp.git figma-mcp-export:main --force
git push git@github.com:zyqxd/pi-figma-mcp.git figma-mcp-export:refs/tags/v2
```

Pi pins refs, so installers stay on `@v1` until they're told to move — bump the tag
rather than relying on `main`. `pi update --extensions` reconciles an existing clone
to its configured ref; it does not jump to a newer tag on its own.

**Keep the repo private unless the README is trimmed.** The
[remote-server section](#remote-server-more-tools-one-uncomfortable-step) documents,
with reproducible evidence, how to get past Figma's client allowlist. Internally that
reads as an honest record of a trade-off; published openly it reads as a how-to. For
a public version, cut it back to "Figma allowlists registration, use the desktop
server" and drop the working recipe.

## Contents

```
pi-figma-mcp/
├── index.ts             the extension — merges config and hands it to pi-mcp-adapter
├── mcp.json             shipped defaults (safe for everyone)
├── mcp.local.json       your machine's overrides — gitignored, optional
├── scripts/
│   └── fetch-skills.mjs clones Figma's skills at a pinned SHA
├── setup.sh             manual install
├── node_modules/        pi-mcp-adapter (gitignored)
└── vendor/              figma/mcp-server-guide @ 72fcf1f (gitignored)
```

Config is passed to the adapter **in memory** (`createMcpAdapter({ config })`), so it
never reads ambient MCP config — not `~/.config/mcp/mcp.json`, not `.mcp.json`, not
host configs. The consequence: `/mcp setup`, `/mcp enable`, and `/mcp disable` are
inert. Edit `mcp.json` (shared) or `mcp.local.json` (yours) and restart pi.

`mcp.local.json` is merged over `mcp.json` one level deep per server, and is
gitignored — put your server choice and any credentials policy there so the shared
default stays neutral.

## Authentication — read before first use

Figma runs two MCP servers, and **the remote one will not let pi register**.

| Server             | URL                         | Auth                                      | Shipped state      |
| ------------------ | --------------------------- | ----------------------------------------- | ------------------ |
| Desktop (Dev Mode) | `http://127.0.0.1:3845/mcp` | none — inherits the desktop app's session | **enabled**        |
| Remote             | `https://mcp.figma.com/mcp` | OAuth 2.1                                 | `"disabled": true` |

Enable only one: `toolPrefix` is `none`, so both would claim the same tool names.

### Desktop server (default, no decisions required)

Open a design file in the Figma **desktop app** → menu **Figma → Preferences →
Enable MCP server**. Needs a Dev or Full seat. Then `/mcp reconnect figma`.

You get the whole read path — `get_design_context`, `get_screenshot`, `get_metadata`,
`get_variable_defs`, Code Connect. You don't get the write-to-canvas tools.

### Remote server (more tools, one uncomfortable step)

It advertises OAuth with dynamic client registration, but Figma's registration
endpoint allowlists the client. Verified 2026-08-19 — identical request bodies,
only `client_name` differs:

```
"Claude Code"                                    -> 200, client_id issued
"pi" / "Cursor" / "Zed" / "Visual Studio Code"   -> 403 Forbidden
```

Registering your own app doesn't help either: `mcp:connect` is absent from Figma's
published OAuth scope list for custom apps. So the only way in today is to register
under an allowlisted name, in your **`mcp.local.json`**:

```json
{
  "mcpServers": {
    "figma": {"disabled": true},
    "figma-remote": {
      "disabled": false,
      "oauth": {"clientName": "Claude Code", "scope": "mcp:connect"}
    }
  }
}
```

Be clear about what that does. The OAuth grant is still yours — you sign in as
yourself, consent in the browser, and receive only `mcp:connect`. But Figma's audit
trail and your _Settings → Connections_ page will record this pi install as
"Claude Code", which it isn't. That is a misrepresentation to a vendor, it is per
person, and it is deliberately **not** the shipped default. Decide for yourself.

Then, once, in an interactive session:

```
/mcp-auth figma-remote
```

Tokens go to the OS keychain, bound to the server URL — never into this repo.
`autoAuth` is off, so pi never opens a browser on its own. `/mcp logout figma-remote`
clears them; revoke server-side in Figma → Settings → Connections.

## Using it

Everything is lazy — nothing connects, and nothing costs context, until a tool runs.

```
/mcp                 server status
/mcp tools           list every Figma tool
/mcp reconnect figma
```

The agent reaches Figma through one proxy tool, `mcp` (~200 tokens), instead of the
full set of Figma tool schemas:

```js
mcp({ search: "design context" })
mcp({ describe: "get_design_context" })
mcp({ tool: "get_design_context", args: { … } })
```

`get_design_context` and `get_screenshot` are also promoted to real top-level tools
once the server has connected, because the skills name them directly. Adjust with
`directTools` per server (`true` = all direct, `false` = proxy only).

Day to day you don't type any of that. Copy a frame link in Figma (`⌘L`) and ask:

> implement this Figma design: https://figma.com/design/…?node-id=1-234

The `figma-design-to-code` skill fires and drives the tools.

## Skills

Two of Figma's twelve are enabled, in `package.json` → `pi.skills`:

- `figma-design-to-code` — mandatory prerequisite for `get_design_context`
- `figma-code-connect` — `.figma.ts` component mappings

The rest sit in `vendor/` unloaded, because every enabled skill's description costs
context permanently: `figma-use`, `figma-generate-design`, `figma-generate-diagram`,
`figma-generate-library`, `figma-create-new-file`, `figma-implement-motion`,
`figma-use-motion`, `figma-swiftui`, `figma-use-slides`, `figma-use-figjam`. Enable
one by adding its directory:

```json
"./vendor/figma-mcp-server-guide/skills/figma-use"
```

`figma-use` is the prerequisite for the write-path `use_figma` tool — enable it if
you're on the remote server and intend to write to Figma. Restart pi afterwards.

## Maintenance

- Bump the skills: edit `SHA` in `scripts/fetch-skills.mjs`, re-run `pnpm install`.
- Bump the adapter: `pnpm update pi-mcp-adapter`.
- `pi-mcp-adapter` is pinned rather than floating so an install is reproducible; some
  environments (Shopify's package proxy, for one) enforce a minimum dependency age
  and won't serve the newest release.

## Security notes

- `pi-mcp-adapter` is third-party (nicobailon, MIT) and, like every pi extension, runs
  with full access to your machine. Pinned, and readable in `node_modules/`.
- The MCP server acts as **you** in Figma. On the remote server that includes write
  tools; `directTools` limits what's convenient, not what's reachable through the
  proxy. Use `approveTools` in `mcp.json` to force interactive approval per tool.
- Figma's skills are cloned, never redistributed here: `figma/mcp-server-guide` ships
  no LICENSE, so its contents are all-rights-reserved.
