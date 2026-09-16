import assert from 'node:assert/strict';
import {chmodSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {basename, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {installMemoryIntegrations, pins} from '../install-memory-integrations.mjs';

export const repository = fileURLToPath(new URL('../../', import.meta.url));
export const memorySource = process.env.MEMORY_PACKAGE_DIR || join(homedir(), '.pi/agent/npm/node_modules/pi-memory');
export const brainSource = process.env.BRAIN_PI_PACKAGE_DIR || join(homedir(), '.local/state/tec/toolchain/user_profile/share/brain/clients/pi');
export const sourceSkip = [memorySource, brainSource].every(existsSync) ? false : 'Installed stock pi-memory/Brain sources unavailable';
export function put(file, content) {
  mkdirSync(dirname(file), {recursive: true});
  writeFileSync(file, content);
}
export function independentCopy(source, destination, root) {
  cpSync(realpathSync(source), destination, {recursive: true, dereference: true, filter: (path) => basename(path) !== 'node_modules'});
  assert.ok(lstatSync(destination).isDirectory());
  assert.ok(realpathSync(destination).startsWith(`${realpathSync(root)}/`));
  assert.notEqual(realpathSync(destination), realpathSync(source));
  function writableDirectories(directory) {
    chmodSync(directory, 0o700);
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (lstatSync(path).isDirectory()) writableDirectories(path);
    }
  }
  writableDirectories(destination);
}
export function fixture(t, {prepare = true} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'memory-integration-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const home = join(root, 'home');
  const agentDir = join(home, '.pi/agent');
  const cwd = join(root, 'project');
  mkdirSync(join(cwd, '.git'), {recursive: true});
  const stockMemory = join(root, 'stock-memory');
  const stockBrain = join(root, 'stock-brain');
  independentCopy(memorySource, stockMemory, root);
  independentCopy(brainSource, stockBrain, root);
  const memoryLink = join(root, 'npm-memory-link');
  symlinkSync(stockMemory, memoryLink);
  const settingsFile = join(agentDir, 'settings.json');
  const settings = {
    defaultProvider: 'openai', defaultModel: 'gpt-6-astra', defaultThinkingLevel: 'high',
    subagents: {agentOverrides: {scout: {disabled: true}}},
    packages: ['npm:pi-memory', {source: stockBrain, skills: ['skills/**'], themes: []}, 'npm:unrelated-package'],
  };
  put(settingsFile, JSON.stringify(settings, null, 2) + '\n');
  const options = {agentDir, memorySource: memoryLink, brainSource: stockBrain};
  if (prepare) installMemoryIntegrations({...options, mode: 'prepare'});
  return {root, home, cwd, agentDir, settingsFile, settings, options, stockMemory, stockBrain,
    memoryPin: join(agentDir, 'local-packages', pins[0].target),
    brainPin: join(agentDir, 'local-packages', pins[1].target),
  };
}
