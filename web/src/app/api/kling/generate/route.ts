import { NextResponse } from 'next/server';
import { createImageToVideoJob, getKlingMode, pollLiveTask } from '@/lib/kling/client';
import { findShotRefImage, loadPackageShots, readShotFiles } from '@/lib/pipeline';
import { getSession, saveJob, type KlingJob } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      shotId?: string;
      poll?: boolean;
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

    const refImagePath = findShotRefImage(session.packagePath, body.shotId);

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
    let note = created.note;

    // Mock: complete immediately with handoff note (no real mp4)
    if (created.mode === 'mock' && status === 'queued') {
      status = 'succeeded';
      url = undefined;
      note =
        created.note ||
        'Mock success: copy prompt into Kling UI (path A), or set KLING_MODE=live with credentials.';
    }

    // Live: optional short poll loop (default on for live)
    const shouldPoll =
      created.mode === 'live' &&
      status === 'queued' &&
      body.poll !== false &&
      created.jobId &&
      !created.jobId.startsWith('job_fail') &&
      !created.jobId.startsWith('job_http') &&
      !created.jobId.startsWith('job_err') &&
      !created.jobId.startsWith('job_parse');

    if (shouldPoll) {
      const maxAttempts = Number(process.env.KLING_POLL_ATTEMPTS || 12);
      const delayMs = Number(process.env.KLING_POLL_MS || 5000);
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, delayMs));
        const polled = await pollLiveTask(created.jobId);
        status = polled.status;
        note = polled.note || note;
        if (polled.url) url = polled.url;
        if (status === 'succeeded' || status === 'failed') break;
        if (status === 'running' || status === 'queued') {
          // continue
        }
      }
      if (status === 'queued' || status === 'running') {
        note = `${note || ''} | Still ${status} after poll — GET /api/jobs/${created.jobId} later`;
      }
      if (status === 'failed') error = note;
    }

    const job: KlingJob = {
      id: created.jobId,
      runId: session.runId,
      shotId: body.shotId,
      status,
      mode: created.mode,
      createdAt: now,
      updatedAt: new Date().toISOString(),
      url,
      error,
      note,
    };
    saveJob(job);

    return NextResponse.json({
      ok: status !== 'failed',
      job,
      klingMode: getKlingMode(),
      handoff: {
        promptPreview: files.prompt.slice(0, 280),
        guide: 'docs/guides/A-kling-manual-practice.md',
        videoUrl: url,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
