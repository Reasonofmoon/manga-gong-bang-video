---
name: clip-package-qa
description: "클립 패키지 경계면 QA: breakdown vs 7축 vs 파일 트리 교차 검증, 샷 수 2~4, 7축 누락, prompt/negative 존재, continuity 모순, draft/ready 판정. 'QA', '패키지 검수', '검증 리포트', clip package review, 품질 게이트 시 반드시 사용. 존재 확인만이 아니라 교차 비교. 후속: 수정 후 재QA, 부분 샷만 재검증."
---

# clip-package-qa

## 목적
잘못된 패키지가 “완료”로 handoff 되는 것을 막는다.

## 검증 순서
1. **Ingest 잔존 오류** — story scene 공백이 남아 있으면 critical
2. **샷 수** — story 2–4, cover/back 1–2; breakdown과 package 샷 수 일치
3. **파일 세트** — 각 샷 폴더에 shot.json, prompt.txt, negative.txt, guide.md
4. **스키마** — shotId 패턴, axes 7키, duration 1–15
5. **교차** — breakdown purpose/intent가 prompt motion/camera에 반영되었는지
6. **Continuity** — 캐릭 토큰·의상이 페이지 내에서 급변하면 warn/fail
7. **스크립트** — `validate-shot.mjs` 샘플 또는 전수

## 리포트 형식 (`04_qa_report.md`)
```markdown
# QA Report
- status: ready | draft
- critical: ...
- warnings: ...
- shot coverage table
- recommended re-run: Phase N / pageIndex list
```

## 판정
| 조건 | status |
|------|--------|
| critical 0 | ready 가능 |
| critical ≥1 | draft 강제 |
| warnings only | ready 가능, handoff에 경고 표시 |

## 금지
- “파일 개수 = 페이지 수”만 보고 통과
- critical를 사용자 확인 없이 숨기기
