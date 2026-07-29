import { NextResponse } from 'next/server';

/**
 * Optional deploy gate: if DEPLOY_API_TOKEN is set, require
 * Authorization: Bearer <token> or x-api-token header.
 * When unset (local dev), open — matches Core MVP demo UX.
 */
export function assertDeployAuth(req: Request): NextResponse | null {
  const token = process.env.DEPLOY_API_TOKEN || process.env.API_TOKEN;
  if (!token) return null;

  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = req.headers.get('x-api-token') || '';
  if (bearer === token || header === token) return null;

  return NextResponse.json(
    {
      ok: false,
      error: 'Unauthorized — set Authorization: Bearer <DEPLOY_API_TOKEN>',
    },
    { status: 401 }
  );
}
