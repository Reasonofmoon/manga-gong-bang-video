import { NextResponse } from 'next/server';
import { getJob } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ ok: false, error: 'job not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, job });
}
