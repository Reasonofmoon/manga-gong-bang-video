---
name: manga-to-video
description: "만화 공방 export→Kling 클립 패키지 전체 오케스트레이터. 만화 영상화, manga to video, clip-package 생성, 샷리스트, 7축 Kling 패키지, export 후처리 요청 시 반드시 사용. 후속: 다시 실행, 재실행, 업데이트, 수정, 보완, 페이지만 다시, 프롬프트만 다시, 패키지만 다시, 이전 결과 개선, QA 재검수. 원본 manga-gong-bang 수정 금지. MVP는 프롬프트 패키지까지(최종 mp4 조립 자동화 없음)."
---

# manga-to-video Orchestrator

만화 공방 산출물을 **수정 없이** 받아 Kling용 **멀티샷 클립 패키지**를 만드는 팀 리더 스킬.

## 실행 모드: 하이브리드

| Phase | 모드 | 이유 |
|-------|------|------|
| 0–1 Ingest | 서브/직접 | 결정적 검증 스크립트 + ingest-validator |
| 2 Breakdown | 에이전트 (shot-breakdown) | 창의적 분해 |
| 3 Seven-axis | 에이전트 (seven-axis-writer) | 프롬프트 품질 |
| 4 Package | 에이전트 (package-assembler) | 트리 조립 |
| 5 QA | 서브 (continuity-qa) | 독립 검증 |
| 6 Handoff | 리더 | 사용자 보고 |

팀 도구(TeamCreate 등)가 없는 런타임에서는 **동일 Phase 순서로 에이전트 정의 파일을 읽은 뒤 순차/병렬 서브에이전트**로 대체한다. 산출물 경로 계약은 유지한다.

## 글로벌 제약
- `_ref/manga-gong-bang` 및 업스트림 앱 **수정 금지**
- Kling only / MVP = clip package
- story 2–4 shots, cover/back 1–2
- 스펙: `docs/superpowers/specs/2026-07-28-manga-to-video-clip-package-design.md`

## 에이전트 구성

| 팀원 | 정의 파일 | 스킬 | 출력 |
|------|-----------|------|------|
| ingest-validator | `.claude/agents/ingest-validator.md` | export-ingest | `00_ingest_report.json` |
| shot-breakdown | `.claude/agents/shot-breakdown.md` | multi-shot-breakdown | `01_story_breakdown.json` |
| seven-axis-writer | `.claude/agents/seven-axis-writer.md` | seven-axis-kling | `02_axes_drafts/` |
| package-assembler | `.claude/agents/package-assembler.md` | clip-package-export | `clip-package/{slug}/` |
| continuity-qa | `.claude/agents/continuity-qa.md` | clip-package-qa | `04_qa_report.md` |

## 워크플로우

### Phase 0: 컨텍스트 확인
1. `_workspace/` 존재 여부
2. 모드:
   - 없음 → **초기 실행**
   - 있음 + 부분 수정 요청 → **부분 재실행** (해당 Phase/page만)
   - 있음 + 새 export → 기존을 `_workspace_prev/` 또는 타임스탬프 백업 후 **새 실행**
3. runId 결정 (예: ISO compact)

### Phase 1: Ingest
1. export 경로 확인 (없으면 `fixtures/sample-export`로 데모 가능 여부 사용자 확인)
2. 스킬 export-ingest + `node scripts/validate-export.mjs`
3. hard fail 시 중단

### Phase 2: Multi-shot breakdown
- 입력: normalized meta
- 출력: `01_story_breakdown.json`
- 스킬 multi-shot-breakdown

### Phase 3: 7-axis Kling writing
- 입력: breakdown + characters/style
- 출력: `02_axes_drafts/`
- 스킬 seven-axis-kling (+ references)

### Phase 4: Package assembly
- 출력: `clip-package/{slug}/`
- 스킬 clip-package-export
- `_workspace/{runId}/03_kling_package/manifest.json`에 slug 경로 기록

### Phase 5: QA
- 스킬 clip-package-qa
- critical → status draft, Phase 2/3 재실행 권고

### Phase 6: Handoff
사용자에게:
1. package 경로
2. shotlist 요약 (샷 수)
3. Kling 사용 순서 (shot 폴더 순 → prompt 붙여넣기 → ref 이미지)
4. CapCut/Premiere 수동 조립 안내
5. QA status

## 부분 재실행 맵
| 요청 | Phase |
|------|-------|
| 페이지만 다시 분해 | 2–5 |
| 프롬프트만 | 3–5 |
| 패키지만 | 4–5 |
| QA만 | 5 |

## 데이터 흐름
```
export → 00_ingest → 01_breakdown → 02_axes → clip-package → 04_qa → user
```

## 에러 핸들링
| 상황 | 전략 |
|------|------|
| Ingest fail | 중단 + 규약 링크 |
| 단일 페이지 실패 | 1회 재시도 후 skip + QA 명시 |
| QA critical | draft handoff, 재실행 제안 |
| 에이전트 실패 | 1회 재시도, 과반 실패 시 사용자 확인 |

## 테스트 시나리오

### 정상
1. `fixtures/sample-export` validate 통과
2. Phase 2–4로 최소 cover 1–2 + story pages 2–4 shots 패키지 생성
3. QA ready 또는 warning-only
4. `clip-package/neon-rain-fixture/` (또는 slug) 존재

### 에러
1. story scene 빈 export → Phase 1 hard fail
2. 의도적으로 샷 1개만 있는 breakdown → QA critical → draft

## 트리거 예
- "이 export로 영상 클립 패키지 만들어"
- "fixture로 manga-to-video 드라이런"
- "페이지 2 프롬프트만 다시"
