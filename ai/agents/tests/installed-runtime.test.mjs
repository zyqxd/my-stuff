import assert from 'node:assert/strict';
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {sdk, ai, load} from './pi-runtime.mjs';

const {discoverAgents, resolveAgentName} = await load('src/agents/agents.ts');
const {applyThinkingSuffix} = await load('src/runs/shared/pi-args.ts');
const {buildModelCandidates, isRetryableModelFailureAttempt, isContextOverflow} = await load('src/runs/shared/model-fallback.ts');
const {createForkContextResolver, forkedChildRequiresThinkingOff, resolveSubagentLaunchContext} = await load('src/shared/fork-context.ts');
const {toModelInfo} = await load('src/shared/model-info.ts');
const runtime = await sdk.ModelRuntime.create();
const models = runtime.getModels().map(toModelInfo);
const names = ['planner', 'researcher', 'worker', 'reviewer', 'oracle'];

function fixture(fn) {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-routing-'));
  mkdirSync(join(cwd, '.git'));
  mkdirSync(join(cwd, '.pi/agents'), {recursive:true});
  for (const name of names) copyFileSync(new URL(`../${name}.md`, import.meta.url), join(cwd, '.pi/agents', `${name}.md`));
  try { return fn(cwd); } finally { rmSync(cwd, {recursive:true, force:true}); }
}
function configure(cwd, subagents) {
  writeFileSync(join(cwd, '.pi/settings.json'), JSON.stringify({defaultProvider:'google', defaultModel:'gemini-3.1-pro-preview', defaultThinkingLevel:'low', subagents}));
  return discoverAgents(cwd, 'project', 'google').agents;
}

test('custom pins survive different parent/provider/default effort settings', () => fixture((cwd) => {
  const agents = configure(cwd, {defaultModel:'google/gemini-3.1-pro-preview', defaultThinking:'low'});
  const expected = {
    planner: ['anthropic/claude-fable-5-1', 'openai/gpt-6-astra', 'high'],
    researcher: ['anthropic/claude-sonnet-5', 'openai/gpt-5.6-luna', 'high'],
    worker: ['openai/gpt-5.6-sol', 'anthropic/claude-opus-5', 'high'],
    reviewer: ['anthropic/claude-opus-5', 'openai/gpt-5.6-sol', 'xhigh'],
    oracle: ['openai/gpt-6-astra', 'anthropic/claude-fable-5-1', 'high'],
  };
  for (const [name, [model, fallback, thinking]] of Object.entries(expected)) {
    const agent = agents.find((a) => a.name === name);
    assert.equal(agent.model, model);
    assert.deepEqual(agent.fallbackModels, [fallback]);
    assert.equal(agent.thinking, thinking);
    assert.equal(agent.inheritGlobalContext, true);
    assert.equal(agent.inheritProjectContext, true);
    assert.equal(agent.inheritSkills, false);
  }
  assert.equal(resolveAgentName('shaper', agents).agent.name, 'planner');
  assert.equal(resolveAgentName('design-worker', agents).agent.name, 'worker');
}));

test('0.64 settings overrides beat custom frontmatter', () => fixture((cwd) => {
  const agents = configure(cwd, {agentOverrides:{worker:{model:'openai/gpt-6-astra', thinking:'medium'}}});
  const worker = agents.find((a) => a.name === 'worker');
  assert.equal(worker.model, 'openai/gpt-6-astra');
  assert.equal(worker.thinking, 'medium');
}));

test('reviewer primary and fallback inherit xhigh and ordinary per-run effort overrides', () => fixture((cwd) => {
  const agents = configure(cwd, {defaultThinking:'low'});
  const reviewer = agents.find((a) => a.name === 'reviewer');
  const candidates = buildModelCandidates(reviewer.model, reviewer.fallbackModels, models);
  assert.deepEqual(candidates, ['anthropic/claude-opus-5', 'openai/gpt-5.6-sol']);
  assert.deepEqual(candidates.map((model) => applyThinkingSuffix(model, reviewer.thinking)), ['anthropic/claude-opus-5:xhigh', 'openai/gpt-5.6-sol:xhigh']);
  assert.deepEqual(candidates.map((model) => applyThinkingSuffix(model, 'medium')), ['anthropic/claude-opus-5:medium', 'openai/gpt-5.6-sol:medium']);
}));

test('all routed model cards support their authored efforts without silent clamping', () => {
  const expected = [
    ['openai','gpt-5.6-sol',272000,'high'],
    ['openai','gpt-5.6-sol',272000,'xhigh'],
    ['anthropic','claude-opus-5',1000000,'high'],
    ['anthropic','claude-opus-5',1000000,'xhigh'],
    ['anthropic','claude-sonnet-5',1000000,'high'],
    ['openai','gpt-5.6-luna',272000,'high'],
    ['anthropic','claude-fable-5-1',1000000,'high'],
    ['openai','gpt-6-astra',272000,'high'],
  ];
  for (const [provider, id, window, thinking] of expected) {
    const model = runtime.getModel(provider, id);
    assert.ok(model, `${provider}/${id} is in the installed catalog`);
    assert.equal(model.contextWindow, window);
    assert.equal(ai.clampThinkingLevel(model, thinking), thinking);
  }
});

test('primary and fallback order stays configured before effort resolution', () => {
  assert.deepEqual(buildModelCandidates('openai/gpt-5.6-sol', ['anthropic/claude-opus-5'], models), ['openai/gpt-5.6-sol', 'anthropic/claude-opus-5']);
  assert.deepEqual(buildModelCandidates('anthropic/claude-opus-5', ['openai/gpt-5.6-sol'], models), ['anthropic/claude-opus-5', 'openai/gpt-5.6-sol']);
  assert.deepEqual(buildModelCandidates('openai/routing-test-unavailable-model', ['anthropic/claude-opus-5'], models), ['anthropic/claude-opus-5']);
});

test('fallback retries eligible model failures, never task failures or completed tool execution', () => {
  assert.equal(isRetryableModelFailureAttempt({error:'503 service unavailable', toolCount:0, messages:[]}), true);
  assert.equal(isRetryableModelFailureAttempt({error:'bash failed (exit 1): 503 service unavailable', toolCount:1}), false);
  assert.equal(isRetryableModelFailureAttempt({error:'503 service unavailable', toolCount:1}), false);
  assert.equal(isRetryableModelFailureAttempt({error:'context length exceeded', toolCount:0}), false);
  assert.equal(isContextOverflow('context length exceeded'), true);
});

test('oracle prefers fork when a parent exists; explicit context wins over global settings', () => {
  assert.equal(resolveSubagentLaunchContext({agentDefaultContext:'fork', canUseImplicitFork:true}), 'fork');
  assert.equal(resolveSubagentLaunchContext({agentDefaultContext:'fork', canUseImplicitFork:false}), 'fresh');
  assert.equal(resolveSubagentLaunchContext({agentDefaultContext:'fresh', defaultSubagentContext:'fork', canUseImplicitFork:true}), 'fork');
  assert.equal(resolveSubagentLaunchContext({agentDefaultContext:'fork', defaultSubagentContext:'fork', explicitContext:'fresh', canUseImplicitFork:true}), 'fresh');
});

test('always-on models retain effort while off-capable and unknown models stay conservative', () => {
  for (const [model, expected] of [['anthropic/claude-fable-5-1',false], ['anthropic/claude-opus-5',false], ['anthropic/claude-sonnet-5',true], ['anthropic/claude-opus-4-5',true], ['openai/gpt-6-astra',false], ['google/gemini-3.1-pro-preview',false], ['unknown/model',true]]) {
    assert.equal(forkedChildRequiresThinkingOff(model, models), expected, model);
  }
});

test('signed Claude history preserves effort for oracle Astra primary and Fable fallback', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-fork-effort-'));
  try {
    const parent = join(cwd, 'parent.jsonl');
    writeFileSync(parent, 'exists');
    const entries = [{type:'session', id:'session', version:3}, {type:'message', id:'signed', parentId:null, message:{role:'assistant', provider:'anthropic', api:'anthropic-messages', model:'claude-fable-5-1', content:[{type:'thinking', thinking:'fixture', thinkingSignature:'signed-fixture'}, {type:'text', text:'constraint retained'}]}}];
    for (const candidate of ['openai/gpt-6-astra', 'anthropic/claude-fable-5-1']) {
      const fork = join(cwd, `${candidate.split('/')[1]}.jsonl`);
      const resolver = createForkContextResolver({getSessionFile:() => parent, getLeafId:() => 'signed'}, 'fork', {
        openSession:() => ({createBranchedSession:() => {writeFileSync(fork, entries.map((e) => JSON.stringify(e)).join('\n')); return fork;}}),
        forceThinkingOffForIndex:() => forkedChildRequiresThinkingOff(candidate, models),
      });
      await resolver.prepareSessionForIndex(0);
      assert.equal(resolver.thinkingOverrideForIndex(0), undefined, candidate);
      const persisted = readFileSync(resolver.sessionFileForIndex(0), 'utf8');
      assert.equal(persisted.includes('signed-fixture'), false, candidate);
      assert.equal(persisted.includes('constraint retained'), true, candidate);
      assert.equal(persisted.includes('thinking_level_change'), false, candidate);
    }
    assert.equal(readFileSync(parent, 'utf8'), 'exists');
  } finally { rmSync(cwd, {recursive:true, force:true}); }
});
