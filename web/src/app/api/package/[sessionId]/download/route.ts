import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { guardApi } from '@/lib/api-guard';
import { repoRoot } from '@/lib/paths';
import { getSession } from '@/lib/store';

export const runtime = 'nodejs';

/**
 * Zip clip-package for Path A handoff (prompts + shotlist).
 * Does not call Kling. Core MVP package only.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const denied = guardApi(req, { bucket: 'download', limit: 10 });
  if (denied) return denied;

  const { sessionId } = await ctx.params;
  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });
  }

  const pkgDir = path.join(repoRoot(), session.packagePath);
  if (!fs.existsSync(pkgDir)) {
    return NextResponse.json(
      { ok: false, error: `package missing: ${session.packagePath}` },
      { status: 404 }
    );
  }

  const zip = new AdmZip();
  const rootName = session.slug || 'clip-package';
  const addDir = (dir: string, prefix: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      const rel = `${prefix}/${ent.name}`.replace(/\\/g, '/');
      if (ent.isDirectory()) addDir(full, rel);
      else zip.addFile(rel, fs.readFileSync(full));
    }
  };
  addDir(pkgDir, rootName);

  const buf = zip.toBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${session.slug || 'clip-package'}.zip"`,
      'Content-Length': String(buf.length),
    },
  });
}
