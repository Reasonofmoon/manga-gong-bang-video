# manga-gong-bang-video

만화 공방(`manga-gong-bang`) 산출물을 **수정 없이** 받아 Kling용 영상 **클립 패키지**를 만드는 후처리 워크스페이스.

## 하드 제약

- `_ref/manga-gong-bang` 및 업스트림 원본 앱/레포 **수정 금지**
- MVP 산출물: `clip-package/` (프롬프트·샷리스트·가이드) — 최종 mp4 자동 조립 없음
- 렌더러: **Kling only**

## 하네스: manga → video clip package

**목표:** export 규약 입력 → 멀티샷(2–4) → 7축 Kling 프롬프트 → clip-package handoff

**트리거:** 만화 영상화, clip-package, Kling 샷리스트, export 후처리, manga-to-video 관련 요청 시 **`manga-to-video`** 스킬을 사용하라. 단순 규약/검증 질문만이면 `export-ingest` 또는 `validate:export`로 충분할 수 있다.

**스펙:** `docs/superpowers/specs/2026-07-28-manga-to-video-clip-package-design.md`  
**계획:** `docs/superpowers/plans/2026-07-28-manga-to-video-clip-package.md`  
**규약:** `docs/export-convention.md`

**변경 이력:**

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-28 | 초기 하네스 구성 (agents 5 + skills 6 + schemas + fixture + validate) | 전체 | 스펙 승인 후 MVP 구축 |
