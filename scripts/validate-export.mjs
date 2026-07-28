#!/usr/bin/env node
/**
 * Validate a manga-gong-bang export folder against convention v1.0.
 * Usage: node scripts/validate-export.mjs <exportDir>
 * Exit 0 = valid, 1 = invalid.
 */

import fs from 'node:fs';
import path from 'node:path';

const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg']);

function fail(errors, msg) {
  errors.push(msg);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function fileExists(root, rel) {
  if (!isNonEmptyString(rel)) return false;
  const normalized = rel.replace(/\\/g, '/');
  if (normalized.includes('..')) return false;
  return fs.existsSync(path.join(root, normalized));
}

function validate(root) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return {
      ok: false,
      errors: [`Export path is not a directory: ${root}`],
      warnings: [],
    };
  }

  const metaPath = path.join(root, 'meta.json');
  if (!fs.existsSync(metaPath)) {
    return {
      ok: false,
      errors: ['meta.json is missing'],
      warnings: [],
    };
  }

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    return {
      ok: false,
      errors: [`meta.json is not valid JSON: ${e.message}`],
      warnings: [],
    };
  }

  if (meta.schemaVersion !== '1.0') {
    fail(errors, `schemaVersion must be "1.0", got ${JSON.stringify(meta.schemaVersion)}`);
  }
  if (!isNonEmptyString(meta.source)) fail(errors, 'source is required');
  if (!isNonEmptyString(meta.exportedAt)) fail(errors, 'exportedAt is required');

  const project = meta.project;
  if (!project || typeof project !== 'object') {
    fail(errors, 'project is required');
  } else {
    for (const key of ['title', 'genre', 'tone', 'language']) {
      if (!isNonEmptyString(project[key])) fail(errors, `project.${key} is required`);
    }
  }

  if (!Array.isArray(meta.pages) || meta.pages.length === 0) {
    fail(errors, 'pages must be a non-empty array');
  } else {
    const seenIds = new Set();
    meta.pages.forEach((page, i) => {
      const pfx = `pages[${i}]`;
      if (!page || typeof page !== 'object') {
        fail(errors, `${pfx} must be an object`);
        return;
      }
      if (!isNonEmptyString(page.id)) fail(errors, `${pfx}.id is required`);
      else if (seenIds.has(page.id)) fail(errors, `${pfx}.id duplicate: ${page.id}`);
      else seenIds.add(page.id);

      if (!['cover', 'story', 'back_cover'].includes(page.type)) {
        fail(errors, `${pfx}.type must be cover|story|back_cover`);
      }
      if (typeof page.pageIndex !== 'number' || page.pageIndex < 0 || !Number.isInteger(page.pageIndex)) {
        fail(errors, `${pfx}.pageIndex must be a non-negative integer`);
      }
      if (!isNonEmptyString(page.imageFile)) fail(errors, `${pfx}.imageFile is required`);
      else if (!fileExists(root, page.imageFile)) {
        fail(errors, `${pfx}.imageFile not found: ${page.imageFile}`);
      } else {
        const ext = path.extname(page.imageFile).toLowerCase();
        if (!IMAGE_EXT.has(ext)) {
          warnings.push(`${pfx}.imageFile unusual extension: ${ext}`);
        }
      }

      const beat = page.beat;
      if (!beat || typeof beat !== 'object') {
        fail(errors, `${pfx}.beat is required`);
      } else {
        if (page.type === 'story') {
          if (!isNonEmptyString(beat.scene)) {
            fail(errors, `${pfx}.beat.scene is required for story pages (hard fail)`);
          }
        } else if (typeof beat.scene !== 'string') {
          fail(errors, `${pfx}.beat.scene must be a string`);
        } else if (!beat.scene.trim()) {
          warnings.push(`${pfx}.beat.scene is empty for ${page.type}`);
        }
        if (beat.focus_char && !['hero', 'friend', 'friend2', 'other'].includes(beat.focus_char)) {
          fail(errors, `${pfx}.beat.focus_char invalid`);
        }
      }
    });
  }

  if (meta.characters !== undefined) {
    if (!Array.isArray(meta.characters)) {
      fail(errors, 'characters must be an array when present');
    } else {
      meta.characters.forEach((ch, i) => {
        const pfx = `characters[${i}]`;
        if (!['hero', 'friend', 'friend2'].includes(ch?.role)) {
          fail(errors, `${pfx}.role must be hero|friend|friend2`);
        }
        if (!isNonEmptyString(ch?.desc)) fail(errors, `${pfx}.desc is required`);
        if (!isNonEmptyString(ch?.imageFile)) fail(errors, `${pfx}.imageFile is required`);
        else if (!fileExists(root, ch.imageFile)) {
          fail(errors, `${pfx}.imageFile not found: ${ch.imageFile}`);
        }
      });
    }
  } else {
    warnings.push('characters[] missing — continuity for Kling I2V will be weaker');
  }

  return { ok: errors.length === 0, errors, warnings, pageCount: meta.pages?.length ?? 0 };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/validate-export.mjs <exportDir>');
    process.exit(1);
  }
  const root = path.resolve(target);
  const report = validate(root);
  console.log(JSON.stringify({ exportDir: root, ...report }, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main();
