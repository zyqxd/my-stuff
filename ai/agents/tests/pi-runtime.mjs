import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, realpathSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = process.env.PI_PACKAGE_DIR;
if (!root) throw new Error('Run installed-runtime tests inside Pi (PI_PACKAGE_DIR is required).');
const require = createRequire(join(root, 'package.json'));
const {createJiti} = require('jiti');
const entry = (name, file = 'index.js') => join(root, 'node_modules/@earendil-works', name, 'dist', file);
const alias = Object.fromEntries(['pi-coding-agent', 'pi-agent-core', 'pi-tui'].map((name) => [`@earendil-works/${name}`, entry(name)]));
for (const [name, file] of [['compat', 'compat.js'], ['oauth', 'oauth.js'], ['providers/all', 'providers/all.js']]) {
  alias[`@earendil-works/pi-ai/${name}`] = entry('pi-ai', file);
}
alias['@earendil-works/pi-ai'] = entry('pi-ai', 'compat.js');
alias.typebox = require.resolve('typebox');
export const jiti = createJiti(import.meta.url, {alias, interopDefault: false});
export const sdk = await import(pathToFileURL(entry('pi-coding-agent')));
export const ai = await import(pathToFileURL(entry('pi-ai', 'compat.js')));
const agentDir = join(homedir(), '.pi/agent');
const packages = JSON.parse(readFileSync(join(agentDir, 'settings.json'), 'utf8')).packages;
const candidates = packages.flatMap((entry) => {
  const source = typeof entry === 'string' ? entry : entry.source;
  const directory = /^npm:pi-subagents(?:@|$)/.test(source)
    ? join(agentDir, 'npm/node_modules/pi-subagents')
    : !/^[a-z]+:/i.test(source) ? resolve(agentDir, source.replace(/^~\//, `${homedir()}/`)) : undefined;
  if (!directory || !existsSync(join(directory, 'package.json'))) return [];
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name === 'pi-subagents' ? [directory] : [];
});
assert.equal(candidates.length, 1, 'Expected exactly one configured pi-subagents package source.');
export const subagentsRoot = realpathSync(candidates[0]);
export const load = (relative) => jiti.import(join(subagentsRoot, relative));
