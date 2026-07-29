import path from 'node:path';
import { NextResponse } from 'next/server';
import { createImageToVideoJob } from '@/lib/kling/client';
import { readShotFiles, loadPackageShots } from '@/lib/pipeline';
import { repoRoot } from '@/lib/paths';
import { getSession, saveJob, type KlingJob } from '@/lib/store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      shotId?: string;
    };
    if (!body.sessionId || !body.shotId) {
      return NextResponse.json(
        { ok: false, error: 'sessionId and shotId required' },
        { status: 400 }
      );
    }
    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });
    }
    const shots = session.shots.length
      ? session.shots
      : loadPackageShots(session.packagePath);
    const shot = shots.find((s) => s.shotId === body.shotId);
    if (!shot) {
      return NextResponse.json({ ok: false, error: 'shot not in session' }, { status: 404 });
    }

    const files = readShotFiles(session.packagePath, body.shotId);
    if (!files?.prompt) {
      return NextResponse.json(
        { ok: false, error: 'prompt.txt missing for shot' },
        { status: 404 }
      );
    }

    const refImagePath = path.join(
      repoRoot(),
      session.packagePath,
      'shots',
      body.shotId,
      'ref-page.png'
    );

    const created = await createImageToVideoJob({
      runId: session.runId,
      shotId: body.shotId,
      prompt: files.prompt,
      negative: files.negative,
      durationSec: shot.durationSec,
      refImagePath,
    });

    const now = new Date().toISOString();
    let status = created.status;
    let url = created.url;
    let error = created.status === 'failed' ? created.note : undefined;

    // Mock: complete immediately with handoff note (no real mp4)
    if (created.mode === 'mock' && status === 'queued') {
      status = 'succeeded';
      url = undefined;
    }

    const job: KlingJob = {
      id: created.jobId,
      runId: session.runId,
      shotId: body.shotId,
      status,
      mode: created.mode,
      createdAt: now,
      updatedAt: now,
      url,
      error,
      note:
        created.note ||
        (created.mode === 'mock'
          ? 'Mock success: copy prompt from shot detail into Kling manually (path A), or set KLING_MODE=live when API is wired.'
          : undefined),
    };
    saveJob(job);

    return NextResponse.json({
      ok: status !== 'failed',
      job,
      handoff: {
        promptPreview: files.prompt.slice(0, 280),
        guide: 'docs/guides/A-kling-manual-practice.md',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
