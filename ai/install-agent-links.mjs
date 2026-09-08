import {accessSync, constants, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync} from 'node:fs';
import {basename, dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const repositoryDir = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), '..'));

function entry(path) {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function inside(path, directory) {
  return path === directory || path.startsWith(`${directory}${sep}`);
}

function directoryIdentity(path) {
  if (entry(path)) {
    if (!statSync(path).isDirectory()) throw new Error(`Not a directory: ${path}`);
    return realpathSync.native(path);
  }
  return join(directoryIdentity(dirname(path)), basename(path));
}

export function clientDirectories(env) {
  const absolute = (name, fallback) => {
    const value = env[name] === undefined ? fallback : env[name];
    if (!value || !isAbsolute(value)) throw new Error(`${name} must be a non-empty absolute path (expand ~ in the shell).`);
    return resolve(value);
  };
  const home = absolute('HOME');
  return {
    claude: absolute('CLAUDE_CONFIG_DIR', join(home, '.claude')),
    codex: absolute('CODEX_HOME', join(home, '.codex')),
    pi: absolute('PI_CODING_AGENT_DIR', join(home, '.pi/agent')),
    memory: absolute('PI_MEMORY_DIR', join(home, '.pi/agent/memory')),
  };
}

export function inspectAgentLinks({env = process.env, repoDir = repositoryDir} = {}) {
  const result = {links: [], errors: [], notes: [], directories: undefined};
  let root;
  let dirs;
  try {
    root = realpathSync.native(repoDir);
    dirs = clientDirectories(env);
    result.directories = dirs;
  } catch (error) {
    result.errors.push(error.message);
    return result;
  }
  const source = (path, kind) => {
    const full = join(root, path);
    const stat = statSync(full);
    if (!(kind === 'directory' ? stat.isDirectory() : stat.isFile())) throw new Error(`Expected ${kind}: ${full}`);
    if (!inside(realpathSync.native(full), root)) throw new Error(`Source escapes repository: ${full}`);
    accessSync(full, constants.R_OK);
    return full;
  };
  const attempt = (fn) => {
    try { fn(); } catch (error) { result.errors.push(error.message); }
  };
  const add = (path, kind, destination) => attempt(() => {
    result.links.push({source: source(path, kind), destination, status: 'missing'});
  });
  for (const [dir, name] of [[dirs.claude, 'CLAUDE.md'], [dirs.codex, 'AGENTS.md'], [dirs.pi, 'CLAUDE.md']]) {
    add('ai/AGENTS.md', 'file', join(dir, name));
  }
  add('ai/memory', 'directory', dirs.memory);
  add('ai/agents', 'directory', join(dirs.pi, 'agents'));
  add('ai/statusline-command.sh', 'file', join(dirs.claude, 'statusline-command.sh'));
  for (const file of ['ai/memory/MEMORY.md', ...['planner', 'researcher', 'worker', 'reviewer', 'oracle'].map((name) => `ai/agents/${name}.md`)]) {
    attempt(() => source(file, 'file'));
  }
  attempt(() => {
    const skills = source('ai/skills', 'directory');
    for (const name of readdirSync(skills).sort()) {
      attempt(() => {
        const skill = join(skills, name);
        if (!statSync(skill).isDirectory()) return;
        if (!entry(join(skill, 'SKILL.md'))) {
          result.notes.push(`Not installable (no SKILL.md): ai/skills/${name}`);
          return;
        }
        source(`ai/skills/${name}/SKILL.md`, 'file');
        for (const dir of [dirs.claude, dirs.pi, dirs.codex]) add(`ai/skills/${name}`, 'directory', join(dir, 'skills', name));
      });
    }
  });
  attempt(() => {
    const extensions = source('ai/extensions', 'directory');
    for (const name of readdirSync(extensions).sort()) {
      attempt(() => {
        const stat = statSync(join(extensions, name));
        if (stat.isFile()) add(`ai/extensions/${name}`, 'file', join(dirs.pi, 'extensions', name));
        else if (stat.isDirectory() && entry(join(extensions, name, 'index.ts'))) {
          source(`ai/extensions/${name}/index.ts`, 'file');
          add(`ai/extensions/${name}`, 'directory', join(dirs.pi, 'extensions', name));
        } else result.notes.push(`Not installable (no extension entry): ai/extensions/${name}`);
      });
    }
  });

  for (const link of result.links) attempt(() => {
    const parent = directoryIdentity(dirname(link.destination));
    link.identity = join(parent, basename(link.destination));
    if (inside(link.identity, root)) throw new Error(`Destination would write inside the source repository: ${link.destination}`);
    const current = entry(link.destination);
    if (current) {
      if (!current.isSymbolicLink()) throw new Error(`Collision (not a symlink): ${link.destination}`);
      if (realpathSync.native(link.destination) !== realpathSync.native(link.source)) throw new Error(`Foreign symlink: ${link.destination}`);
      link.status = 'present';
    } else {
      let ancestor = dirname(link.destination);
      while (!entry(ancestor)) ancestor = dirname(ancestor);
      accessSync(ancestor, constants.W_OK | constants.X_OK);
    }
  });

  for (let i = 0; i < result.links.length; i++) {
    const a = result.links[i];
    if (!a.identity) continue;
    for (const b of result.links.slice(i + 1)) {
      if (!b.identity) continue;
      if (a.identity === b.identity) {
        if (realpathSync.native(a.source) !== realpathSync.native(b.source)) result.errors.push(`Conflicting destinations: ${a.destination} and ${b.destination}`);
        else b.aliasOf = a.destination;
      } else if (inside(a.identity, b.identity) || inside(b.identity, a.identity)) {
        result.errors.push(`Overlapping destinations: ${a.destination} and ${b.destination}`);
      } else if (inside(a.identity.toLowerCase(), b.identity.toLowerCase()) || inside(b.identity.toLowerCase(), a.identity.toLowerCase())) {
        result.errors.push(`Ambiguous case-only destinations: ${a.destination} and ${b.destination}`);
      }
    }
  }

  for (const [dir, name, nonEmptyOnly] of [
    [dirs.codex, 'AGENTS.override.md', true],
    [dirs.pi, 'AGENTS.override.md', false],
    [dirs.pi, 'AGENTS.md', false],
    [dirs.pi, 'AGENTS.MD', false],
  ]) attempt(() => {
    const path = join(dir, name);
    if (!entry(path)) return;
    if (!statSync(path).isFile()) throw new Error(`Unexpected global instruction entry: ${path}`);
    if (nonEmptyOnly && !readFileSync(path, 'utf8').trim()) return;
    if (realpathSync.native(path) === realpathSync.native(join(root, 'ai/AGENTS.md'))) {
      result.notes.push(`Higher-priority alias loads the same contract: ${path}`);
    } else throw new Error(`Global instructions shadow the contract: ${path}`);
  });
  result.notes.push('Global link check only: project/nested instructions, client flags/settings, plugins and model adherence are not audited.');
  return result;
}

export function installAgentLinks(options = {}) {
  const result = inspectAgentLinks(options);
  if (result.errors.length || !options.apply) return result;
  for (const link of result.links) {
    if (link.status === 'present' || link.aliasOf) continue;
    mkdirSync(dirname(link.destination), {recursive: true});
    symlinkSync(link.source, link.destination);
    link.status = 'created';
  }
  return result;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !['--check', '--apply'].includes(args[0]))) {
    console.error('Usage: node ai/install-agent-links.mjs [--check | --apply]');
    process.exitCode = 2;
    return;
  }
  try {
    const apply = args[0] === '--apply';
    const result = installAgentLinks({apply});
    for (const link of result.links) console.log(`${link.status}: ${link.destination} -> ${relative(repositoryDir, link.source)}${link.aliasOf ? ` (alias of ${link.aliasOf})` : ''}`);
    for (const note of result.notes) console.log(`note: ${note}`);
    for (const error of result.errors) console.error(`error: ${error}`);
    process.exitCode = result.errors.length ? 2 : !apply && result.links.some((link) => link.status === 'missing') ? 1 : 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && realpathSync.native(process.argv[1]) === realpathSync.native(fileURLToPath(import.meta.url))) main();
