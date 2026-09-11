import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '..');
const manifest = parse(readFileSync(path.join(workspaceRoot, 'workspace.yaml'), 'utf8'));
const dryRun = process.argv.slice(2).includes('--dry-run');
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== '--dry-run');

if (unsupportedArguments.length > 0) {
  throw new Error(`Unsupported argument: ${unsupportedArguments[0]}`);
}

if (!Array.isArray(manifest.projects) || manifest.projects.length === 0) {
  throw new Error('workspace.yaml must declare at least one project.');
}

function projectDirectory(project) {
  const directory = path.resolve(workspaceRoot, project.path);
  const relativePath = path.relative(workspaceRoot, directory);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`${project.name} has a path outside the workspace: ${project.path}`);
  }

  return directory;
}

function isGitWorktree(directory) {
  try {
    return execFileSync('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() === 'true';
  } catch {
    return false;
  }
}

console.log(`${dryRun ? 'Previewing' : 'Preparing'} ${manifest.workspace?.name ?? 'workspace'}\n`);

let succeeded = true;
for (const project of manifest.projects) {
  const directory = projectDirectory(project);

  if (existsSync(directory)) {
    if (!statSync(directory).isDirectory()) {
      succeeded = false;
      console.log(`✗ ${project.name}: path exists but is not a directory (${project.path})`);
    } else if (!isGitWorktree(directory)) {
      succeeded = false;
      console.log(`✗ ${project.name}: directory exists but is not a Git worktree (${project.path})`);
    } else {
      console.log(`✓ ${project.name}: already available (${project.path})`);
    }
    continue;
  }

  if (typeof project.repository !== 'string' || typeof project.integration_branch !== 'string') {
    succeeded = false;
    console.log(`✗ ${project.name}: repository or integration_branch is missing from the manifest`);
    continue;
  }

  if (dryRun) {
    console.log(`→ ${project.name}: would clone ${project.repository} at ${project.path} (${project.integration_branch})`);
    continue;
  }

  mkdirSync(path.dirname(directory), { recursive: true });
  const clone = spawnSync('git', [
    'clone',
    '--branch', project.integration_branch,
    '--single-branch',
    project.repository,
    directory,
  ], {
    encoding: 'utf8',
  });

  if (clone.status === 0) {
    console.log(`✓ ${project.name}: cloned into ${project.path}`);
  } else {
    succeeded = false;
    console.log(`✗ ${project.name}: clone failed`);
    process.stderr.write(clone.stderr || clone.stdout || 'Git did not return an error message.\n');
  }
}

if (!succeeded) {
  console.error('\nWorkspace bootstrap failed. Resolve the reported path before trying again.');
  process.exitCode = 1;
} else if (dryRun) {
  console.log('\nPreview complete. Run without --dry-run to clone missing projects.');
} else {
  console.log('\nWorkspace bootstrap complete. Run workspace:validate next.');
}
