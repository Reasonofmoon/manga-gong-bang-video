import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { guardApi } from '@/lib/api-guard';
import {
  fixtureExportDir,
  loadPackageShots,
  readShotlistPreview,
  runPipelineOnExport,
} from '@/lib/pipeline';
import { uploadsDir } from '@/lib/paths';
import { saveSession, type PipelineSession } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 300;

function safeUnzip(buffer: Buffer, dest: string): void {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  for (const entry of entries) {
    const name = entry.entryName.replace(/\\/g, '/');
    if (name.includes('..') || path.isAbsolute(name)) {
      throw new Error(`Unsafe zip entry: ${entry.entryName}`);
    }
  }
  zip.extractAllTo(dest, true);
}

/** Find directory that contains meta.json (zip root or nested folder). */
function findExportRoot(dir: string): string | null {
  if (fs.existsSync(path.join(dir, 'meta.json'))) return dir;
  const kids = fs.readdirSync(dir, { withFileTypes: true });
  for (const k of kids) {
    if (!k.isDirectory()) continue;
    const nested = path.join(dir, k.name);
    if (fs.existsSync(path.join(nested, 'meta.json'))) return nested;
  }
  return null;
}

export async function POST(req: Request) {
  const denied = guardApi(req, { bucket: 'pipeline', limit: 8 });
  if (denied) return denied;

  try {
    const form = await req.formData();
    const mode = String(form.get('mode') || 'zip');

    let exportDir: string;

    if (mode === 'fixture') {
      exportDir = fixtureExportDir();
      if (!fs.existsSync(path.join(exportDir, 'meta.json'))) {
        return NextResponse.json(
          { ok: false, error: 'fixtures/sample-export not found on server' },
          { status: 500 }
        );
      }
    } else {
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json(
          { ok: false, error: 'multipart field "file" (zip) required, or mode=fixture' },
          { status: 400 }
        );
      }
      if (file.size > 80 * 1024 * 1024) {
        return NextResponse.json(
          { ok: false, error: 'ZIP too large (max 80MB)' },
          { status: 400 }
        );
      }
      const id = randomUUID().slice(0, 8);
      const dest = path.join(uploadsDir(), `export-${id}`);
      fs.mkdirSync(dest, { recursive: true });
      const buf = Buffer.from(await file.arrayBuffer());
      safeUnzip(buf, dest);
      const root = findExportRoot(dest);
      if (!root) {
        return NextResponse.json(
          { ok: false, error: 'meta.json not found in ZIP (see docs/export-convention.md)' },
          { status: 400 }
        );
      }
      exportDir = root;
    }

    const pipeline = runPipelineOnExport(exportDir);
    if (!pipeline.ok || !pipeline.result) {
      return NextResponse.json(
        { ok: false, error: pipeline.error || 'pipeline failed', detail: pipeline.result },
        { status: 422 }
      );
    }

    const runId = String(pipeline.result.runId);
    const packagePath = String(pipeline.result.packagePath);
    const slug = packagePath.split(/[/\\]/).pop() || 'package';
    const shots = loadPackageShots(packagePath);
    const sessionId = randomUUID().slice(0, 8);

    const session: PipelineSession = {
      id: sessionId,
      runId,
      slug,
      packagePath,
      exportDir,
      shotCount: shots.length,
      shots,
      createdAt: new Date().toISOString(),
      qa: pipeline.result.qa ? String(pipeline.result.qa) : undefined,
      shotlistPreview: readShotlistPreview(packagePath),
    };
    saveSession(session);

    return NextResponse.json({
      ok: true,
      sessionId,
      runId,
      slug,
      packagePath,
      shotCount: shots.length,
      shots,
      shotlistPreview: session.shotlistPreview,
      klingMode: process.env.KLING_MODE || 'mock',
      note:
        'Pipeline complete. Use POST /api/kling/generate for mock (or live when configured) video jobs. Manual Kling: path A guide.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoints: {
      'POST /api/pipeline': 'multipart: file=export.zip | mode=fixture',
      'POST /api/kling/generate': '{ sessionId, shotId }',
      'GET /api/jobs/:id': 'job status',
      'GET /api/sessions/:id': 'session + shots',
      'GET /api/shots/:sessionId/:shotId': 'prompt files',
    },
  });
}
