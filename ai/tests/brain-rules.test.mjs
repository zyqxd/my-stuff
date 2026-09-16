import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {installBrainRules} from '../install-brain-rules.mjs';

const bankRules = join(homedir(), '.brain/memory-bank/personal/CLAUDE.md');
const preimage = [process.env.BRAIN_PERSONAL_RULES_PREIMAGE, `${bankRules}.before-my-stuff`, bankRules].filter(Boolean).find((path) => existsSync(path) && createHash('sha256').update(readFileSync(path)).digest('hex') === 'b8d608d8730665bbe3207744b91ddc5166a8584596b2304f7596f4bc1ec43994');

test('personal rules adoption keeps a preimage, refuses drift/symlinks, and preserves unrelated personal content', {skip: !preimage && 'Reviewed personal rules preimage unavailable'}, (t) => {
  const root = mkdtempSync(join(tmpdir(), 'brain-rules-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const destination = join(root, 'CLAUDE.md');
  const original = readFileSync(preimage);
  writeFileSync(destination, original);
  assert.match(installBrainRules({destination}), /ready for guarded adoption/);
  assert.deepEqual(readFileSync(destination), original);
  installBrainRules({destination, apply: true});
  const managed = readFileSync(new URL('../brain/CLAUDE.md', import.meta.url));
  assert.deepEqual(readFileSync(destination), managed);
  assert.deepEqual(readFileSync(`${destination}.before-my-stuff`), original);
  assert.match(installBrainRules({destination, apply: true}), /match/);
  const preservedSections = ['## Personal Information', '## Technical Role & Expertise', '## knowledge/', '## activeProjects.md'];
  const section = (text, heading) => text.slice(text.indexOf(heading)).split(/\n(?=#{1,2} )/).slice(0, 1).join('\n');
  for (const heading of preservedSections) assert.equal(section(managed.toString(), heading), section(original.toString(), heading));
  writeFileSync(destination, 'Concurrent rule edit');
  assert.throws(() => installBrainRules({destination, apply: true}), /drifted/);
  assert.equal(readFileSync(destination, 'utf8'), 'Concurrent rule edit');
  const link = join(root, 'link.md');
  symlinkSync(destination, link);
  assert.throws(() => installBrainRules({destination: link, apply: true}), /regular file/);
});
