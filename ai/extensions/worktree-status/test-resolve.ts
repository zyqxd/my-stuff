/**
 * Test-only resolver: pi injects @earendil-works/* and typebox at runtime, so
 * plain node cannot import index.ts without help. Points those specifiers at the
 * newest installed pi package rather than a pinned path, so it survives pi
 * upgrades.
 */
import { readdirSync } from "node:fs";
import { register } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const pkgRoot = join(homedir(), ".pi", "pkg");
const latest = readdirSync(pkgRoot)
	.filter((name) => name.startsWith("pi-"))
	.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
	.pop();
if (!latest) throw new Error(`No pi package found under ${pkgRoot}`);

const modules = pathToFileURL(join(pkgRoot, latest, "node_modules") + "/").href;
register(
	`data:text/javascript,
	export async function resolve(specifier, context, next) {
		if (specifier.startsWith("@earendil-works/")) {
			return next(${JSON.stringify(modules)} + specifier + "/dist/index.js", context);
		}
		if (specifier === "typebox") {
			return next(${JSON.stringify(modules)} + "typebox/build/index.mjs", context);
		}
		return next(specifier, context);
	}`,
	import.meta.url,
);
