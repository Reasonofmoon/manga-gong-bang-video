# Manga → Video Clip Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an MVP that turns a manga-gong-bang export into a Kling-ready multi-shot clip package via documented conventions, validation scripts, and an agent harness — without modifying `_ref/manga-gong-bang`.

**Architecture:** Convention-first ingest (`export/` ZIP/folder) → multi-shot breakdown (2–4 shots/page) → 7-axis Kling prompts → `clip-package/{slug}/` handoff. Hybrid agent pipeline orchestrated by `manga-to-video` skill; deterministic validation in Node scripts.

**Tech Stack:** Markdown harness (Claude agents/skills), JSON Schema, Node.js ESM validation scripts, fixture export tree. No change to upstream React app.

## Global Constraints

- Never edit `_ref/manga-gong-bang` or upstream `Reasonofmoon/manga-gong-bang`.
- Renderer target: **Kling only**.
- MVP deliverable: **clip package** (prompts, negatives, shotlist, guides) — not final MP4.
- Story pages: **2–4 shots**; cover/back_cover: **1–2 shots**.
- Prompt grammar: **7-axis** (Subject|Camera|Lighting|Color|Texture|Motion|Mood), English-first.
- CG Master Recipe: methodology only — do not paste book template corpora.
- Spec source of truth: `docs/superpowers/specs/2026-07-28-manga-to-video-clip-package-design.md`.

---

## File map

| Path | Responsibility |
|------|----------------|
| `docs/export-convention.md` | Human guide to assemble export without app changes |
| `schemas/export-meta.schema.json` | meta.json JSON Schema |
| `schemas/shot.schema.json` | shot.json JSON Schema |
| `schemas/package.schema.json` | package.json (clip package) JSON Schema |
| `fixtures/sample-export/**` | Minimal valid export for dry-run |
| `scripts/validate-export.mjs` | CLI: validate export folder/zip-unpacked path |
| `scripts/validate-shot.mjs` | CLI: validate one shot.json |
| `package.json` | npm scripts: `validate:export`, `validate:fixture` |
| `.claude/agents/*.md` | Five worker agent definitions |
| `.claude/skills/*/SKILL.md` | Six skills including orchestrator |
| `.claude/skills/seven-axis-kling/references/*` | Kling notes + style map (no book dump) |
| `CLAUDE.md` | Harness pointer + changelog only |

---

### Task 1: Export convention + JSON schemas

**Files:**
- Create: `docs/export-convention.md`
- Create: `schemas/export-meta.schema.json`
- Create: `schemas/shot.schema.json`
- Create: `schemas/package.schema.json`

**Interfaces:**
- Produces: `schemaVersion: "1.0"` for export meta and clip package; shot id pattern `^S\d{2}_p\d{2}_s\d{2}$`

- [x] **Step 1:** Write export convention matching design §4.1
- [x] **Step 2:** Write three JSON Schemas (draft-07 or 2020-12)
- [x] **Step 3:** Commit `docs: add export convention and schemas`

---

### Task 2: Sample fixture + validate-export script

**Files:**
- Create: `fixtures/sample-export/meta.json`
- Create: `fixtures/sample-export/pages/*` (minimal image bytes)
- Create: `fixtures/sample-export/characters/*`
- Create: `scripts/validate-export.mjs`
- Create: `scripts/validate-shot.mjs`
- Create: `package.json`

**Interfaces:**
- Produces: `node scripts/validate-export.mjs <exportDir>` exit 0 on valid, 1 on invalid; prints JSON report to stdout
- Consumes: `schemas/export-meta.schema.json` (lightweight structural validation without external deps if ajv unavailable — implement hand-rolled checks aligned to schema)

- [x] **Step 1:** Create fixture with cover + story + decision story pages
- [x] **Step 2:** Implement validate-export (hard-fail matrix from design §6)
- [x] **Step 3:** Run against fixture — expect exit 0
- [x] **Step 4:** Commit `feat: add fixture and export validator`

---

### Task 3: Agent definitions

**Files:**
- Create: `.claude/agents/ingest-validator.md`
- Create: `.claude/agents/shot-breakdown.md`
- Create: `.claude/agents/seven-axis-writer.md`
- Create: `.claude/agents/package-assembler.md`
- Create: `.claude/agents/continuity-qa.md`

**Interfaces:**
- Each agent: role, principles, I/O paths under `_workspace/`, team protocol, re-call behavior
- model note: prefer high-quality reasoning when spawning

- [x] **Step 1:** Write five agent files
- [x] **Step 2:** Commit `feat: add manga-to-video agent definitions`

---

### Task 4: Skills + orchestrator + CLAUDE.md

**Files:**
- Create: `.claude/skills/export-ingest/SKILL.md`
- Create: `.claude/skills/multi-shot-breakdown/SKILL.md`
- Create: `.claude/skills/seven-axis-kling/SKILL.md`
- Create: `.claude/skills/seven-axis-kling/references/kling-notes.md`
- Create: `.claude/skills/seven-axis-kling/references/style-signature-map.md`
- Create: `.claude/skills/clip-package-export/SKILL.md`
- Create: `.claude/skills/clip-package-qa/SKILL.md`
- Create: `.claude/skills/manga-to-video/SKILL.md` (orchestrator)
- Create: `CLAUDE.md`

**Interfaces:**
- Orchestrator phases 0–6 per design
- Partial re-run rules
- Test scenarios (happy + error)

- [x] **Step 1:** Write worker skills
- [x] **Step 2:** Write orchestrator with follow-up trigger keywords
- [x] **Step 3:** CLAUDE.md pointer only
- [x] **Step 4:** Commit `feat: add manga-to-video harness skills`

---

### Task 5: Verification dry-run checklist

- [x] **Step 1:** `node scripts/validate-export.mjs fixtures/sample-export`
- [x] **Step 2:** Confirm `_ref/` not modified (`git status` under ref if present)
- [x] **Step 3:** Structure checklist (agents, skills, no `.claude/commands/`)

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Export convention | T1 |
| Schemas | T1 |
| Fixture + validate | T2 |
| Multi-shot 2–4 | T3/T4 multi-shot skill |
| 7-axis Kling | T3/T4 seven-axis |
| Clip package layout | T4 package skill |
| QA cross-check | T4 qa skill |
| Orchestrator + partial re-run | T4 orchestrator |
| CLAUDE.md pointer | T4 |
| No upstream edits | Global + T5 |

## Execution note

This plan was executed inline in the same session as writing (user requested plan + harness in one go). Checkboxes marked complete as deliverables land.
