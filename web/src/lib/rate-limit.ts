/**
 * In-memory sliding window rate limit (single Node process).
 * Good enough for one Docker/Railway replica; not a distributed limiter.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key) || { timestamps: [] };
  b.timestamps = b.timestamps.filter((t) => now - t < windowMs);
  if (b.timestamps.length >= limit) {
    const oldest = b.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    buckets.set(key, b);
    return { ok: false, retryAfterSec };
  }
  b.timestamps.push(now);
  buckets.set(key, b);
  // prevent unbounded growth
  if (buckets.size > 5000) {
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }
  return { ok: true };
}

export function clientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip') || 'unknown';
}
