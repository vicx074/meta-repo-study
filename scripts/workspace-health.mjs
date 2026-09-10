import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, '..');
const manifest = parse(readFileSync(path.join(workspaceRoot, 'workspace.yaml'), 'utf8'));
const projectsWithHealthCheck = manifest.projects.filter(
  (project) => typeof project.development?.health_url === 'string',
);

console.log(`Checking running services in ${manifest.workspace?.name ?? 'workspace'}\n`);

if (projectsWithHealthCheck.length === 0) {
  console.log('No health endpoints are declared in workspace.yaml.');
  process.exit(0);
}

const checks = await Promise.all(projectsWithHealthCheck.map(async (project) => {
  const healthUrl = project.development.health_url;

  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
    if (!response.ok) {
      return { project, healthUrl, ok: false, detail: `returned HTTP ${response.status}` };
    }

    return { project, healthUrl, ok: true };
  } catch {
    return { project, healthUrl, ok: false, detail: 'is not reachable' };
  }
}));

let healthy = true;
for (const check of checks) {
  if (check.ok) {
    console.log(`✓ ${check.project.name} is healthy at ${check.healthUrl}`);
  } else {
    healthy = false;
    console.log(`✗ ${check.project.name} ${check.detail}: ${check.healthUrl}`);
  }
}

if (!healthy) {
  console.error('\nWorkspace health check failed. Start the unavailable service and try again.');
  process.exitCode = 1;
} else {
  console.log('\nWorkspace health check passed.');
}
