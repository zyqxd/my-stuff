/**
 * Test-only resolver: pi injects @earendil-works/* and typebox at runtime, so
 * plain node cannot import index.ts without help. Points those specifiers at the
 * active Pi package (PI_PACKAGE_DIR), falling back to the newest installed Pi.
 */
import { readdirSync } from "node:fs";
import { register } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

process.env.FORCE_COLOR = "1";
let activePackage = process.env.PI_PACKAGE_DIR;
if (!activePackage) {
	const pkgRoot = join(homedir(), ".pi", "pkg");
	const latest = readdirSync(pkgRoot)
		.filter((name) => name.startsWith("pi-"))
		.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
		.pop();
	if (!latest) throw new Error(`No pi package found under ${pkgRoot}`);
	activePackage = join(pkgRoot, latest);
}
console.error(`Test runtime: ${activePackage}`);
const modules = pathToFileURL(join(activePackage, "node_modules") + "/").href;
register(
	`data:text/javascript,
	export async function resolve(specifier, context, next) {
		if (specifier === "@earendil-works/pi-coding-agent/theme") {
			return next(${JSON.stringify(modules)} + "@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js", context);
		}
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
