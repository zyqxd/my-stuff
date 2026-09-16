import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const originFile = '.integration-origin.json';
export const pins = [
  {name: 'pi-memory', version: '0.4.2', target: 'pi-memory-0.4.2-retrieval-only', patch: 'pi-memory-0.4.2-retrieval-only.patch', stockHash: '3b796fee1eb0e512a08dc9bdb35e34118b4fc03e268add1505727db3bb7d4a12', patchedHash: '0e0efea25a993a5bfa6a1fa07d8055fe423d1693c8d52f324b91327c50c9a44a'},
  {name: 'brain', version: '2.1.0', target: 'brain-pi-2.1.0-targeted-context', patch: 'brain-pi-2.1.0-targeted-context.patch', stockHash: '096a69911bcb38f99de7b7d12ab0d7ca521158ac5b979a98b512f06ce042d248', patchedHash: '761ae98aad0a0ab06a5c9000bcbf1c2f463f9ba9061e3eace252de5780198332'},
];

export function treeHash(directory) {
  const entries = [];
  function visit(relative) {
    for (const name of readdirSync(join(directory, relative)).sort()) {
      if (name === 'node_modules' || name === originFile) continue;
      const file = join(relative, name);
      const stat = lstatSync(join(directory, file));
      assert.ok(!stat.isSymbolicLink(), `Unexpected package symlink: ${file}`);
      if (stat.isDirectory()) visit(file);
      else {
        assert.ok(stat.isFile(), `Unexpected package entry: ${file}`);
        entries.push([file, digest(readFileSync(join(directory, file)))]);
      }
    }
  }
  visit('');
  return digest(JSON.stringify(entries));
}

function localPath(source, agentDir) {
  if (/^[a-z]+:/i.test(source)) return undefined;
  return resolve(agentDir, source.replace(/^~\//, `${homedir()}/`));
}

function packageName(source, agentDir, brainSource) {
  if (/^npm:pi-memory(?:@|$)/.test(source)) return 'pi-memory';
  const path = localPath(source, agentDir);
  if (!path) return undefined;
  if (path === resolve(brainSource)) return 'brain';
  const base = basename(path);
  if (/^brain-pi-/.test(base)) return 'brain';
  if (/^pi-memory-/.test(base)) return 'pi-memory';
  if (existsSync(join(path, 'package.json'))) return json(join(path, 'package.json')).name;
}

export function installMemoryIntegrations({
  agentDir = process.env.PI_CODING_AGENT_DIR || join(homedir(), '.pi/agent'),
  memorySource = join(agentDir, 'npm/node_modules/pi-memory'),
  brainSource = join(homedir(), '.local/state/tec/toolchain/user_profile/share/brain/clients/pi'),
  mode = 'check',
  only,
} = {}) {
  assert.ok(['check', 'prepare', 'apply'].includes(mode), 'Invalid mode');
  assert.ok(!only || pins.some((pin) => pin.name === only), 'Use --only pi-memory or --only brain');
  assert.ok(agentDir.startsWith('/'), 'Pi agent directory must be absolute');
  const selected = pins.filter((pin) => !only || pin.name === only);
  const settingsFile = join(agentDir, 'settings.json');
  assert.ok(lstatSync(settingsFile).isFile(), 'settings.json must be a regular file');
  const originalSettings = readFileSync(settingsFile, 'utf8');
  const settings = JSON.parse(originalSettings);
  assert.ok(Array.isArray(settings.packages), 'settings.packages must be an array');
  const plans = selected.map((pin) => {
    const source = pin.name === 'brain' ? brainSource : memorySource;
    const target = join(agentDir, 'local-packages', pin.target);
    const registrations = settings.packages.filter((entry) => packageName(typeof entry === 'string' ? entry : entry.source, agentDir, brainSource) === pin.name);
    assert.ok(registrations.length <= 1, `Duplicate ${pin.name} registrations; remove the unintended entry before proceeding`);
    for (const extension of settings.extensions ?? []) {
      const path = localPath(extension.replace(/^[+-]/, ''), agentDir);
      if (!path) continue;
      const candidates = [source, target].filter(existsSync).map((path) => realpathSync(path));
      const resolved = existsSync(path) ? realpathSync(path) : path;
      assert.ok(!candidates.some((root) => resolved === root || resolved.startsWith(`${root}/`)), `Duplicate/direct ${pin.name} extension registration: ${extension}`);
    }
    const sourceExists = existsSync(source);
    if (sourceExists) {
      assert.equal(json(join(source, 'package.json')).version, pin.version, `${pin.name} stock version changed`);
      assert.equal(treeHash(realpathSync(source)), pin.stockHash, `${pin.name} stock tree changed; review before updating the pin`);
    }
    if (existsSync(target)) {
      assert.ok(lstatSync(target).isDirectory(), `Pinned target must be a real directory: ${target}`);
      assert.equal(treeHash(target), pin.patchedHash, `${pin.name} pinned tree changed; refusing to overwrite`);
      const origin = json(join(target, originFile));
      assert.equal(origin.stockHash, pin.stockHash);
      assert.equal(origin.patchedHash, pin.patchedHash);
      if (pin.name === 'brain') {
        assert.ok(sourceExists, 'Brain toolchain source unavailable; cannot verify drift');
        assert.equal(origin.source, realpathSync(source), 'Brain toolchain origin changed; review the new Nix build before repinning');
      }
    } else {
      assert.ok(sourceExists, `Missing ${pin.name} stock source: ${source}. Install the exact stock release before preparing.`);
      assert.notEqual(mode, 'check', `Missing pinned package: ${target}; run --prepare-only or --apply after approval`);
    }
    if (mode === 'check') {
      assert.equal(registrations.length, 1, `${pin.name} is not selected`);
      const entry = registrations[0];
      assert.equal(localPath(typeof entry === 'string' ? entry : entry.source, agentDir), target, `${pin.name} stock package is still selected`);
    }
    return {pin, source, target, registration: registrations[0]};
  });

  for (const {pin, source, target} of plans) {
    if (existsSync(target) || mode === 'check') continue;
    const localRoot = dirname(target);
    mkdirSync(localRoot, {recursive: true});
    const staging = mkdtempSync(join(localRoot, '.prepare-memory-'));
    try {
      cpSync(realpathSync(source), staging, {recursive: true, dereference: true, filter: (path) => basename(path) !== 'node_modules'});
      assert.ok(realpathSync(staging).startsWith(`${realpathSync(localRoot)}/`));
      assert.notEqual(realpathSync(staging), realpathSync(source), 'Staging must not alias the source');
      assert.equal(treeHash(staging), pin.stockHash, 'Staged stock tree differs');
      function makeWritable(directory) {
        chmodSync(directory, 0o700);
        for (const name of readdirSync(directory)) {
          const file = join(directory, name);
          if (statSync(file).isDirectory()) makeWritable(file);
          else chmodSync(file, statSync(file).mode | 0o200);
        }
      }
      makeWritable(staging);
      execFileSync('patch', ['--batch', '-p1', '-i', join(here, 'patches', pin.patch)], {cwd: staging, stdio: 'pipe'});
      assert.equal(treeHash(staging), pin.patchedHash, `${pin.name} patched tree mismatch`);
      writeFileSync(join(staging, originFile), `${JSON.stringify({source: realpathSync(source), stockHash: pin.stockHash, patchedHash: pin.patchedHash}, null, 2)}\n`);
      renameSync(staging, target);
    } finally {
      rmSync(staging, {recursive: true, force: true});
    }
  }
  if (mode === 'apply') {
    for (const {target, registration} of plans) {
      const source = `local-packages/${basename(target)}`;
      if (registration === undefined) settings.packages.push(source);
      else settings.packages[settings.packages.indexOf(registration)] = typeof registration === 'string' ? source : {...registration, source};
    }
    assert.equal(readFileSync(settingsFile, 'utf8'), originalSettings, 'settings.json changed during preparation; selection untouched');
    const output = `${JSON.stringify(settings, null, 2)}\n`;
    if (output !== originalSettings) {
      const staging = mkdtempSync(join(agentDir, '.select-memory-'));
      try {
        const file = join(staging, 'settings.json');
        writeFileSync(file, output, {mode: statSync(settingsFile).mode & 0o777});
        renameSync(file, settingsFile);
      } finally {
        rmSync(staging, {recursive: true, force: true});
      }
    }
  }
  return plans.map(({pin, target}) => `${pin.name}: ${mode} passed (${target})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const modeArg = args.find((arg) => ['--apply', '--prepare-only'].includes(arg));
    const onlyIndex = args.indexOf('--only');
    const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
    const allowed = [...(modeArg ? [modeArg] : []), ...(onlyIndex >= 0 ? ['--only', only] : [])];
    assert.equal(args.length, allowed.length, 'Usage: node ai/install-memory-integrations.mjs [--prepare-only|--apply] [--only pi-memory|brain]');
    assert.ok(args.every((arg) => allowed.includes(arg)), 'Unknown option');
    console.log(installMemoryIntegrations({mode: modeArg === '--apply' ? 'apply' : modeArg ? 'prepare' : 'check', only}).join('\n'));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
