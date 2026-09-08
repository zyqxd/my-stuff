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
  const expected = {planner:'anthropic/claude-fable-5-1', researcher:'anthropic/claude-sonnet-5', worker:'openai/gpt-6-astra', reviewer:'openai/gpt-6-astra', oracle:'anthropic/claude-fable-5-1'};
  for (const [name, model] of Object.entries(expected)) {
    const agent = agents.find((a) => a.name === name);
    assert.equal(agent.model, model);
    assert.equal(agent.thinking, 'high');
  }
  assert.equal(resolveAgentName('shaper', agents).agent.name, 'planner');
  assert.equal(resolveAgentName('design-worker', agents).agent.name, 'worker');
}));

test('0.64 settings overrides beat custom frontmatter', () => fixture((cwd) => {
  const agents = configure(cwd, {agentOverrides:{worker:{model:'openai/gpt-5.6-sol', thinking:'medium'}}});
  const worker = agents.find((a) => a.name === 'worker');
  assert.equal(worker.model, 'openai/gpt-5.6-sol');
  assert.equal(worker.thinking, 'medium');
}));

test('explicit model suffix wins over high; model-only override inherits high', () => {
  assert.equal(applyThinkingSuffix('openai/gpt-5.6-sol:medium', 'high'), 'openai/gpt-5.6-sol:medium');
  assert.equal(applyThinkingSuffix('openai/gpt-5.6-sol', 'high'), 'openai/gpt-5.6-sol:high');
});

test('base Astra and Sol are 272K; Claude defaults are 1M; high remains supported', () => {
  for (const [provider, id, window] of [['openai','gpt-6-astra',272000], ['openai','gpt-5.6-sol',272000], ['anthropic','claude-fable-5-1',1000000], ['anthropic','claude-sonnet-5',1000000]]) {
    const model = runtime.getModel(provider, id);
    assert.ok(model, `${provider}/${id} is in the installed catalog`);
    assert.equal(model.contextWindow, window);
    assert.equal(ai.clampThinkingLevel(model, 'high'), 'high');
  }
});

test('worker primary and fallback stay ordered; unavailable configured primary selects Sol', () => {
  assert.deepEqual(buildModelCandidates('openai/gpt-6-astra', ['openai/gpt-5.6-sol'], models), ['openai/gpt-6-astra', 'openai/gpt-5.6-sol']);
  assert.deepEqual(buildModelCandidates('openai/routing-test-unavailable-model', ['openai/gpt-5.6-sol'], models), ['openai/gpt-5.6-sol']);
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

test('signed Claude fork preserves requested effort without retaining unsafe signatures', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'pi-fork-effort-'));
  try {
    const parent = join(cwd, 'parent.jsonl');
    const fork = join(cwd, 'fork.jsonl');
    writeFileSync(parent, 'exists');
    const entries = [{type:'session', id:'session', version:3}, {type:'message', id:'signed', parentId:null, message:{role:'assistant', provider:'anthropic', api:'anthropic-messages', model:'claude-fable-5-1', content:[{type:'thinking', thinking:'fixture', thinkingSignature:'signed-fixture'}, {type:'text', text:'constraint retained'}]}}];
    const resolver = createForkContextResolver({getSessionFile:() => parent, getLeafId:() => 'signed'}, 'fork', {
      openSession:() => ({createBranchedSession:() => {writeFileSync(fork, entries.map((e) => JSON.stringify(e)).join('\n')); return fork;}}),
      forceThinkingOffForIndex:() => forkedChildRequiresThinkingOff('anthropic/claude-fable-5-1', models),
    });
    await resolver.prepareSessionForIndex(0);
    assert.equal(resolver.thinkingOverrideForIndex(0), undefined);
    const persisted = readFileSync(resolver.sessionFileForIndex(0), 'utf8');
    assert.equal(persisted.includes('signed-fixture'), false);
    assert.equal(persisted.includes('constraint retained'), true);
    assert.equal(persisted.includes('thinking_level_change'), false);
    assert.equal(readFileSync(parent, 'utf8'), 'exists');
  } finally { rmSync(cwd, {recursive:true, force:true}); }
});
