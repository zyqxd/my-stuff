import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {test} from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the shared contract is non-empty and fits the default native document budget', () => {
  const contract = read('../AGENTS.md');
  assert.ok(contract.trim());
  assert.ok(Buffer.byteLength(contract) < 32 * 1024);
  for (const path of ['../CLAUDE.md', '../CODEX.md', '../../AGENTS.md']) assert.equal(existsSync(new URL(path, import.meta.url)), false);
});

test('behavioral scenarios have unique identities and observable outcomes', () => {
  const cases = JSON.parse(read('../evals/working-contract.json'));
  assert.ok(Array.isArray(cases) && cases.length > 0);
  assert.equal(new Set(cases.map((entry) => entry.id)).size, cases.length);
  for (const entry of cases) {
    for (const key of ['id', 'role', 'context', 'prompt']) assert.ok(typeof entry[key] === 'string' && entry[key].trim());
    for (const observations of [entry.observe, ...(entry.followUp ? [entry.followUpObserve] : [])]) {
      assert.ok(Array.isArray(observations) && observations.length > 0);
      assert.ok(observations.every((check) => typeof check === 'string' && check.trim()));
    }
  }
});
