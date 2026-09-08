import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const expected = {
  planner: ['anthropic/claude-fable-5-1', 'openai/gpt-5.6-sol'],
  researcher: ['anthropic/claude-sonnet-5', 'anthropic/claude-opus-5'],
  worker: ['openai/gpt-6-astra', 'openai/gpt-5.6-sol'],
  reviewer: ['openai/gpt-6-astra', 'anthropic/claude-opus-5'],
  oracle: ['anthropic/claude-fable-5-1', 'google/gemini-3.1-pro-preview'],
};

function agent(name) {
  const text = readFileSync(new URL(`../${name}.md`, import.meta.url), 'utf8');
  const frontmatter = text.split('---')[1];
  return Object.fromEntries(frontmatter.trim().split('\n').map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon), line.slice(colon + 1).trim()];
  }));
}

for (const [name, [model, fallback]] of Object.entries(expected)) {
  test(`${name} pins its approved provider, model, high effort and availability fallback`, () => {
    const config = agent(name);
    assert.equal(config.model, model);
    assert.equal(config.thinking, 'high');
    assert.equal(config.fallbackModels, fallback);
    assert.equal(config.extensions, undefined);
    assert.equal(config.output, undefined);
  });
}

test('all roles explicitly inherit the shared global contract and project context', () => {
  for (const name of Object.keys(expected)) {
    assert.equal(agent(name).inheritGlobalContext, 'true');
    assert.equal(agent(name).inheritProjectContext, 'true');
    assert.equal(agent(name).inheritSkills, 'false');
  }
});

test('oracle retains fork and read-only acceptance; worker stays fresh', () => {
  assert.equal(agent('oracle').defaultContext, 'fork');
  assert.equal(agent('worker').defaultContext, 'fresh');
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
