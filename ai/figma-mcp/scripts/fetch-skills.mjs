// Clones Figma's official skills at a pinned SHA. They are fetched rather than
// vendored because figma/mcp-server-guide ships no LICENSE — cloning it is fine,
// redistributing it inside this package is not.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const SHA = '72fcf1f4b170bcaa78fa8bef2f27cce15f4d58f4'; // = the SHA anthropics/claude-plugins-official pins
const REPO = 'https://github.com/figma/mcp-server-guide.git';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dest = join(root, 'vendor', 'figma-mcp-server-guide');
const git = (args, cwd = root) =>
  execFileSync('git', args, {cwd, stdio: 'inherit'});

if (!existsSync(join(dest, '.git'))) {
  mkdirSync(join(root, 'vendor'), {recursive: true});
  git(['clone', '--quiet', REPO, dest]);
}

try {
  git(['checkout', '--quiet', SHA], dest);
} catch {
  git(['fetch', '--quiet', 'origin'], dest);
  git(['checkout', '--quiet', SHA], dest);
}

console.log(
  `figma-mcp: skills ready at vendor/figma-mcp-server-guide (${SHA.slice(0, 7)})`,
);
