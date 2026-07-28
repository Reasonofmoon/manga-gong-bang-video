# Run note — fixture dry-run

| Field | Value |
|-------|--------|
| Date | 2026-07-28 |
| runId | `20260728-185925` |
| source | `fixtures/sample-export` |
| package | `clip-package/neon-rain-fixture/` |
| QA | ready (placeholder images warning) |
| upstream | `_ref/manga-gong-bang` not modified |

## Shots

8 total: cover 2 + story 3 + decision story 3 (`S01`–`S08`).

## Commands used

```bash
npm run validate:export -- fixtures/sample-export
# workspace artifacts under _workspace/20260728-185925/
node scripts/assemble-clip-package.mjs 20260728-185925
```

## Assemble contract (post-refactor)

Assembler **no longer** embeds shot tables. It requires:

1. `_workspace/<runId>/01_story_breakdown.json`
2. `_workspace/<runId>/02_axes_drafts/` (`all_shots.json` **or** per-shot JSON with `pageIndex` + `shotInPage` + `axes`)
3. `_workspace/<runId>/00_normalized/meta.json` (+ page images)

## Later re-run (CLI pipeline)

```bash
# EXPORT_DIR must be a real path (fixture example below)
export EXPORT_DIR=fixtures/sample-export   # PowerShell: $env:EXPORT_DIR="..."
node scripts/bootstrap-workspace-from-export.mjs $EXPORT_DIR
node scripts/assemble-clip-package.mjs <runId-from-bootstrap>
```

Latest automated pipeline run (same fixture):

| Field | Value |
|-------|--------|
| runId | `20260728-192715` |
| package | `clip-package/neon-rain-fixture/` |
| shots | 8 |
| validate-shot | 0 failures |

## Next production run

1. Put real export at e.g. `exports/my-story/` per `docs/export-convention.md`
2. `npm run validate:export -- exports/my-story`
3. `node scripts/bootstrap-workspace-from-export.mjs exports/my-story`  
   (or manga-to-video agents for higher-craft 7-axis copy)
4. `node scripts/assemble-clip-package.mjs <runId>`
5. Kling S01→Sn manually; CapCut/Premiere assemble

## Note on images

Fixture `pages/*.png` are 1×1 placeholders — do not judge Kling output quality from this package.
