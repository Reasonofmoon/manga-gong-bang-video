import { NextResponse } from 'next/server';
import { getSession } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session });
}
