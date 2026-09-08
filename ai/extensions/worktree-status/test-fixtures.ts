import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function makeFixtures() {
	const base = realpathSync(mkdtempSync(join(tmpdir(), "footer-")));
	const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
	Object.assign(env, {
		GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
		GIT_AUTHOR_NAME: "Footer Test", GIT_AUTHOR_EMAIL: "footer@example.invalid",
		GIT_COMMITTER_NAME: "Footer Test", GIT_COMMITTER_EMAIL: "footer@example.invalid",
	});
	const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", env });
	const main = join(base, "main");
	const linked = join(base, "i7343-payment-section", "src");
	const other = join(base, "other repo 日本");
	const nonGit = join(base, "plain");
	for (const path of [main, other, nonGit]) mkdirSync(path, { recursive: true });
	for (const [path, branch] of [[main, "trunk"], [other, "research"]]) {
		git(path, "init", "--quiet", `--initial-branch=${branch}`);
		writeFileSync(join(path, "README.md"), "fixture\n");
		git(path, "add", "README.md");
		git(path, "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "fixture");
	}
	git(main, "worktree", "add", "--quiet", "-b", "payment-section-7343", linked);
	for (const path of [main, linked, other]) mkdirSync(join(path, "areas", "clients", "admin-web"), { recursive: true });
	return { base, main, linked, other, nonGit, env, git, cleanup: () => rmSync(base, { recursive: true, force: true }) };
}
