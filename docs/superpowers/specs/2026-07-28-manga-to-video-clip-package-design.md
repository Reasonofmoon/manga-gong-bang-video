# Manga → Video Clip Package Design

**Date:** 2026-07-28  
**Status:** Approved (design dialogue)  
**Workspace:** `manga-gong-bang-video`  
**Reference app (read-only):** `_ref/manga-gong-bang` ← clone of `https://github.com/Reasonofmoon/manga-gong-bang.git`  
**Method source:** CG 마스터 레시피 (제갈자룡) — 7-axis prompt system (methodology only; do not redistribute book text)

---

## 1. Problem & Goal

### Problem
`manga-gong-bang` (만화 공방) generates interactive AI comics (premise → beats → page images) but stops at still pages. Turning those pages into cinematic AI video requires a structured shot language, Kling-ready prompts, and a reproducible package for manual editing.

### Goal
Build a **post-processing video layer** in this repository that:

1. Ingests manga-gong-bang outputs **without modifying the original app or repo**.
2. Breaks each page into **2–4 cinematic shots**.
3. Writes **7-axis** Kling-optimized prompts (Subject | Camera | Lighting | Color | Texture | Motion | Mood).
4. Emits a **clip package** (shotlist, prompts, negatives, duration/seed guides, continuity notes, editor checklist).
5. Orchestrates the work via an **agent harness** (agents + skills + orchestrator).

### Non-goals (MVP)
- Any code change to `manga-gong-bang` / upstream GitHub repo
- Fully automatic Kling render + download orchestration as the definition of done
- CapCut/Premiere timeline automation
- Multi-tool adapters (Sora, Runway, Pika, Luma)
- TTS / BGM / lip-sync generation
- Redistributing the full CG Master Recipe book content

---

## 2. Decisions (locked)

| Topic | Decision |
|-------|----------|
| Product shape | Manga → video **post pipeline** (Approach A) |
| Architecture | **Convention + harness packager** (Approach 1) |
| Renderer | **Kling only** |
| MVP completion | **Clip package** (semi-auto Kling use; manual NLE assembly) |
| Input | **Export convention** (ZIP/folder; optional best-effort browser extract) |
| Shot unit | **Multi-shot**: 2–4 shots per story page (cover 1–2 allowed) |
| Prompt grammar | CG Master Recipe **7-axis** system |
| Original app | **Immutable**; only `_ref/` read access |

---

## 3. Architecture

```
[manga-gong-bang app] ──(never modified)──▶ user export
                                              │
                                              ▼
                                   export.zip | export folder
                                   (meta.json + pages/* [+ characters/*])
                                              │
                                              ▼
                    ┌─────────────────────────────────────────┐
                    │  manga-gong-bang-video                  │
                    │  Ingest → Multi-shot → 7-axis → Package │
                    │  → QA → Handoff                         │
                    └─────────────────────────────────────────┘
                                              │
                                              ▼
                              clip-package/{projectSlug}/
                                              │
                      user pastes into Kling / optional stub
                                              │
                                              ▼
                              CapCut / Premiere (manual)
```

### Principles
- **Source immutability:** never edit `_ref/manga-gong-bang` or push to upstream manga-gong-bang for this feature set.
- **Convention-first:** only documented export schema is authoritative input.
- **MVP = package:** success is a complete handoff folder, not a final MP4.
- **Kling-only guides:** duration, negative prompts, and I2V tips target Kling.
- **File-based agent collaboration:** intermediate artifacts under `_workspace/`.
- **Methodology, not piracy:** encode 7-axis *rules* in skills; do not paste book template corpora.

### Repo layout (target)

```
manga-gong-bang-video/
├── _ref/manga-gong-bang/     # read-only clone (gitignored or documented)
├── docs/
│   ├── superpowers/specs/    # this design
│   └── export-convention.md  # user-facing export guide (impl)
├── schemas/                  # JSON schemas for meta / shot / package
├── fixtures/                 # minimal sample export
├── scripts/                  # validate-export, optional kling stub
├── clip-package/             # generated outputs (gitignore large binaries if needed)
├── _workspace/               # run intermediates
├── .claude/agents/           # harness agents
├── .claude/skills/           # harness skills + orchestrator
└── CLAUDE.md                 # harness pointer only
```

---

## 4. Data contracts

### 4.1 Export package (input)

**Canonical form:** `export.zip` or equivalent folder tree.

```
export/
├── meta.json                 # required
├── pages/
│   ├── page-00-cover.webp
│   ├── page-01.webp
│   └── ...
└── characters/               # recommended
    ├── hero.webp
    ├── friend.webp
    └── friend2.webp
```

**`meta.json` fields (v1.0):**

| Path | Required | Notes |
|------|----------|--------|
| `schemaVersion` | yes | `"1.0"` |
| `source` | yes | e.g. `"manga-gong-bang"` |
| `exportedAt` | yes | ISO-8601 |
| `project.title` | yes | |
| `project.genre` | yes | |
| `project.tone` | yes | |
| `project.language` | yes | e.g. `ko-KR` |
| `project.stylePreset` | recommended | maps from STYLE_PRESETS name |
| `project.stylePrompt` | optional | English style string |
| `characters[]` | recommended | `role`, `desc`, `imageFile`, optional name/outfit/props |
| `pages[]` | yes | ordered story material |
| `pages[].id` | yes | stable id |
| `pages[].type` | yes | `cover` \| `story` \| `back_cover` |
| `pages[].pageIndex` | yes | number |
| `pages[].imageFile` | yes | relative path; file must exist |
| `pages[].isDecisionPage` | optional | boolean |
| `pages[].resolvedChoice` | optional | string |
| `pages[].beat.scene` | required for `story` | visual action description |
| `pages[].beat.dialogue` | optional | |
| `pages[].beat.caption` | optional | |
| `pages[].beat.focus_char` | optional | `hero` \| `friend` \| `friend2` \| `other` |
| `pages[].beat.choices` | optional | array |

**Ingest priority:**
1. User-provided ZIP/folder matching this convention (**canonical**).
2. Best-effort helper reading browser/IndexedDB dump if available — **never** silent guess on failure; fall back to (1) with a clear report.
3. Incomplete exports: hard-fail or warn+skip per validation matrix (see §6).

**App constraint:** Do **not** add an Export button to manga-gong-bang. Document how users can assemble the package (manual assemble / optional extract script in *this* repo only).

Alignment with reference types (`types.ts`):
- `ComicFace` → `pages[]` (+ image files)
- `Beat` → `pages[].beat`
- `Persona` → `characters[]`
- `STYLE_PRESETS` / genre / tone → `project.*`

### 4.2 Clip package (output, MVP deliverable)

```
clip-package/{projectSlug}/
├── package.json
├── shotlist.md
├── continuity.md
├── editor-checklist.md
└── shots/
    └── S01_p00_s01/
        ├── shot.json
        ├── prompt.txt
        ├── negative.txt
        ├── guide.md
        └── ref-page.webp          # or documented relative ref
```

**Shot ID format:** `S{global:02d}_p{pageIndex:02d}_s{shotInPage:02d}`  
Example: `S03_p01_s02` = global shot 3, page 1, local shot 2.

**`shot.json` required concepts:**

| Field | Description |
|-------|-------------|
| `shotId` | ID as above |
| `sourcePageId` / `pageIndex` | Link to export page |
| `shotInPage` / `shotsInPage` | Position within 2–4 (or 1–2 for cover) |
| `purpose` | e.g. `establish` \| `action` \| `reaction` \| `transition` |
| `durationSec` | Recommended length for Kling (document allowed range in skill) |
| `axes` | Object with seven keys: subject, camera, lighting, color, texture, motion, mood |
| `prompt` | Final English Kling prompt (pipe-separated 7-axis or equivalent dense form) |
| `negative` | Negative prompt string |
| `styleSignature` | Mapped style block (genre + preset + optional CG signature name) |
| `refImage` | Path to page (or character) reference for I2V |
| `dialogueNote` | Editor-facing caption/dialogue note (not TTS script requirement) |
| `seedHint` | Seed strategy notes for reproducibility |

**`package.json`:** project metadata, ordered shot index, `schemaVersion`, generatedAt, harness/version stamp.

### 4.3 Workspace intermediates

```
_workspace/{runId}/
├── 00_ingest_report.json
├── 01_story_breakdown.json
├── 02_axes_drafts/
├── 03_kling_package/
└── 04_qa_report.md
```

Naming principle: `{phase}_{agent}_{artifact}` where applicable; the slots above are fixed pipeline outputs.

---

## 5. Pipeline & agent team

### 5.1 Execution mode
**Hybrid:** sequential pipeline phases; optional parallel shot writing within a page batch; final **generate–verify** QA gate.  
Default coordination: **agent team** + file artifacts.

### 5.2 Phases

| Phase | Name | Responsibility | Primary output |
|-------|------|----------------|----------------|
| 0 | Context | Detect initial / partial re-run / new export | mode decision |
| 1 | Ingest & Validate | Schema + file existence + normalize | `00_ingest_report.json` |
| 2 | Multi-shot breakdown | Page → 2–4 shots with purpose & emotion arc | `01_story_breakdown.json` |
| 3 | 7-axis writing | Axes + Kling EN prompt + negative + continuity | `02_axes_drafts/*` |
| 4 | Package assembly | Build `clip-package/` tree + human docs | `clip-package/{slug}/` |
| 5 | QA gate | Cross-check breakdown ↔ prompts ↔ files | `04_qa_report.md` |
| 6 | Handoff | Instruct user on Kling + NLE order | console/report |

### 5.3 Agents

| Agent file (planned) | Role |
|----------------------|------|
| `ingest-validator` | Validate and normalize export |
| `shot-breakdown` | Cinematic multi-shot decomposition |
| `seven-axis-writer` | 7-axis + Kling prompt craft |
| `package-assembler` | Emit clip-package tree |
| `continuity-qa` | Boundary QA (not mere existence checks) |

**Orchestrator skill:** `manga-to-video` — team lead, phase order, partial re-runs, handoff.

### 5.4 Skills (planned)

| Skill | Purpose |
|-------|---------|
| `manga-to-video` | Orchestrator triggers + full workflow |
| `export-ingest` | Convention validation rules |
| `multi-shot-breakdown` | 2–4 shot rules, cover exceptions |
| `seven-axis-kling` | 7-axis grammar + Kling-specific notes |
| `clip-package-export` | Package layout + markdown generators |
| `clip-package-qa` | Cross-surface assertions |

Agents = *who*; skills = *how*. `CLAUDE.md` holds only harness pointer + changelog.

### 5.5 Data movement
- **Files:** all structured artifacts (audit + re-run)
- **Tasks:** phase dependencies / progress
- **Messages:** short coordination (“page 3 over shot budget”)
- Images: prefer path references; copy into shot folders when needed for portable ZIP handoff

### 5.6 Partial re-runs

| Request | Rerun |
|---------|--------|
| Re-break shots only | Phase 2–5 (optionally page-filtered) |
| Re-prompt only | Phase 3–5 |
| Re-pack only | Phase 4–5 |
| New export | Move `_workspace` → `_workspace_prev/`, Phase 1+ |

### 5.7 Error policy
1. Ingest hard-fail → stop with fix guide  
2. Single page Phase 2/3 failure → one retry → skip + list in QA  
3. QA critical (missing prompts, invalid shot counts) → mark package `draft`, block “ready” handoff  
4. Upstream app/network issues are out of scope once export snapshot exists  

---

## 6. Validation matrix

| Check | Severity |
|-------|----------|
| Unsupported / missing `schemaVersion` | hard fail |
| Missing `meta.json` or `pages[]` empty | hard fail |
| `imageFile` path missing on disk | hard fail |
| Story page missing `beat.scene` | hard fail |
| Cover/back without rich beat | allow thinner beats; 1–2 shots |
| Story shots outside 2–4 | hard fail at QA (breakdown must correct) |
| Shot missing any of 7 axes | QA fail |
| Missing `prompt.txt` / `negative.txt` | QA fail |
| Continuity contradiction (outfit/focus_char flip without note) | QA warn or fail by severity |

---

## 7. 7-axis prompt rules (operational)

Prompts for Kling are **English-first** (tool stability). Structure:

```text
[SUBJECT] | [CAMERA] | [LIGHTING] | [COLOR] | [TEXTURE] | [MOTION] | [MOOD]
```

Plus optional technical trailer: aspect ratio, duration intent, quality tokens per Kling notes in skill references.

**Minimum viable cinematic control:** style signature (from genre/stylePreset mapping), camera, lighting — always present; all seven preferred.

**Multi-shot continuity:**
- Lock character visual anchors from `characters[].desc` + ref images  
- Progress camera/emotion across local shots (establish → action → reaction)  
- Carry palette/texture from project style unless beat demands shift  
- `dialogueNote` for editors; motion axis may mention mouth/gesture only when beat has dialogue  

**Style mapping:** map `stylePreset` / genre keywords to an internal signature table in `seven-axis-kling` references (e.g. cel anime, noir, cyber neon) — derived from manga-gong-bang presets + 7-axis method, not copied book chapters.

**PDF usage:** internal skill guidance only; no bulk copy of the 400 templates into the repo.

---

## 8. Success criteria (MVP done)

1. Documented export convention + fixture that passes ingest.  
2. Every story page yields **2–4** structured shots (cover **1–2**).  
3. Every shot has 7-axis data, English Kling prompt, negative, duration/seed guide, ref mapping.  
4. `clip-package/{slug}/` includes `shotlist.md` and `editor-checklist.md` sufficient for human NLE handoff.  
5. QA report covers schema, files, shot counts, axis gaps, continuity issues.  
6. **No commits that modify** `_ref/manga-gong-bang` source for product features.

---

## 9. Testing strategy

| Type | Content |
|------|---------|
| Fixture | ≥3 pages: cover + story + decision page |
| Schema tests | meta / shot / package JSON Schema (or Zod) |
| Dry-run | fixture → full phases → tree assertions |
| Negative QA | missing image, empty scene, 1 or 5 shots |
| Harness triggers | orchestrator should / should-not queries |

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| IndexedDB extract brittle | ZIP convention is source of truth |
| Multi-shot cost/token | Hard cap 4 shots/page; page filters on re-run |
| Character drift | character refs + continuity.md + focus_char |
| Copyright on PDF | methodology encoding only |
| Kling API/UI drift | isolate tool notes in skill `references/` |
| Accidental upstream edits | `_ref` read-only policy; CI/docs warning |

---

## 11. Implementation sequence (next)

After this spec is user-reviewed:

1. **writing-plans** — detailed implementation plan  
2. Schemas + fixture + `scripts/validate-export`  
3. Harness: agents, skills, orchestrator, `CLAUDE.md` pointer  
4. Dry-run on fixture  
5. Optional: Kling call **stub** (env API key only; not MVP gate)

---

## 12. Open items (resolved in dialogue)

All product forks were resolved in brainstorming:

- Approach A + Architecture 1  
- Kling only  
- Package MVP  
- Export convention input  
- Multi-shot 2–4  

**Remaining implementation details** (not product forks): exact JSON Schema files, Kling duration enum values, style-signature table rows — to be fixed in the implementation plan / first harness iteration without changing MVP boundaries.

---

## 13. References

- Upstream comic app: https://github.com/Reasonofmoon/manga-gong-bang.git  
- Local read-only clone: `_ref/manga-gong-bang`  
- Key source types: `_ref/manga-gong-bang/types.ts` (`ComicFace`, `Beat`, `Persona`, `STYLE_PRESETS`)  
- Generation engine (reference only): `_ref/manga-gong-bang/aiEngine.ts`  
- CG Master Recipe PDF (user local path): 7-axis system Ch.1–2 methodology
