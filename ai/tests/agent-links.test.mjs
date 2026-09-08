import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative} from 'node:path';
import {test} from 'node:test';
import {clientDirectories, inspectAgentLinks, installAgentLinks, repositoryDir} from '../install-agent-links.mjs';

const names = ['planner', 'researcher', 'worker', 'reviewer', 'oracle'];
function put(path, content = 'fixture') {
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, content);
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'agent-links-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const repoDir = join(root, 'repo');
  const home = join(root, 'home');
  mkdirSync(home);
  for (const file of ['AGENTS.md', 'statusline-command.sh', 'memory/MEMORY.md', ...names.map((name) => `agents/${name}.md`), 'skills/example/SKILL.md', 'skills/not-ready/README.md', 'extensions/a.ts', 'extensions/z/index.ts']) put(join(repoDir, 'ai', file));
  return {root, repoDir, home, env: {HOME: home}};
}
function snapshot(root) {
  const records = [];
  function walk(path) {
    const stat = lstatSync(path);
    const name = relative(root, path);
    if (stat.isSymbolicLink()) records.push([name, 'link', readlinkSync(path), stat.ino]);
    else if (stat.isDirectory()) {
      records.push([name, 'directory']);
      for (const child of readdirSync(path).sort()) walk(join(path, child));
    } else records.push([name, readFileSync(path, 'utf8')]);
  }
  walk(root);
  return records;
}
function rejectedWithoutMutation(f) {
  const before = snapshot(f.root);
  const result = installAgentLinks({...f, apply: true});
  assert.ok(result.errors.length, JSON.stringify(result));
  assert.deepEqual(snapshot(f.root), before);
  return result.errors.join('\n');
}

test('check-only is non-mutating; apply installs exactly owned links and is idempotent', (t) => {
  const f = fixture(t);
  const before = snapshot(f.root);
  const check = inspectAgentLinks(f);
  assert.deepEqual(check.errors, []);
  assert.equal(check.links.length, 11);
  assert.ok(check.links.every((link) => link.status === 'missing'));
  assert.ok(check.notes.some((note) => note.includes('no SKILL.md')));
  assert.deepEqual(snapshot(f.root), before);
  const result = installAgentLinks({...f, apply: true});
  assert.deepEqual(result.errors, []);
  for (const link of result.links) assert.equal(realpathSync(link.destination), realpathSync(link.source));
  const installed = snapshot(f.root);
  assert.ok(installAgentLinks({...f, apply: true}).links.every((link) => link.status === 'present'));
  assert.deepEqual(snapshot(f.root), installed);
});

for (const collision of ['file', 'directory', 'foreign', 'dangling', 'loop']) {
  test(`late ${collision} collision refuses all mutation, including earlier missing links`, (t) => {
    const f = fixture(t);
    const destination = join(f.home, '.pi/agent/extensions/z');
    mkdirSync(dirname(destination), {recursive: true});
    if (collision === 'file') put(destination, 'user-owned');
    if (collision === 'directory') mkdirSync(destination);
    if (collision === 'foreign') {
      put(join(f.root, 'foreign/index.ts'));
      symlinkSync(join(f.root, 'foreign'), destination);
    }
    if (collision === 'dangling') symlinkSync(join(f.root, 'gone'), destination);
    if (collision === 'loop') symlinkSync(destination, destination);
    rejectedWithoutMutation(f);
    assert.equal(existsSync(join(f.home, '.claude')), false);
  });
}

for (const problem of ['file', 'dangling', 'loop']) {
  test(`invalid ${problem} ancestor is preflighted before any mutation`, (t) => {
    const f = fixture(t);
    const path = join(f.home, '.pi');
    if (problem === 'file') put(path);
    else symlinkSync(problem === 'loop' ? path : join(f.root, 'gone'), path);
    rejectedWithoutMutation(f);
  });
}

for (const problem of ['missing', 'wrong-type', 'escaped']) {
  test(`invalid ${problem} source prevents all mutations`, (t) => {
    const f = fixture(t);
    const path = join(f.repoDir, 'ai/agents/oracle.md');
    rmSync(path);
    if (problem === 'wrong-type') mkdirSync(path);
    if (problem === 'escaped') {
      put(join(f.root, 'external.md'));
      symlinkSync(join(f.root, 'external.md'), path);
    }
    rejectedWithoutMutation(f);
  });
}

test('matching relative/chained symlinks and symlinked client parents are preserved', (t) => {
  const f = fixture(t);
  const target = join(f.root, 'client');
  mkdirSync(target);
  symlinkSync(target, join(f.home, '.claude'));
  const alias = join(f.root, 'contract-alias');
  symlinkSync(join(f.repoDir, 'ai/AGENTS.md'), alias);
  symlinkSync(relative(target, alias), join(target, 'CLAUDE.md'));
  const inode = lstatSync(join(target, 'CLAUDE.md')).ino;
  assert.deepEqual(installAgentLinks({...f, apply: true}).errors, []);
  assert.equal(lstatSync(join(target, 'CLAUDE.md')).ino, inode);
  assert.equal(readlinkSync(join(target, 'CLAUDE.md')), relative(target, alias));
});

test('case aliases on case-insensitive filesystems resolve to the same source identity', (t) => {
  const f = fixture(t);
  const aliasTarget = join(f.repoDir, 'ai/agents.MD');
  if (!existsSync(aliasTarget)) { t.skip('case-sensitive filesystem'); return; }
  mkdirSync(join(f.home, '.claude'));
  const destination = join(f.home, '.claude/CLAUDE.md');
  symlinkSync(aliasTarget, destination);
  const inode = lstatSync(destination).ino;
  assert.deepEqual(installAgentLinks({...f, apply: true}).errors, []);
  assert.equal(lstatSync(destination).ino, inode);
});

test('unmanaged skills, extensions and settings survive installation', (t) => {
  const f = fixture(t);
  const paths = ['.claude/skills/personal/SKILL.md', '.codex/config.toml', '.pi/agent/extensions/external/index.ts', '.pi/agent/settings.json'];
  for (const path of paths) put(join(f.home, path), 'keep-exactly');
  assert.deepEqual(installAgentLinks({...f, apply: true}).errors, []);
  for (const path of paths) assert.equal(readFileSync(join(f.home, path), 'utf8'), 'keep-exactly');
});

test('all client overrides are honored; Pi memory retains its independent HOME default', (t) => {
  const f = fixture(t);
  assert.equal(clientDirectories({...f.env, PI_CODING_AGENT_DIR: join(f.root, 'pi')}).memory, join(f.home, '.pi/agent/memory'));
  const env = {...f.env, CLAUDE_CONFIG_DIR: join(f.root, 'claude'), CODEX_HOME: join(f.root, 'codex'), PI_CODING_AGENT_DIR: join(f.root, 'pi'), PI_MEMORY_DIR: join(f.root, 'memory')};
  const result = installAgentLinks({...f, env, apply: true});
  assert.deepEqual(result.errors, []);
  assert.equal(realpathSync(env.PI_MEMORY_DIR), realpathSync(join(f.repoDir, 'ai/memory')));
  for (const dir of [env.CLAUDE_CONFIG_DIR, env.CODEX_HOME, env.PI_CODING_AGENT_DIR]) assert.ok(existsSync(join(dir, 'skills/example')));
  assert.deepEqual(readdirSync(f.home), []);
});

for (const variable of ['HOME', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'PI_CODING_AGENT_DIR', 'PI_MEMORY_DIR']) {
  test(`empty and relative ${variable} fail explicitly`, (t) => {
    const f = fixture(t);
    for (const value of ['', '~/client', 'relative/client']) {
      const errors = rejectedWithoutMutation({...f, env: {...f.env, [variable]: value}});
      assert.ok(errors.includes(variable));
    }
  });
}

test('unset HOME fails rather than falling back to the live user home', (t) => {
  const f = fixture(t);
  assert.match(rejectedWithoutMutation({...f, env: {}}), /HOME/);
});

test('client aliases targeting one directory coalesce identical destinations', (t) => {
  const f = fixture(t);
  const target = join(f.root, 'shared');
  mkdirSync(target);
  symlinkSync(target, join(f.root, 'alias'));
  const env = {...f.env, CLAUDE_CONFIG_DIR: target, CODEX_HOME: join(f.root, 'alias')};
  assert.deepEqual(installAgentLinks({...f, env, apply: true}).errors, []);
  const before = snapshot(f.root);
  assert.deepEqual(installAgentLinks({...f, env, apply: true}).errors, []);
  assert.deepEqual(snapshot(f.root), before);
});

test('conflicting and nested destination aliases fail preflight', (t) => {
  const f = fixture(t);
  for (const path of ['.pi/agent/agents', '.pi/agent/agents/nested']) {
    assert.match(rejectedWithoutMutation({...f, env: {...f.env, PI_MEMORY_DIR: join(f.home, path)}}), /Conflicting|Overlapping/);
  }
});

for (const alias of ['client-roots', 'role-directory', 'nested-role-directory']) {
  test(`unresolved case-only ${alias} collisions reject before any mutation`, (t) => {
    const f = fixture(t);
    const overrides = alias === 'client-roots'
      ? {CLAUDE_CONFIG_DIR: join(f.root, 'Shared'), CODEX_HOME: join(f.root, 'shared')}
      : {PI_MEMORY_DIR: join(f.home, '.pi/agent', alias === 'role-directory' ? 'AGENTS' : 'AGENTS/nested')};
    assert.match(rejectedWithoutMutation({...f, env: {...f.env, ...overrides}}), /case/i);
  });
}

test('overrides cannot create links inside the source repository', (t) => {
  const f = fixture(t);
  assert.match(rejectedWithoutMutation({...f, env: {...f.env, CODEX_HOME: join(f.repoDir, 'config')}}), /source repository/);
});

for (const [directory, file, content] of [
  ['.codex', 'AGENTS.override.md', 'override'],
  ['.pi/agent', 'AGENTS.override.md', ''],
  ['.pi/agent', 'AGENTS.md', ''],
  ['.pi/agent', 'AGENTS.MD', 'override'],
]) {
  test(`${directory}/${file} shadows the native contract even when its destination is absent`, (t) => {
    const f = fixture(t);
    put(join(f.home, directory, file), content);
    assert.match(rejectedWithoutMutation(f), /shadow/);
  });
}

test('empty Codex override is ignored; same-source higher-priority Pi alias is accepted', (t) => {
  const f = fixture(t);
  put(join(f.home, '.codex/AGENTS.override.md'), ' \n');
  mkdirSync(join(f.home, '.pi/agent'), {recursive: true});
  symlinkSync(join(f.repoDir, 'ai/AGENTS.md'), join(f.home, '.pi/agent/AGENTS.md'));
  const result = installAgentLinks({...f, apply: true});
  assert.deepEqual(result.errors, []);
  assert.ok(result.notes.some((note) => note.includes('same contract')));
});

test('dangling global override is diagnosed before mutation', (t) => {
  const f = fixture(t);
  mkdirSync(join(f.home, '.codex'));
  symlinkSync(join(f.root, 'gone'), join(f.home, '.codex/AGENTS.override.md'));
  rejectedWithoutMutation(f);
});

test('CLI defaults to check, resolves source independently of cwd, and reports exit status', (t) => {
  const f = fixture(t);
  cpSync(join(repositoryDir, 'ai/install-agent-links.mjs'), join(f.repoDir, 'ai/install-agent-links.mjs'));
  const script = join(f.repoDir, 'ai/install-agent-links.mjs');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {cwd: f.root, env: f.env, encoding: 'utf8'});
  const before = snapshot(f.root);
  assert.equal(run().status, 1);
  assert.deepEqual(snapshot(f.root), before);
  assert.equal(run('--apply').status, 0);
  assert.equal(run('--check').status, 0);
  assert.equal(run('--invalid').status, 2);
  assert.equal(realpathSync(join(f.home, '.claude/CLAUDE.md')), realpathSync(join(f.repoDir, 'ai/AGENTS.md')));
});

test('CLI executes check and apply through a case-aliased script path', (t) => {
  const f = fixture(t);
  cpSync(join(repositoryDir, 'ai/install-agent-links.mjs'), join(f.repoDir, 'ai/install-agent-links.mjs'));
  const script = join(f.repoDir, 'AI/install-agent-links.mjs');
  if (!existsSync(script)) return t.skip('Case-sensitive filesystem; case-aliased entrypoint unavailable');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], {cwd: f.root, env: f.env, encoding: 'utf8'});
  const before = snapshot(f.root);
  const check = run('--check');
  assert.equal(check.status, 1, check.stderr);
  assert.match(check.stdout, /missing:/);
  assert.deepEqual(snapshot(f.root), before);
  assert.equal(run('--apply').status, 0);
  for (const link of inspectAgentLinks(f).links) assert.equal(link.status, 'present');
  assert.match(run('--check').stdout, /present:/);
});

test('setup rejects overridden directories without applying links or installing packages', (t) => {
  const f = fixture(t);
  const before = snapshot(f.root);
  for (const args of [[], ['agents']]) {
    const result = spawnSync('/bin/bash', [join(repositoryDir, 'setup.sh'), ...args], {cwd: f.root, env: {...f.env, CODEX_HOME: join(f.root, 'custom-codex')}, encoding: 'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /require default client directories/);
    assert.deepEqual(snapshot(f.root), before);
  }
});

test('full setup bootstraps Node via Brewfile before calling the link installer', (t) => {
  const f = fixture(t);
  const bin = join(f.root, 'bin');
  const trace = join(f.root, 'trace');
  const nodeStub = join(f.root, 'node-stub');
  mkdirSync(bin);
  symlinkSync('/usr/bin/dirname', join(bin, 'dirname'));
  put(nodeStub, '#!/bin/bash\nprintf "node %s %s\\n" "$1" "$2" >> "$TEST_TRACE"\nexit 77\n');
  put(join(bin, 'brew'), '#!/bin/bash\nprintf "brew %s %s\\n" "$1" "$2" >> "$TEST_TRACE"\n/bin/cp "$TEST_NODE_STUB" "$TEST_BIN/node"\n/bin/chmod +x "$TEST_BIN/node"\n');
  chmodSync(join(bin, 'brew'), 0o755);
  const env = {...f.env, PATH: bin, TEST_TRACE: trace, TEST_NODE_STUB: nodeStub, TEST_BIN: bin};
  assert.equal(spawnSync('/bin/bash', ['-c', 'command -v node'], {env}).status, 1);
  const result = spawnSync('/bin/bash', [join(repositoryDir, 'setup.sh')], {cwd: f.root, env, encoding: 'utf8'});
  assert.equal(result.status, 77, result.stderr);
  assert.deepEqual(readFileSync(trace, 'utf8').trim().split('\n'), [
    'brew bundle --file=./Brewfile',
    `node ${repositoryDir}/ai/install-agent-links.mjs --apply`,
  ]);
  assert.deepEqual(readdirSync(f.home), []);
});

test('agents-only setup invokes the link installer before package setup', (t) => {
  const f = fixture(t);
  const bin = join(f.root, 'bin');
  const trace = join(f.root, 'trace');
  mkdirSync(bin);
  symlinkSync('/usr/bin/dirname', join(bin, 'dirname'));
  put(join(bin, 'node'), '#!/bin/bash\nprintf "node %s %s\\n" "$1" "$2" >> "$TEST_TRACE"\nexit 77\n');
  put(join(bin, 'pi'), '#!/bin/bash\nprintf "unexpected package setup\\n" >> "$TEST_TRACE"\nexit 78\n');
  chmodSync(join(bin, 'node'), 0o755);
  chmodSync(join(bin, 'pi'), 0o755);
  const result = spawnSync('/bin/bash', [join(repositoryDir, 'setup.sh'), 'agents'], {
    cwd: f.root, env: {...f.env, PATH: bin, TEST_TRACE: trace}, encoding: 'utf8',
  });
  assert.equal(result.status, 77, result.stderr);
  assert.equal(readFileSync(trace, 'utf8').trim(), `node ${repositoryDir}/ai/install-agent-links.mjs --apply`);
  assert.deepEqual(readdirSync(f.home), []);
});
