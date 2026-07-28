#!/usr/bin/env node
/**
 * Bootstrap _workspace/<runId> from an export directory:
 * - validate-export (spawn)
 * - copy to 00_normalized
 * - write 00_ingest_report.json
 * - write 01_story_breakdown.json (rule-based multi-shot)
 * - write 02_axes_drafts/*.json (7-axis drafts from meta + breakdown)
 *
 * Usage:
 *   node scripts/bootstrap-workspace-from-export.mjs <EXPORT_DIR> [runId]
 *
 * Does NOT modify _ref/manga-gong-bang.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const AXES = ['subject', 'camera', 'lighting', 'color', 'texture', 'motion', 'mood'];

function die(msg, extra) {
  console.error(JSON.stringify({ ok: false, error: msg, ...extra }, null, 2));
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function runIdNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function styleBlock(project) {
  return (
    project.stylePrompt ||
    project.stylePreset ||
    `${project.genre || 'cinematic'} visual style`
  );
}

function charByRole(characters, role) {
  return (characters || []).find((c) => c.role === role) || null;
}

function focusDesc(characters, focus) {
  const c = charByRole(characters, focus);
  if (!c) return focus === 'other' ? 'supporting figure in scene' : 'main character';
  const name = c.name || c.role;
  return `${name}: ${c.desc}${c.outfit ? `, wearing ${c.outfit}` : ''}${c.props ? `, with ${c.props}` : ''}`;
}

/** purpose sequence by page type / shot count */
function planShots(page) {
  const type = page.type;
  if (type === 'cover' || type === 'back_cover') {
    return [
      { shotInPage: 1, purpose: 'establish' },
      ...(type === 'cover'
        ? [{ shotInPage: 2, purpose: 'detail' }]
        : []),
    ].slice(0, type === 'cover' ? 2 : 1);
  }
  // story: 3 shots default; decision pages keep 3
  const purposes = page.isDecisionPage
    ? ['establish', 'reaction', 'action']
    : ['establish', 'action', 'reaction'];
  return purposes.map((purpose, i) => ({ shotInPage: i + 1, purpose }));
}

function cameraFor(purpose) {
  switch (purpose) {
    case 'establish':
      return '24-28mm wide establishing shot, slow push or gentle crane, deep environmental context';
    case 'action':
      return '35mm dynamic tracking or handheld follow, medium-wide, kinetic framing';
    case 'reaction':
      return '50-85mm medium close-up, eye-level, shallow depth of field, subtle push-in';
    case 'detail':
      return '85mm portrait close-up, slow push-in, shallow DOF';
    case 'transition':
      return '32mm bridging move, whip or dissolve-friendly end frame';
    default:
      return '35mm cinematic medium shot, controlled camera move';
  }
}

function motionFor(purpose, scene) {
  switch (purpose) {
    case 'establish':
      return `slow environmental reveal, ambient motion in background, ${scene.slice(0, 80)}`;
    case 'action':
      return `primary action from scene plays out with continuous camera follow: ${scene.slice(0, 120)}`;
    case 'reaction':
      return 'facial micro-expression, gesture, breathing, mouth movement if dialogue present';
    case 'detail':
      return 'subtle character idle, wind/hair/fabric micro-motion, shallow bokeh drift';
    default:
      return 'natural secondary motion, rain or ambient particles if environment implies';
  }
}

function durationFor(purpose) {
  return purpose === 'action' ? 8 : 5;
}

function buildBreakdown(meta, runId) {
  const pages = (meta.pages || []).map((page) => {
    const plan = planShots(page);
    return {
      sourcePageId: page.id,
      pageIndex: page.pageIndex,
      type: page.type,
      shotsInPage: plan.length,
      shots: plan.map((p) => ({
        shotInPage: p.shotInPage,
        purpose: p.purpose,
        intent: `${p.purpose}: ${page.beat?.scene || page.type}`,
        emotion: meta.project?.tone || 'dramatic',
        cameraIntent: cameraFor(p.purpose),
        focus_char: page.beat?.focus_char || 'hero',
        refImage: page.imageFile,
        dialogueNote:
          p.purpose === 'reaction' || p.purpose === 'detail'
            ? page.beat?.dialogue || page.beat?.caption || ''
            : page.resolvedChoice && p.purpose === 'action'
              ? `Resolved: ${page.resolvedChoice}`
              : page.beat?.caption && p.purpose === 'establish'
                ? page.beat.caption
                : '',
      })),
    };
  });

  return {
    runId,
    projectTitle: meta.project?.title || 'untitled',
    pages,
  };
}

function buildDraft(meta, pageMeta, bs) {
  const style = styleBlock(meta.project || {});
  const focus = bs.focus_char || pageMeta.beat?.focus_char || 'hero';
  const scene = pageMeta.beat?.scene || 'cinematic scene';
  const who = focusDesc(meta.characters, focus);

  const axes = {
    subject: `${who}; scene: ${scene}; style base: ${style}`,
    camera: cameraFor(bs.purpose),
    lighting:
      'motivated cinematic lighting matching genre mood, clear key direction, readable face when character-focused, practicals in environment',
    color: `palette constrained for ${meta.project?.genre || 'drama'}, cohesive grade, limited accent colors`,
    texture: 'medium-appropriate surface detail, filmic or animation texture per style, no muddy compression',
    motion: motionFor(bs.purpose, scene),
    mood: `${meta.project?.tone || 'intense'}; ${bs.emotion || 'focused dramatic beat'}`,
  };

  return {
    pageIndex: pageMeta.pageIndex,
    sourcePageId: pageMeta.id,
    shotInPage: bs.shotInPage,
    shotsInPage: undefined, // filled later by assembler from breakdown
    purpose: bs.purpose,
    durationSec: durationFor(bs.purpose),
    axes,
    styleSignature: style,
    refImage: pageMeta.imageFile,
    dialogueNote: bs.dialogueNote || '',
    seedHint: 'Lock seed after first approved shot for this character',
    negative:
      'blurry, low quality, distorted face, extra limbs, extra fingers, watermark, text overlay, logo, cropped head, morphing identity, flicker, jittery camera, deformed anatomy, wrong face identity',
  };
}

function main() {
  const exportDirArg = process.argv[2];
  const runId = process.argv[3] || runIdNow();
  if (!exportDirArg) {
    die('Usage: node scripts/bootstrap-workspace-from-export.mjs <EXPORT_DIR> [runId]');
  }

  const root = process.cwd();
  const exportDir = path.resolve(exportDirArg);
  if (!fs.existsSync(exportDir)) die(`EXPORT_DIR not found: ${exportDir}`);

  const validate = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'validate-export.mjs'), exportDir],
    { encoding: 'utf8' }
  );
  const validateOut = validate.stdout || validate.stderr || '';
  let validateJson;
  try {
    validateJson = JSON.parse(validateOut);
  } catch {
    die('validate-export did not return JSON', { out: validateOut.slice(0, 500) });
  }
  if (validate.status !== 0 || !validateJson.ok) {
    die('validate-export failed', { report: validateJson });
  }

  const meta = readJson(path.join(exportDir, 'meta.json'));
  const ws = path.join(root, '_workspace', runId);
  const normalized = path.join(ws, '00_normalized');
  const draftsDir = path.join(ws, '02_axes_drafts');

  ensureDir(ws);
  ensureDir(draftsDir);
  // refresh normalized copy
  if (fs.existsSync(normalized)) {
    fs.rmSync(normalized, { recursive: true, force: true });
  }
  copyDir(exportDir, normalized);

  fs.writeFileSync(
    path.join(ws, '00_ingest_report.json'),
    JSON.stringify(
      {
        runId,
        phase: 'ingest',
        exportDir,
        normalizedDir: path.relative(root, normalized).replace(/\\/g, '/'),
        ok: true,
        errors: validateJson.errors || [],
        warnings: validateJson.warnings || [],
        pageCount: validateJson.pageCount,
        validatedAt: new Date().toISOString(),
        sourceAppUntouched: true,
      },
      null,
      2
    ),
    'utf8'
  );

  const breakdown = buildBreakdown(meta, runId);
  fs.writeFileSync(
    path.join(ws, '01_story_breakdown.json'),
    JSON.stringify(breakdown, null, 2),
    'utf8'
  );

  const pageById = Object.fromEntries((meta.pages || []).map((p) => [p.id, p]));
  let draftCount = 0;
  for (const page of breakdown.pages) {
    const pageMeta = pageById[page.sourcePageId];
    if (!pageMeta) die(`page meta missing for ${page.sourcePageId}`);
    for (const bs of page.shots) {
      const draft = buildDraft(meta, pageMeta, bs);
      draft.shotsInPage = page.shotsInPage;
      const name = `p${String(page.pageIndex).padStart(2, '0')}_s${String(bs.shotInPage).padStart(2, '0')}.json`;
      fs.writeFileSync(path.join(draftsDir, name), JSON.stringify(draft, null, 2), 'utf8');
      draftCount++;
    }
  }

  // also write all_shots.json for convenience
  const all = breakdown.pages.flatMap((page) => {
    const pageMeta = pageById[page.sourcePageId];
    return page.shots.map((bs) => {
      const draft = buildDraft(meta, pageMeta, bs);
      draft.shotsInPage = page.shotsInPage;
      return draft;
    });
  });
  fs.writeFileSync(path.join(draftsDir, 'all_shots.json'), JSON.stringify(all, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        exportDir,
        workspace: path.relative(root, ws).replace(/\\/g, '/'),
        pageCount: breakdown.pages.length,
        draftCount,
        next: `node scripts/assemble-clip-package.mjs ${runId}`,
      },
      null,
      2
    )
  );
}

main();
