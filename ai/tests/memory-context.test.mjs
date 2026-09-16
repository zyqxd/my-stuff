import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import {fixture, repository, sourceSkip} from './memory-fixtures.mjs';

const skip = sourceSkip || (!process.env.PI_PACKAGE_DIR && 'PI_PACKAGE_DIR unset; actual Pi hooks not exercised');
for (const child of [false, true]) {
  test(`actual loaded ${child ? 'child' : 'parent'} hooks preserve targeted context and explicit tools without lifecycle writes/models`, {skip}, async (t) => {
    const {subagentsRoot} = await import('../agents/tests/pi-runtime.mjs');
    const f = fixture(t);
    const settings = JSON.parse(readFileSync(f.settingsFile, 'utf8'));
    settings.packages.push(subagentsRoot);
    writeFileSync(f.settingsFile, JSON.stringify(settings));
    const env = {...process.env, HOME: f.home, PI_CODING_AGENT_DIR: f.agentDir, PI_OFFLINE:'1', MEMORY_TEST_FIXTURE: JSON.stringify(f)};
    if (child) env.PI_SUBAGENT_CHILD = '1';
    else delete env.PI_SUBAGENT_CHILD;
    const result = spawnSync(process.execPath, [join(repository, 'ai/tests/memory-runtime-probe.mjs')], {cwd: f.cwd, env, encoding:'utf8', timeout:120000, maxBuffer:4*1024*1024});
    assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
    t.diagnostic(result.stdout.trim());
  });
}
