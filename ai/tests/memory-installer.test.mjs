import assert from 'node:assert/strict';
import {chmodSync, existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import {installMemoryIntegrations, pins, treeHash} from '../install-memory-integrations.mjs';
import {fixture, sourceSkip} from './memory-fixtures.mjs';

const readSettings = (f) => JSON.parse(readFileSync(f.settingsFile, 'utf8'));
test('check-only is read-only; prepare does not select; apply preserves filters/settings and is idempotent', {skip: sourceSkip}, (t) => {
  const f = fixture(t, {prepare: false});
  const initial = readFileSync(f.settingsFile, 'utf8');
  assert.throws(() => installMemoryIntegrations(f.options), /Missing pinned package/);
  assert.equal(existsSync(f.memoryPin), false);
  assert.equal(readFileSync(f.settingsFile, 'utf8'), initial);
  installMemoryIntegrations({...f.options, mode: 'prepare'});
  assert.equal(readFileSync(f.settingsFile, 'utf8'), initial);
  assert.equal(treeHash(f.memoryPin), pins[0].patchedHash);
  assert.equal(treeHash(f.brainPin), pins[1].patchedHash);
  assert.equal(existsSync(join(f.memoryPin, 'node_modules')), false);
  installMemoryIntegrations({...f.options, mode: 'apply'});
  const selected = readSettings(f);
  assert.deepEqual({...selected, packages: f.settings.packages}, f.settings);
  assert.deepEqual(selected.packages[1], {...f.settings.packages[1], source: `local-packages/${pins[1].target}`});
  assert.equal(selected.packages[2], 'npm:unrelated-package');
  const once = readFileSync(f.settingsFile, 'utf8');
  installMemoryIntegrations({...f.options, mode: 'apply'});
  installMemoryIntegrations(f.options);
  assert.equal(readFileSync(f.settingsFile, 'utf8'), once);
});

test('symlinked npm source bytes and modes survive successful preparation and failed preflight', {skip: sourceSkip}, (t) => {
  const f = fixture(t, {prepare: false});
  const file = join(f.stockMemory, 'index.ts');
  chmodSync(file, 0o444);
  const original = readFileSync(file);
  const mode = statSync(file).mode;
  installMemoryIntegrations({...f.options, mode: 'prepare'});
  assert.notEqual(realpathSync(f.memoryPin), realpathSync(f.options.memorySource));
  assert.deepEqual(readFileSync(file), original);
  assert.equal(statSync(file).mode, mode);
  writeFileSync(join(f.memoryPin, 'index.ts'), 'corrupted fixture');
  assert.throws(() => installMemoryIntegrations({...f.options, mode: 'prepare'}), /pinned tree changed/);
  assert.deepEqual(readFileSync(file), original);
  assert.equal(statSync(file).mode, mode);
  assert.deepEqual(readSettings(f), f.settings);
  assert.equal(readdirSync(join(f.agentDir, 'local-packages')).some((name) => name.startsWith('.prepare-')), false);
});

test('a failed patched-tree verification never writes through a symlinked source and cleans staging', {skip: sourceSkip}, (t) => {
  const f = fixture(t, {prepare: false});
  const source = join(f.stockMemory, 'index.ts');
  chmodSync(source, 0o444);
  const bytes = readFileSync(source);
  const mode = statSync(source).mode;
  const expected = pins[0].patchedHash;
  try {
    pins[0].patchedHash = 'invalid fixture hash';
    assert.throws(() => installMemoryIntegrations({...f.options, mode: 'prepare', only: 'pi-memory'}), /patched tree mismatch/);
  } finally {
    pins[0].patchedHash = expected;
  }
  assert.deepEqual(readFileSync(source), bytes);
  assert.equal(statSync(source).mode, mode);
  assert.equal(existsSync(f.memoryPin), false);
  assert.deepEqual(readdirSync(join(f.agentDir, 'local-packages')), []);
  assert.deepEqual(readSettings(f), f.settings);
});

test('doctor rejects duplicate Brain registration, changed source, changed Nix origin and changed pin', {skip: sourceSkip}, (t) => {
  const f = fixture(t);
  installMemoryIntegrations({...f.options, mode: 'apply'});
  const selected = readSettings(f);
  const save = (settings) => writeFileSync(f.settingsFile, JSON.stringify(settings));
  save({...selected, packages: [...selected.packages, f.stockBrain]});
  assert.throws(() => installMemoryIntegrations(f.options), /Duplicate brain registrations/);
  save({...selected, extensions: [join(f.stockBrain, 'extensions/brain/index.ts')]});
  assert.throws(() => installMemoryIntegrations(f.options), /Duplicate\/direct brain extension/);
  save(selected);
  const originFile = join(f.brainPin, '.integration-origin.json');
  const origin = readFileSync(originFile, 'utf8');
  writeFileSync(originFile, origin.replace(f.stockBrain, '/nix/store/changed-build/clients/pi'));
  assert.throws(() => installMemoryIntegrations(f.options), /toolchain origin changed/);
  writeFileSync(originFile, origin);
  const file = join(f.stockBrain, 'extensions/brain/index.ts');
  chmodSync(file, 0o644);
  writeFileSync(file, readFileSync(file, 'utf8') + '\n');
  assert.throws(() => installMemoryIntegrations(f.options), /stock tree changed/);
  assert.deepEqual(readSettings(f), selected);
});

test('per-package installation leaves the other selector unchanged', {skip: sourceSkip}, (t) => {
  const f = fixture(t, {prepare: false});
  installMemoryIntegrations({...f.options, mode: 'apply', only: 'pi-memory'});
  assert.deepEqual(readSettings(f).packages[1], f.settings.packages[1]);
  assert.equal(existsSync(f.brainPin), false);
  assert.throws(() => installMemoryIntegrations({...f.options, only: 'unknown'}), /Use --only/);
});
