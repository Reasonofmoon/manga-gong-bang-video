#!/usr/bin/env node
/**
 * Validate a shot.json against clip package shot rules.
 * Usage: node scripts/validate-shot.mjs <shot.json>
 */

import fs from 'node:fs';
import path from 'node:path';

const SHOT_ID = /^S\d{2}_p\d{2}_s\d{2}$/;
const AXES = ['subject', 'camera', 'lighting', 'color', 'texture', 'motion', 'mood'];
const PURPOSES = ['establish', 'action', 'reaction', 'transition', 'detail', 'other'];

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/validate-shot.mjs <shot.json>');
    process.exit(1);
  }
  const abs = path.resolve(file);
  const errors = [];
  let shot;
  try {
    shot = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, errors: [e.message] }, null, 2));
    process.exit(1);
  }

  if (!SHOT_ID.test(shot.shotId || '')) errors.push('shotId must match S##p##_s## pattern');
  for (const k of [
    'sourcePageId',
    'prompt',
    'negative',
    'styleSignature',
    'refImage',
  ]) {
    if (typeof shot[k] !== 'string' || !shot[k].trim()) errors.push(`${k} required string`);
  }
  if (typeof shot.prompt === 'string' && shot.prompt.trim().length < 20) {
    errors.push('prompt too short (<20)');
  }
  if (!Number.isInteger(shot.pageIndex) || shot.pageIndex < 0) errors.push('pageIndex invalid');
  if (!Number.isInteger(shot.shotInPage) || shot.shotInPage < 1) errors.push('shotInPage invalid');
  if (!Number.isInteger(shot.shotsInPage) || shot.shotsInPage < 1 || shot.shotsInPage > 4) {
    errors.push('shotsInPage must be 1..4');
  }
  if (typeof shot.durationSec !== 'number' || shot.durationSec < 1 || shot.durationSec > 15) {
    errors.push('durationSec must be 1..15');
  }
  if (!PURPOSES.includes(shot.purpose)) errors.push('purpose invalid');
  if (!shot.axes || typeof shot.axes !== 'object') errors.push('axes required');
  else {
    for (const a of AXES) {
      if (typeof shot.axes[a] !== 'string' || !shot.axes[a].trim()) {
        errors.push(`axes.${a} required`);
      }
    }
  }

  const report = { ok: errors.length === 0, file: abs, errors };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
