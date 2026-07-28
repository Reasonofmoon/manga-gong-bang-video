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

## Next production run

1. Put real export at e.g. `exports/my-story/` per `docs/export-convention.md`
2. `npm run validate:export -- exports/my-story`
3. Run manga-to-video phases (or agent) → write breakdown + axes drafts
4. `node scripts/assemble-clip-package.mjs <runId>`
5. Kling S01→Sn manually; CapCut/Premiere assemble

## Note on images

Fixture `pages/*.png` are 1×1 placeholders — do not judge Kling output quality from this package.
