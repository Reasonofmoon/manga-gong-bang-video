#!/usr/bin/env node
/**
 * Assemble clip-package from workspace artifacts (no hardcoded shot table).
 *
 * Requires:
 *   _workspace/<runId>/01_story_breakdown.json
 *   _workspace/<runId>/02_axes_drafts/
 *     - either all_shots.json (array)
 *     - or per-shot *.json with pageIndex + shotInPage (and axes)
 *   _workspace/<runId>/00_normalized/  (meta.json + page images for refs)
 *
 * Usage:
 *   node scripts/assemble-clip-package.mjs <runId> [--slug my-slug]
 *
 * Exit 1 if breakdown or any draft missing / invalid.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const AXES = ['subject', 'camera', 'lighting', 'color', 'texture', 'motion', 'mood'];

const DEFAULT_NEG =
  'blurry, low quality, distorted face, extra limbs, extra fingers, watermark, text overlay, logo, cropped head, morphing identity, flicker, jittery camera, deformed anatomy, wrong face identity';

function die(msg, extra) {
  console.error(JSON.stringify({ ok: false, error: msg, ...extra }, null, 2));
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    die(`Failed to read JSON: ${file}`, { detail: e.message });
  }
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function slugify(title, runId) {
  const s = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || `run-${runId}`;
}

function parseArgs(argv) {
  const args = { runId: null, slug: null };
  const rest = [];
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--slug') {
      args.slug = argv[++i];
    } else {
      rest.push(argv[i]);
    }
  }
  args.runId = rest[0];
  return args;
}

function loadDrafts(draftsDir) {
  if (!fs.existsSync(draftsDir)) {
    die(`02_axes_drafts not found: ${draftsDir}`);
  }

  const allPath = path.join(draftsDir, 'all_shots.json');
  if (fs.existsSync(allPath)) {
    const arr = readJson(allPath);
    if (!Array.isArray(arr) || arr.length === 0) {
      die('all_shots.json must be a non-empty array');
    }
    return arr;
  }

  const files = fs
    .readdirSync(draftsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(draftsDir, f));

  if (files.length === 0) {
    die('No draft JSON files in 02_axes_drafts (expected all_shots.json or per-shot *.json)');
  }

  return files.map((f) => {
    const data = readJson(f);
    return { ...data, _sourceFile: f };
  });
}

function findDraft(drafts, pageIndex, shotInPage, sourcePageId) {
  return (
    drafts.find(
      (d) =>
        Number(d.pageIndex) === Number(pageIndex) &&
        Number(d.shotInPage) === Number(shotInPage)
    ) ||
    drafts.find(
      (d) =>
        d.sourcePageId === sourcePageId && Number(d.shotInPage) === Number(shotInPage)
    ) ||
    null
  );
}

function validateAxes(axes, label) {
  if (!axes || typeof axes !== 'object') {
    return `${label}: axes missing`;
  }
  for (const a of AXES) {
    if (typeof axes[a] !== 'string' || !axes[a].trim()) {
      return `${label}: axes.${a} empty`;
    }
  }
  return null;
}

function pipePrompt(axes) {
  return AXES.map((k) => axes[k].trim()).join(' | ');
}

function main() {
  const { runId, slug: slugArg } = parseArgs(process.argv);
  if (!runId) {
    die('Usage: node scripts/assemble-clip-package.mjs <runId> [--slug my-slug]');
  }

  const root = process.cwd();
  const ws = path.join(root, '_workspace', runId);
  const breakdownPath = path.join(ws, '01_story_breakdown.json');
  const draftsDir = path.join(ws, '02_axes_drafts');
  const exportRoot = path.join(ws, '00_normalized');
  const metaPath = path.join(exportRoot, 'meta.json');

  if (!fs.existsSync(ws)) die(`Workspace not found: ${ws}`);
  if (!fs.existsSync(breakdownPath)) die(`Missing breakdown: ${breakdownPath}`);
  if (!fs.existsSync(metaPath)) {
    die(`Missing normalized meta (export snapshot): ${metaPath}`);
  }

  const breakdown = readJson(breakdownPath);
  const meta = readJson(metaPath);
  const drafts = loadDrafts(draftsDir);

  const projectTitle = meta.project?.title || breakdown.projectTitle || runId;
  const slug = slugArg || slugify(projectTitle, runId);
  const pkg = path.join(root, 'clip-package', slug);

  const ordered = [];
  const missing = [];

  if (!Array.isArray(breakdown.pages)) {
    die('breakdown.pages must be an array');
  }

  for (const page of breakdown.pages) {
    const shots = page.shots || [];
    const shotsInPage = page.shotsInPage ?? shots.length;
    if (page.type === 'story' && (shotsInPage < 2 || shotsInPage > 4)) {
      die(`story page ${page.pageIndex} shotsInPage must be 2–4`, { shotsInPage });
    }
    if (
      (page.type === 'cover' || page.type === 'back_cover') &&
      (shotsInPage < 1 || shotsInPage > 2)
    ) {
      die(`${page.type} page ${page.pageIndex} shotsInPage must be 1–2`, { shotsInPage });
    }

    for (const bs of shots) {
      const draft = findDraft(drafts, page.pageIndex, bs.shotInPage, page.sourcePageId);
      if (!draft) {
        missing.push({
          pageIndex: page.pageIndex,
          shotInPage: bs.shotInPage,
          sourcePageId: page.sourcePageId,
        });
        continue;
      }
      ordered.push({ page, breakdownShot: bs, draft });
    }
  }

  if (missing.length) {
    die('Missing axes drafts for breakdown shots', {
      missing,
      hint: 'Add 02_axes_drafts/pNN_sNN.json or all_shots.json with matching pageIndex+shotInPage',
    });
  }

  if (ordered.length === 0) {
    die('No shots to assemble');
  }

  // clean previous package slug dir shots only if recreating same slug
  ensureDir(pkg);
  ensureDir(path.join(pkg, 'shots'));
  ensureDir(path.join(ws, '03_kling_package'));

  const index = [];
  const usedDrafts = [];
  let global = 0;

  for (const { page, breakdownShot: bs, draft } of ordered) {
    global += 1;
    const shotId = `S${String(global).padStart(2, '0')}_p${String(page.pageIndex).padStart(2, '0')}_s${String(bs.shotInPage).padStart(2, '0')}`;

    const axes = draft.axes;
    const axisErr = validateAxes(axes, shotId);
    if (axisErr) die(axisErr);

    const prompt =
      typeof draft.prompt === 'string' && draft.prompt.trim().length >= 20
        ? draft.prompt.trim()
        : pipePrompt(axes);

    const negative =
      typeof draft.negative === 'string' && draft.negative.trim()
        ? draft.negative.trim()
        : DEFAULT_NEG;

    const styleSignature =
      (typeof draft.styleSignature === 'string' && draft.styleSignature.trim()) ||
      meta.project?.stylePrompt ||
      meta.project?.stylePreset ||
      'cinematic';

    const durationSec =
      typeof draft.durationSec === 'number' ? draft.durationSec : purposeDefaultDuration(bs.purpose);

    const refRel =
      draft.refImageRel ||
      bs.refImage ||
      page.refImage ||
      (meta.pages || []).find((p) => p.id === page.sourcePageId)?.imageFile;

    if (!refRel) {
      die(`${shotId}: no ref image path (breakdown.refImage or draft/meta)`);
    }

    const shotDir = path.join(pkg, 'shots', shotId);
    ensureDir(shotDir);

    const refExt = path.extname(refRel) || '.png';
    const refDestName = `ref-page${refExt}`;
    const srcImg = path.isAbsolute(refRel)
      ? refRel
      : path.join(exportRoot, refRel.replace(/^\.\//, ''));

    const shot = {
      shotId,
      sourcePageId: page.sourcePageId,
      pageIndex: page.pageIndex,
      shotInPage: bs.shotInPage,
      shotsInPage: page.shotsInPage ?? page.shots.length,
      purpose: draft.purpose || bs.purpose || 'other',
      durationSec,
      axes,
      prompt,
      negative,
      styleSignature,
      refImage: refDestName,
      dialogueNote: draft.dialogueNote ?? bs.dialogueNote ?? '',
      seedHint:
        draft.seedHint ||
        'Record seed after first approved shot for this character/location',
    };

    fs.writeFileSync(path.join(shotDir, 'shot.json'), JSON.stringify(shot, null, 2), 'utf8');
    fs.writeFileSync(path.join(shotDir, 'prompt.txt'), prompt + '\n', 'utf8');
    fs.writeFileSync(path.join(shotDir, 'negative.txt'), negative + '\n', 'utf8');
    fs.writeFileSync(
      path.join(shotDir, 'guide.md'),
      [
        `# ${shotId}`,
        '',
        `- **purpose:** ${shot.purpose}`,
        `- **durationSec:** ${durationSec} (round to Kling 5s/10s preset)`,
        `- **styleSignature:** ${styleSignature}`,
        `- **seedHint:** ${shot.seedHint}`,
        `- **I2V:** Use \`${refDestName}\` as first-frame / style lock on Kling`,
        shot.dialogueNote ? `- **dialogueNote:** ${shot.dialogueNote}` : '',
        bs.intent ? `- **intent:** ${bs.intent}` : '',
        '',
        '## Kling steps',
        '1. Open Kling image-to-video (preferred) or text-to-video',
        `2. Attach ${refDestName}`,
        '3. Paste prompt.txt',
        '4. Paste negative.txt if UI supports negative',
        '5. Set duration near durationSec',
        `6. Export clip as \`${shotId}.mp4\``,
        '',
      ]
        .filter(Boolean)
        .join('\n'),
      'utf8'
    );

    if (fs.existsSync(srcImg)) {
      fs.copyFileSync(srcImg, path.join(shotDir, refDestName));
    } else {
      console.warn(JSON.stringify({ warn: 'ref image missing', shotId, srcImg }));
    }

    // refresh draft copy with assigned shotId
    fs.writeFileSync(
      path.join(draftsDir, `${shotId}.json`),
      JSON.stringify(shot, null, 2),
      'utf8'
    );

    index.push({
      shotId,
      dir: `shots/${shotId}`,
      pageIndex: page.pageIndex,
      purpose: shot.purpose,
      durationSec,
      intent: bs.intent || '',
    });
    usedDrafts.push(shotId);
  }

  const packageJson = {
    schemaVersion: '1.0',
    projectSlug: slug,
    generatedAt: new Date().toISOString(),
    status: 'ready',
    sourceExport: meta.source || 'normalized-export',
    harnessVersion: '0.1.1',
    runId,
    project: {
      title: projectTitle,
      genre: meta.project?.genre || '',
      tone: meta.project?.tone || '',
      language: meta.project?.language || '',
      stylePreset: meta.project?.stylePreset || '',
    },
    shots: index.map(({ shotId, dir, pageIndex, purpose, durationSec }) => ({
      shotId,
      dir,
      pageIndex,
      purpose,
      durationSec,
    })),
    qaSummary: 'assembled from breakdown+drafts; run QA skill or review shotlist',
  };
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');

  const shotlist = [
    `# Shotlist — ${projectTitle}`,
    '',
    '| shotId | page | purpose | duration | intent |',
    '|--------|------|---------|----------|--------|',
    ...index.map((s) => {
      const intent = (s.intent || '').replace(/\|/g, '/').slice(0, 100);
      return `| ${s.shotId} | p${s.pageIndex} | ${s.purpose} | ${s.durationSec}s | ${intent} |`;
    }),
    '',
    `Total shots: **${index.length}**`,
    '',
    'Playback order = shotId global order.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(pkg, 'shotlist.md'), shotlist, 'utf8');

  const chars = (meta.characters || [])
    .map(
      (c) =>
        `- **${c.name || c.role} (${c.role}):** ${c.desc}${c.outfit ? ` Outfit: ${c.outfit}.` : ''}`
    )
    .join('\n');

  const continuity = [
    '# Continuity',
    '',
    '## Characters',
    chars || '- (no characters[] in export meta)',
    '',
    '## Style',
    `- preset: ${meta.project?.stylePreset || 'n/a'}`,
    `- prompt: ${meta.project?.stylePrompt || 'n/a'}`,
    '',
    '## Notes',
    '- Keep identity tokens stable across shots sharing the same focus_char.',
    '- Prefer I2V with page ref; re-generate if face morphs.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(pkg, 'continuity.md'), continuity, 'utf8');

  const checklist = [
    `# Editor checklist — ${projectTitle}`,
    '',
    `Package: \`clip-package/${slug}/\` · shots: **${index.length}** · runId: \`${runId}\``,
    '',
    '1. [ ] Open shotlist.md and confirm shot count',
    `2. [ ] For each shot folder ${index[0]?.shotId || 'S01'}… in order:`,
    '   - [ ] Load ref-page into Kling I2V',
    '   - [ ] Paste prompt.txt + negative.txt',
    '   - [ ] Set duration (5s or 10s nearest to guide)',
    '   - [ ] Save as `{shotId}.mp4`',
    '3. [ ] Import into CapCut/Premiere in shotId order',
    '4. [ ] Captions from dialogueNote in shot.json / guide.md',
    '5. [ ] Manual color match if neon/grade drifts',
    '6. [ ] Export rough cut',
    '',
    'MVP does not auto-assemble the timeline.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(pkg, 'editor-checklist.md'), checklist, 'utf8');

  fs.writeFileSync(
    path.join(ws, '03_kling_package', 'manifest.json'),
    JSON.stringify(
      {
        runId,
        slug,
        packagePath: `clip-package/${slug}`,
        shotCount: index.length,
        assembledAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );

  // validate each shot.json
  const validateScript = path.join(root, 'scripts', 'validate-shot.mjs');
  let failCount = 0;
  const failIds = [];
  for (const s of index) {
    const shotFile = path.join(pkg, 'shots', s.shotId, 'shot.json');
    const r = spawnSync(process.execPath, [validateScript, shotFile], {
      encoding: 'utf8',
    });
    if (r.status !== 0) {
      failCount++;
      failIds.push(s.shotId);
    }
  }

  const report = {
    ok: failCount === 0,
    runId,
    slug,
    packagePath: `clip-package/${slug}`,
    shotCount: index.length,
    validateShotFailures: failCount,
    failIds,
  };
  console.log(JSON.stringify(report, null, 2));
  if (failCount > 0) process.exit(1);
}

function purposeDefaultDuration(purpose) {
  if (purpose === 'action') return 8;
  return 5;
}

main();
