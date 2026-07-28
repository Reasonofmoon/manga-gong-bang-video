# manga-gong-bang-video

만화 공방(`manga-gong-bang`) 산출물을 **수정 없이** 받아 Kling용 영상 **클립 패키지**를 만드는 후처리 워크스페이스.

## 최종 목표 (등록)

**원문:** [`docs/GOAL.md`](docs/GOAL.md) · 로드맵: [`tasks/GOAL-ROADMAP.md`](tasks/GOAL-ROADMAP.md)

> 만화 공방 산출물을 원본 수정 없이 → 멀티샷(2–4) → Kling 7축 프롬프트 **clip-package** 재현 생산.  
> 최종 mp4/NLE 자동 조립은 MVP 밖. G7(실 export E2E)이 열린 게이트.

**운영 원샷:**

```bash
node scripts/run-pipeline.mjs --export <EXPORT_DIR>
```

플레이스홀더 경로(`실제경로`, `C:\...\export`)는 거부한다. 실 경로 또는 `exports/inbox/<name>`.

## 하드 제약

- `_ref/manga-gong-bang` 및 업스트림 원본 앱/레포 **수정 금지**
- MVP 산출물: `clip-package/` (프롬프트·샷리스트·가이드) — 최종 mp4 자동 조립 없음
- 렌더러: **Kling only**

## 하네스: manga → video clip package

**목표:** 위 최종 목표와 동일 (export → 멀티샷 → 7축 Kling → clip-package handoff)

**트리거:** 만화 영상화, clip-package, Kling 샷리스트, export 후처리, manga-to-video 관련 요청 시 **`manga-to-video`** 스킬을 사용하라. 단순 규약/검증 질문만이면 `export-ingest` 또는 `validate:export`로 충분할 수 있다.

**스펙:** `docs/superpowers/specs/2026-07-28-manga-to-video-clip-package-design.md`  
**계획:** `docs/superpowers/plans/2026-07-28-manga-to-video-clip-package.md`  
**규약:** `docs/export-convention.md`

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-28 | 초기 하네스 구성 (agents 5 + skills 6 + schemas + fixture + validate) | 전체 | 스펙 승인 후 MVP 구축 |
| 2026-07-28 | assemble-clip-package를 breakdown+drafts 입력으로 일반화; run 노트 추가 | scripts/, docs/runs/ | fixture E2E 후 제안 실행 |
| 2026-07-28 | bootstrap-workspace-from-export CLI; EXPORT_DIR 파이프라인 run 20260728-192715 | scripts/bootstrap-*.mjs | 경로 미지정 시 fixture로 전체 재실행 |
| 2026-07-28 | 최종 목표 등록 docs/GOAL.md + run-pipeline.mjs + exports/inbox | docs/, scripts/, tasks/ | 목표 명시·운영 가동 |
