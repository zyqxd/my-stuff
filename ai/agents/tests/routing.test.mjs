import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const expected = {
  planner: {model: 'anthropic/claude-fable-5-1', fallback: 'openai/gpt-6-astra', thinking: 'high', tier: 'premium'},
  researcher: {model: 'anthropic/claude-sonnet-5', fallback: 'openai/gpt-5.6-luna', thinking: 'high', tier: 'cheap'},
  worker: {model: 'openai/gpt-5.6-sol', fallback: 'anthropic/claude-opus-5', thinking: 'high', tier: 'high'},
  reviewer: {model: 'anthropic/claude-opus-5', fallback: 'openai/gpt-5.6-sol', thinking: 'xhigh', tier: 'high'},
  oracle: {model: 'openai/gpt-6-astra', fallback: 'anthropic/claude-fable-5-1', thinking: 'high', tier: 'premium'},
};

function agent(name) {
  const text = readFileSync(new URL(`../${name}.md`, import.meta.url), 'utf8');
  const frontmatter = text.split('---')[1];
  return Object.fromEntries(frontmatter.trim().split('\n').map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon), line.slice(colon + 1).trim()];
  }));
}

for (const [name, route] of Object.entries(expected)) {
  test(`${name} pins its approved provider, model, effort and availability fallback`, () => {
    const config = agent(name);
    assert.equal(config.model, route.model);
    assert.equal(config.thinking, route.thinking);
    assert.equal(config.fallbackModels, route.fallback);
    assert.equal(config.extensions, undefined);
    assert.equal(config.output, undefined);
  });
}

test('every configured route has one cross-provider same-tier fallback', () => {
  const expectedTierPairs = {
    premium: new Set(['anthropic/claude-fable-5-1', 'openai/gpt-6-astra']),
    high: new Set(['anthropic/claude-opus-5', 'openai/gpt-5.6-sol']),
    cheap: new Set(['anthropic/claude-sonnet-5', 'openai/gpt-5.6-luna']),
  };
  for (const [name, route] of Object.entries(expected)) {
    const config = agent(name);
    const fallback = config.fallbackModels.replace(/:(?:high|xhigh)$/, '');
    assert.notEqual(config.model.split('/')[0], fallback.split('/')[0]);
    assert.deepEqual(new Set([config.model, fallback]), expectedTierPairs[route.tier]);
  }
});

test('reviewer stores one unsuffixed fallback so effective effort can be inherited', () => {
  assert.equal(agent('reviewer').thinking, 'xhigh');
  assert.equal(agent('reviewer').fallbackModels, 'openai/gpt-5.6-sol');
});

test('all roles explicitly inherit the shared global contract and project context', () => {
  for (const name of Object.keys(expected)) {
    assert.equal(agent(name).inheritGlobalContext, 'true');
    assert.equal(agent(name).inheritProjectContext, 'true');
    assert.equal(agent(name).inheritSkills, 'false');
  }
});

test('contexts, aliases and read-only acceptance remain unchanged', () => {
  assert.equal(agent('oracle').defaultContext, 'fork');
  assert.equal(agent('worker').defaultContext, 'fresh');
  for (const name of ['planner', 'researcher', 'reviewer']) assert.equal(agent(name).defaultContext, undefined);
  assert.equal(agent('planner').aliases, 'shaper, scoper');
  assert.equal(agent('worker').aliases, 'developer, coder, implementer, develop, design-worker, figma-worker');
  for (const name of ['oracle', 'reviewer', 'researcher']) {
    assert.equal(agent(name).acceptanceRole, 'read-only');
    assert.equal(agent(name).completionGuard, 'false');
  }
});

test('the five roles retain their tool boundaries', () => {
  const expectedTools = {
    planner: 'read, grep, find, ls, bash, write, contact_supervisor',
    researcher: 'read, grep, find, ls, bash, write, web_search, fetch_content, get_search_content',
    worker: 'read, grep, find, ls, bash, edit, write, contact_supervisor',
    reviewer: 'read, grep, find, ls, bash',
    oracle: 'read, grep, find, ls, bash',
  };
  for (const [name, tools] of Object.entries(expectedTools)) assert.equal(agent(name).tools, tools);
});
