import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '..');
const manifestPath = path.join(workspaceRoot, 'workspace.yaml');
const manifest = parse(readFileSync(manifestPath, 'utf8'));

if (!Array.isArray(manifest.projects) || manifest.projects.length === 0) {
  throw new Error('workspace.yaml must declare at least one project.');
}

function git(projectPath, args) {
  return execFileSync('git', args, {
    cwd: projectPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function validateProject(project) {
  const issues = [];
  const projectPath = path.resolve(workspaceRoot, project.path);

  try {
    if (!statSync(projectPath).isDirectory()) {
      issues.push(`path is not a directory: ${project.path}`);
      return issues;
    }
  } catch {
    issues.push(`path is missing: ${project.path}`);
    return issues;
  }

  try {
    if (git(projectPath, ['rev-parse', '--is-inside-work-tree']) !== 'true') {
      issues.push('path is not a Git worktree');
      return issues;
    }

    const origin = git(projectPath, ['remote', 'get-url', 'origin']);
    if (origin !== project.repository) {
      issues.push(`origin differs from manifest: ${origin}`);
    }

    const branch = git(projectPath, ['branch', '--show-current']);
    if (branch !== project.integration_branch) {
      issues.push(`branch is ${branch || 'detached'}, expected ${project.integration_branch}`);
    }

    if (git(projectPath, ['status', '--porcelain']) !== '') {
      issues.push('working tree has uncommitted changes');
    }

    const packagePath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    const declaredScripts = project.development?.npm_scripts ?? {};

    for (const [purpose, scriptName] of Object.entries(declaredScripts)) {
      if (typeof scriptName !== 'string' || !packageJson.scripts?.[scriptName]) {
        issues.push(`missing npm script for ${purpose}: ${scriptName}`);
      }
    }
  } catch (error) {
    const details = error.stderr?.toString().trim();
    issues.push(details || error.message);
  }

  return issues;
}

console.log(`Validating ${manifest.workspace?.name ?? 'workspace'}\n`);

let valid = true;
const projectNames = new Set(manifest.projects.map((project) => project.name));

for (const project of manifest.projects) {
  const issues = validateProject(project);

  for (const dependency of project.depends_on ?? []) {
    if (!projectNames.has(dependency)) {
      issues.push(`declares an unknown dependency: ${dependency}`);
    }
  }

  if (issues.length === 0) {
    console.log(`✓ ${project.name} (${project.role})`);
    continue;
  }

  valid = false;
  console.log(`✗ ${project.name} (${project.role})`);
  for (const issue of issues) {
    console.log(`  - ${issue}`);
  }
}

if (!valid) {
  console.error('\nWorkspace validation failed.');
  process.exitCode = 1;
} else {
  console.log('\nWorkspace validation passed.');
}
