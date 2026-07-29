import { NextResponse } from 'next/server';
import { getKlingMode, pollLiveTask } from '@/lib/kling/client';
import { getJob, saveJob } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let job = getJob(id);
  if (!job) {
    return NextResponse.json({ ok: false, error: 'job not found' }, { status: 404 });
  }

  // Refresh live jobs that are still open
  if (
    job.mode === 'live' &&
    (job.status === 'queued' || job.status === 'running') &&
    getKlingMode() === 'live'
  ) {
    const polled = await pollLiveTask(job.id);
    job = {
      ...job,
      status: polled.status,
      url: polled.url || job.url,
      note: polled.note || job.note,
      error: polled.status === 'failed' ? polled.note : job.error,
      updatedAt: new Date().toISOString(),
    };
    saveJob(job);
  }

  return NextResponse.json({ ok: true, job });
}
