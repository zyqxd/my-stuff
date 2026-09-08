import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync} from 'node:fs';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const prepareOnly = process.argv[2] === '--prepare-only';
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && prepareOnly), 'Usage: node ai/install-subagents.mjs [--prepare-only]');
const agentDir = join(homedir(), '.pi/agent');
const localRoot = join(agentDir, 'local-packages');
const target = join(localRoot, 'pi-subagents-0.64.0-fork-effort');
const stock = join(agentDir, 'npm/node_modules/pi-subagents');
const sourceFile = 'src/shared/fork-context.ts';
const stockHash = 'a8680eb2df950267246ddddcec8cc16f7d9c4ff7008da6df5cd833476b309056';
const patchedHash = '925bbc443ec942d4e203a58663672160bf30de95c89b04b6d1e3102695d7dd0b';
const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const pi = (...args) => execFileSync('pi', args, {stdio:'inherit'});

if (!existsSync(target)) {
  if (!existsSync(stock) || json(join(stock, 'package.json')).version !== '0.64.0') {
    assert.equal(prepareOnly, false, 'Install npm:pi-subagents@0.64.0 before using --prepare-only.');
    pi('install', 'npm:pi-subagents@0.64.0');
  }
  assert.equal(json(join(stock, 'package.json')).version, '0.64.0');
  assert.equal(hash(join(stock, sourceFile)), stockHash, 'Stock fork source differs; refusing to patch an unverified release.');
  mkdirSync(localRoot, {recursive:true});
  const staging = mkdtempSync(join(localRoot, '.prepare-subagents-'));
  try {
    const source = realpathSync(stock);
    cpSync(source, staging, {recursive:true, dereference:true});
    const require = createRequire(join(source, 'package.json'));
    for (const [name, version] of Object.entries(json(join(source, 'package.json')).dependencies)) {
      let dependency = dirname(require.resolve(name));
      while (!existsSync(join(dependency, 'package.json'))) {
        const parent = dirname(dependency);
        assert.notEqual(parent, dependency, `Cannot locate ${name}'s package root.`);
        dependency = parent;
      }
      const manifest = json(join(dependency, 'package.json'));
      assert.equal(manifest.name, name);
      assert.equal(manifest.version, version);
      assert.deepEqual(manifest.dependencies ?? {}, {}, `${name} gained transitive dependencies; review the copy procedure.`);
      cpSync(dependency, join(staging, 'node_modules', name), {recursive:true, dereference:true});
    }
    execFileSync('patch', ['--batch', '-p1', '-i', fileURLToPath(new URL('./patches/pi-subagents-0.64.0-fork-effort.patch', import.meta.url))], {cwd:staging, stdio:'inherit'});
    assert.equal(hash(join(staging, sourceFile)), patchedHash);
    renameSync(staging, target);
  } finally {
    rmSync(staging, {recursive:true, force:true});
  }
}
assert.equal(json(join(target, 'package.json')).version, '0.64.0');
assert.equal(hash(join(target, sourceFile)), patchedHash, 'Local fork source changed; refusing to overwrite it.');
if (!prepareOnly) {
  const packages = json(join(agentDir, 'settings.json')).packages ?? [];
  for (const entry of packages) {
    const source = typeof entry === 'string' ? entry : entry.source;
    if (/^npm:pi-subagents(?:@|$)/.test(source)) pi('remove', source);
  }
  pi('install', target);
  console.log('Installed pinned pi-subagents with the fork-effort fix. Reload running Pi sessions.');
} else {
  console.log(`Prepared ${target}; package selection unchanged.`);
}
