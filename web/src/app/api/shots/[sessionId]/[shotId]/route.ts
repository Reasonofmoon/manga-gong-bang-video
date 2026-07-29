import { NextResponse } from 'next/server';
import { readShotFiles } from '@/lib/pipeline';
import { getSession } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string; shotId: string }> }
) {
  const { sessionId, shotId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });
  }
  const files = readShotFiles(session.packagePath, shotId);
  if (!files) {
    return NextResponse.json({ ok: false, error: 'shot not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, shotId, files });
}
