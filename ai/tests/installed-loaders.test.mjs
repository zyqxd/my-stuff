import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {pathToFileURL} from 'node:url';
import {installAgentLinks, repositoryDir} from '../install-agent-links.mjs';

const names = ['planner', 'researcher', 'worker', 'reviewer', 'oracle'];
const contract = readFileSync(join(repositoryDir, 'ai/AGENTS.md'), 'utf8');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'contract-loader-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const home = join(root, 'home');
  const cwd = join(root, 'project');
  mkdirSync(home);
  mkdirSync(join(cwd, '.git'), {recursive: true});
  const result = installAgentLinks({env: {HOME: home}, apply: true});
  assert.deepEqual(result.errors, []);
  return {root, home, cwd, agentDir: join(home, '.pi/agent')};
}

const piRoot = process.env.PI_PACKAGE_DIR;
const piSkip = piRoot ? false : 'PI_PACKAGE_DIR unset; installed Pi loader/rewrite not exercised';

test('installed Pi loads the symlink content once, and honors its higher-priority filenames', {skip: piSkip}, async (t) => {
  const {loadProjectContextFiles} = await import(pathToFileURL(join(piRoot, 'node_modules/@earendil-works/pi-coding-agent/dist/core/resource-loader.js')));
  const f = fixture(t);
  const loaded = () => loadProjectContextFiles({cwd: f.cwd, agentDir: f.agentDir});
  const files = loaded();
  assert.equal(files.filter((file) => file.content === contract).length, 1);
  assert.equal(files.find((file) => file.content === contract).path, join(f.agentDir, 'CLAUDE.md'));
  for (const name of ['AGENTS.override.md', 'AGENTS.md', 'AGENTS.MD']) {
    const path = join(f.agentDir, name);
    writeFileSync(path, '');
    assert.equal(loaded().some((file) => file.content === contract), false, name);
    assert.ok(loaded().some((file) => realpathSync.native(file.path) === realpathSync.native(path) && file.content === ''));
    rmSync(path);
  }
});

test('resolved Pi roles retain loaded contract through native prompt construction and child rewrite', {skip: piSkip}, async (t) => {
  const {load} = await import('../agents/tests/pi-runtime.mjs');
  const {discoverAgents} = await load('src/agents/agents.ts');
  const {rewriteSubagentPrompt} = await load('src/runs/shared/subagent-prompt-runtime.ts');
  const {loadProjectContextFiles} = await import(pathToFileURL(join(piRoot, 'node_modules/@earendil-works/pi-coding-agent/dist/core/resource-loader.js')));
  const {buildSystemPrompt} = await import(pathToFileURL(join(piRoot, 'node_modules/@earendil-works/pi-coding-agent/dist/core/system-prompt.js')));
  const f = fixture(t);
  mkdirSync(join(f.cwd, '.pi/agents'), {recursive: true});
  for (const name of names) copyFileSync(join(repositoryDir, `ai/agents/${name}.md`), join(f.cwd, `.pi/agents/${name}.md`));
  writeFileSync(join(f.cwd, 'AGENTS.md'), 'PROJECT_SCOPE_SENTINEL');
  const previous = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = f.agentDir;
  try {
    const agents = discoverAgents(f.cwd, 'project', 'google').agents;
    const contextFiles = loadProjectContextFiles({cwd: f.cwd, agentDir: f.agentDir});
    for (const name of names) {
      const agent = agents.find((entry) => entry.name === name);
      assert.ok(agent, name);
      assert.equal(agent.inheritGlobalContext, true, name);
      const prompt = buildSystemPrompt({cwd: f.cwd, customPrompt: agent.systemPrompt, contextFiles});
      assert.ok(prompt.includes(contract), 'loader content reaches the constructed prompt');
      const rewritten = rewriteSubagentPrompt(prompt, agent);
      assert.equal(rewritten.split(contract).length - 1, 1, name);
      assert.ok(rewritten.includes('PROJECT_SCOPE_SENTINEL'));
      assert.ok(rewritten.startsWith('You are a child subagent, not the parent orchestrator.'));
      const control = rewriteSubagentPrompt(prompt, {...agent, inheritGlobalContext: false});
      assert.equal(control.includes(contract), false, 'false control strips global, not merely a frontmatter test');
      assert.ok(control.includes('PROJECT_SCOPE_SENTINEL'));
    }
  } finally {
    if (previous === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previous;
  }
});

const codexHelp = spawnSync('codex', ['debug', 'prompt-input', '--help'], {encoding: 'utf8', timeout: 15000});
const codexSkip = codexHelp.status === 0 ? false : 'codex debug prompt-input unavailable; native Codex inclusion not exercised';

test('offline Codex prompt input contains the linked contract; non-empty override actually replaces it', {skip: codexSkip}, (t) => {
  const f = fixture(t);
  const env = {...process.env, HOME: f.home, CODEX_HOME: join(f.home, '.codex')};
  const prompt = () => {
    const result = spawnSync('codex', ['debug', 'prompt-input', 'Contract delivery check only.'], {cwd: f.cwd, env, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024});
    assert.equal(result.status, 0, result.stderr);
    const input = JSON.parse(result.stdout);
    return JSON.stringify(input);
  };
  const encodedContract = JSON.stringify(contract).slice(1, -1);
  assert.equal(prompt().split(encodedContract).length - 1, 1);
  writeFileSync(join(env.CODEX_HOME, 'AGENTS.override.md'), 'CODEX_OVERRIDE_SENTINEL');
  const overridden = prompt();
  assert.ok(overridden.includes('CODEX_OVERRIDE_SENTINEL'));
  assert.equal(overridden.includes(encodedContract), false);
  writeFileSync(join(env.CODEX_HOME, 'AGENTS.override.md'), ' \n');
  assert.ok(prompt().includes(encodedContract));
});
