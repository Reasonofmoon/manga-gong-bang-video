import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getKlingMode } from '@/lib/kling/client';
import { loadLiveConfig } from '@/lib/kling/live';
import { repoRoot } from '@/lib/paths';

export const runtime = 'nodejs';

export async function GET() {
  const root = repoRoot();
  const pipelineScript = path.join(root, 'scripts', 'run-pipeline.mjs');
  const fixture = path.join(root, 'fixtures', 'sample-export', 'meta.json');
  const mode = getKlingMode();
  const live =
    mode === 'live'
      ? loadLiveConfig()
      : { skipped: true as const };

  return NextResponse.json({
    ok: true,
    service: 'manga-gong-bang-video-web',
    klingMode: mode,
    authRequired: Boolean(process.env.DEPLOY_API_TOKEN || process.env.API_TOKEN),
    rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN || 30),
    repoRoot: root,
    checks: {
      runPipelineScript: fs.existsSync(pipelineScript),
      fixtureMeta: fs.existsSync(fixture),
      liveConfig: 'error' in live ? { ok: false, error: live.error } : { ok: true },
    },
    time: new Date().toISOString(),
  });
}
