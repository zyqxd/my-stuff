import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, lstatSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const source = fileURLToPath(new URL('./brain/CLAUDE.md', import.meta.url));
const preimageHash = 'b8d608d8730665bbe3207744b91ddc5166a8584596b2304f7596f4bc1ec43994';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function installBrainRules({destination = join(homedir(), '.brain/memory-bank/personal/CLAUDE.md'), apply = false} = {}) {
  assert.ok(lstatSync(destination).isFile(), 'Personal rules must be a regular file, not a symlink');
  const original = readFileSync(destination);
  const desired = readFileSync(source);
  if (original.equals(desired)) return 'Personal rules match ai/brain/CLAUDE.md';
  assert.equal(hash(original), preimageHash, 'Personal rules drifted from the reviewed preimage; reconcile in my-stuff before adoption');
  if (!apply) return 'Personal rules ready for guarded adoption; run --apply only after installation approval';
  const backup = `${destination}.before-my-stuff`;
  if (existsSync(backup)) {
    assert.ok(lstatSync(backup).isFile(), 'Personal rules backup must be a regular file');
    assert.equal(hash(readFileSync(backup)), preimageHash, 'Personal rules backup differs; refusing to overwrite');
  } else {
    writeFileSync(backup, original, {flag: 'wx', mode: 0o600});
  }
  const staging = mkdtempSync(join(dirname(destination), '.adopt-rules-'));
  try {
    const file = join(staging, 'CLAUDE.md');
    writeFileSync(file, desired, {mode: lstatSync(destination).mode & 0o777});
    assert.deepEqual(readFileSync(destination), original, 'Personal rules changed during adoption; original preserved');
    renameSync(file, destination);
  } finally {
    rmSync(staging, {recursive: true, force: true});
  }
  return `Adopted ${source}; preimage retained at ${backup}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--apply'), 'Usage: node ai/install-brain-rules.mjs [--apply]');
    console.log(installBrainRules({apply: process.argv[2] === '--apply'}));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
