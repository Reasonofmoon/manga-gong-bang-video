import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './paths';
import type { PipelineSession } from './store';

function lastJsonObject(text: string): Record<string, unknown> | null {
  const matches = text.match(/\{[\s\S]*\}/g);
  if (!matches?.length) return null;
  try {
    return JSON.parse(matches[matches.length - 1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function runPipelineOnExport(exportDir: string): {
  ok: boolean;
  error?: string;
  result?: Record<string, unknown>;
  raw?: string;
} {
  const root = repoRoot();
  const script = path.join(root, 'scripts', 'run-pipeline.mjs');
  if (!fs.existsSync(script)) {
    return { ok: false, error: `run-pipeline.mjs not found at ${script}` };
  }
  if (!fs.existsSync(path.join(exportDir, 'meta.json'))) {
    return { ok: false, error: `meta.json missing in ${exportDir}` };
  }

  const r = spawnSync(process.execPath, [script, '--export', exportDir], {
    encoding: 'utf8',
    cwd: root,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  const raw = `${r.stdout || ''}${r.stderr || ''}`;
  const result = lastJsonObject(raw);
  if (r.status !== 0 || !result?.ok) {
    return {
      ok: false,
      error: (result?.error as string) || raw.slice(0, 1200) || 'pipeline failed',
      raw,
      result: result ?? undefined,
    };
  }
  return { ok: true, result, raw };
}

export function loadPackageShots(
  packageRel: string
): PipelineSession['shots'] {
  const root = repoRoot();
  const pkgDir = path.join(root, packageRel);
  const pjPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pjPath)) return [];
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8')) as {
    shots?: Array<{
      shotId: string;
      purpose: string;
      durationSec: number;
      pageIndex: number;
    }>;
  };
  return (pj.shots || []).map((s) => ({
    shotId: s.shotId,
    purpose: s.purpose,
    durationSec: s.durationSec,
    pageIndex: s.pageIndex,
  }));
}

export function readShotlistPreview(packageRel: string, maxLines = 40): string {
  const p = path.join(repoRoot(), packageRel, 'shotlist.md');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(0, maxLines).join('\n');
}

export function readShotFiles(
  packageRel: string,
  shotId: string
): { prompt: string; negative: string; guide: string; shotJson: string } | null {
  const dir = path.join(repoRoot(), packageRel, 'shots', shotId);
  if (!fs.existsSync(dir)) return null;
  const read = (name: string) => {
    const f = path.join(dir, name);
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  };
  return {
    prompt: read('prompt.txt'),
    negative: read('negative.txt'),
    guide: read('guide.md'),
    shotJson: read('shot.json'),
  };
}

export function fixtureExportDir(): string {
  return path.join(repoRoot(), 'fixtures', 'sample-export');
}
