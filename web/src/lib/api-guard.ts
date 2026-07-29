import { NextResponse } from 'next/server';
import { assertDeployAuth } from './auth';
import { clientIp, rateLimit } from './rate-limit';

export function guardApi(
  req: Request,
  opts: { limit?: number; windowMs?: number; bucket?: string } = {}
): NextResponse | null {
  const auth = assertDeployAuth(req);
  if (auth) return auth;

  const limit = opts.limit ?? Number(process.env.RATE_LIMIT_PER_MIN || 30);
  const windowMs = opts.windowMs ?? 60_000;
  const ip = clientIp(req);
  const bucket = `${opts.bucket || 'api'}:${ip}`;
  const rl = rateLimit(bucket, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'Rate limit exceeded', retryAfterSec: rl.retryAfterSec },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      }
    );
  }
  return null;
}
