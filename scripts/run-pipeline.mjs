#!/usr/bin/env node
/**
 * One-shot pipeline toward final goal (docs/GOAL.md):
 *   validate-export → bootstrap workspace → assemble clip-package → write QA summary
 *
 * Usage:
 *   node scripts/run-pipeline.mjs --export <EXPORT_DIR> [--run-id <id>] [--slug <slug>]
 *   node scripts/run-pipeline.mjs --export fixtures/sample-export
 *
 * Never modifies _ref/manga-gong-bang.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function die(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }, null, 2));
  process.exit(1);
}

function parseArgs(argv) {
  const out = { exportDir: null, runId: null, slug: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--export') out.exportDir = argv[++i];
    else if (argv[i] === '--run-id') out.runId = argv[++i];
    else if (argv[i] === '--slug') out.slug = argv[++i];
    else if (!out.exportDir && !argv[i].startsWith('-')) out.exportDir = argv[i];
  }
  return out;
}

function runNode(scriptRel, args, root) {
  const script = path.join(root, scriptRel);
  const r = spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    cwd: root,
  });
  const combined = `${r.stdout || ''}${r.stderr || ''}`;
  // last JSON object in output
  let json = null;
  const matches = combined.match(/\{[\s\S]*\}/g);
  if (matches?.length) {
    try {
      json = JSON.parse(matches[matches.length - 1]);
    } catch {
      /* ignore */
    }
  }
  return { status: r.status ?? 1, combined, json };
}

function main() {
  const root = process.cwd();
  const { exportDir: exportArg, runId: runIdArg, slug } = parseArgs(process.argv);
  if (!exportArg) {
    die(
      'Usage: node scripts/run-pipeline.mjs --export <EXPORT_DIR> [--run-id id] [--slug slug]\nSee docs/GOAL.md'
    );
  }

  // Reject obvious placeholders
  const bad = [/실제경로/, /\.\.\./, /<경로>/, /%EXPORT_DIR%/, /여기에/];
  if (bad.some((re) => re.test(exportArg))) {
    die(
      `EXPORT_DIR looks like a placeholder: ${exportArg}. Pass a real absolute or project-relative path.`
    );
  }

  const exportDir = path.resolve(exportArg);
  if (!fs.existsSync(exportDir)) die(`EXPORT_DIR not found: ${exportDir}`);
  if (!fs.existsSync(path.join(exportDir, 'meta.json'))) {
    die(`meta.json missing under: ${exportDir}`);
  }

  // 1) validate
  const v = runNode('scripts/validate-export.mjs', [exportDir], root);
  if (v.status !== 0 || !v.json?.ok) {
    die(`validate-export failed: ${v.combined.slice(0, 800)}`);
  }

  // 2) bootstrap
  const bootArgs = [exportDir];
  if (runIdArg) bootArgs.push(runIdArg);
  const b = runNode('scripts/bootstrap-workspace-from-export.mjs', bootArgs, root);
  if (b.status !== 0 || !b.json?.ok) {
    die(`bootstrap failed: ${b.combined.slice(0, 800)}`);
  }
  const runId = b.json.runId;

  // 3) assemble
  const assembleArgs = [runId];
  if (slug) assembleArgs.push('--slug', slug);
  const a = runNode('scripts/assemble-clip-package.mjs', assembleArgs, root);
  if (a.status !== 0 || !a.json?.ok) {
    die(`assemble failed: ${a.combined.slice(0, 800)}`);
  }

  const packagePath = a.json.packagePath;
  const absPkg = path.join(root, packagePath);
  const qaPath = path.join(root, '_workspace', runId, '04_qa_report.md');
  const qaBody = [
    '# QA Report',
    '',
    `- **goal:** docs/GOAL.md`,
    `- **runId:** ${runId}`,
    `- **EXPORT_DIR:** ${exportDir}`,
    `- **package:** ${packagePath}`,
    `- **shotCount:** ${a.json.shotCount}`,
    `- **validateShotFailures:** ${a.json.validateShotFailures}`,
    `- **status:** ${a.json.validateShotFailures === 0 ? 'ready' : 'draft'}`,
    `- **upstream:** _ref/manga-gong-bang not modified`,
    '',
    '## Critical',
    a.json.validateShotFailures === 0 ? '(none)' : `shot validation failures: ${a.json.failIds?.join(', ')}`,
    '',
    '## Shotlist',
    `See \`${packagePath}/shotlist.md\``,
    '',
    '## Next (human)',
    '1. Kling: S01 → Sn per editor-checklist.md',
    '2. CapCut/Premiere assembly',
    '3. Optional: refine `_workspace/' + runId + '/02_axes_drafts` then re-run assemble',
    '',
  ].join('\n');
  fs.writeFileSync(qaPath, qaBody, 'utf8');
  if (fs.existsSync(absPkg)) {
    fs.writeFileSync(path.join(absPkg, 'qa-report.md'), qaBody, 'utf8');
    // patch package qaSummary
    const pjFile = path.join(absPkg, 'package.json');
    if (fs.existsSync(pjFile)) {
      const pj = JSON.parse(fs.readFileSync(pjFile, 'utf8'));
      pj.qaSummary =
        a.json.validateShotFailures === 0
          ? `ready — pipeline runId=${runId}`
          : `draft — shot validation failures`;
      pj.status = a.json.validateShotFailures === 0 ? 'ready' : 'draft';
      fs.writeFileSync(pjFile, JSON.stringify(pj, null, 2), 'utf8');
    }
  }

  const summary = {
    ok: true,
    goal: 'docs/GOAL.md',
    runId,
    exportDir,
    packagePath,
    shotCount: a.json.shotCount,
    validateShotFailures: a.json.validateShotFailures,
    shotlist: `${packagePath}/shotlist.md`,
    qa: path.relative(root, qaPath).replace(/\\/g, '/'),
    refUntouched: true,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (a.json.validateShotFailures > 0) process.exit(1);
}

main();
