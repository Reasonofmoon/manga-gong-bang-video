import crypto from 'node:crypto';

/**
 * Minimal HS256 JWT for vendors that use Access Key + Secret Key
 * (common on Kling Open Platform style APIs).
 * Header/payload only — no external jwt dependency.
 */
export function signHs256Jwt(
  accessKey: string,
  secretKey: string,
  ttlSeconds = 1800
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + ttlSeconds,
    nbf: now - 5,
  };
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const data = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createHmac('sha256', secretKey).update(data).digest('base64url');
  return `${data}.${sig}`;
}
