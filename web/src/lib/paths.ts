import path from 'node:path';
import fs from 'node:fs';

/** Monorepo root (manga-gong-bang-video) */
export function repoRoot(): string {
  // web/ -> parent
  const fromCwd = path.resolve(process.cwd(), '..');
  if (fs.existsSync(path.join(fromCwd, 'scripts', 'run-pipeline.mjs'))) {
    return fromCwd;
  }
  // fallback: cwd is repo root (docker WORKDIR /app with web nested)
  const nested = path.resolve(process.cwd());
  if (fs.existsSync(path.join(nested, 'scripts', 'run-pipeline.mjs'))) {
    return nested;
  }
  return fromCwd;
}

export function dataRoot(): string {
  const root = path.join(repoRoot(), 'web', '.data');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function uploadsDir(): string {
  const d = path.join(dataRoot(), 'uploads');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function jobsPath(): string {
  return path.join(dataRoot(), 'jobs.json');
}

export function sessionsPath(): string {
  return path.join(dataRoot(), 'sessions.json');
}
