---
name: clip-package-export
description: "Kling 클립 패키지 폴더 조립: clip-package/{slug}/shots/S##_p##_s##, shot.json, prompt.txt, negative.txt, guide.md, shotlist.md, continuity.md, editor-checklist.md, package.json. '패키지 생성', 'shotlist', 'clip-package', 편집 체크리스트, CapCut handoff 요청 시 반드시 사용. 후속: 패키지만 다시 묶기, slug 변경, draft→ready 갱신."
---

# clip-package-export

## 목적
에이전트 초안을 **사람이 Kling + NLE로 쓸 수 있는 폴더**로 고정한다.

## 레이아웃
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
        └── ref-page.png
```

## shotId
`S{global:02d}_p{pageIndex:02d}_s{shotInPage:02d}`  
글로벌 번호는 package 조립 시 **재생 순서**로 01부터.

## projectSlug
title을 slugify: 소문자, 공백→`-`, 비안전 문자 제거. 예: `neon-rain-fixture`

## 파일 내용
- `prompt.txt` / `negative.txt`: 순수 텍스트 (마크다운 금지)
- `guide.md`: durationSec, seedHint, I2V 팁, purpose
- `shot.json`: `schemas/shot.schema.json` 필드
- `package.json`: `schemas/package.schema.json`, status `ready`|`draft`
- `shotlist.md`: 표 형식 (shotId, page, purpose, duration, one-line intent)
- `continuity.md`: 캐릭/의상/팔레트 고정 메모
- `editor-checklist.md`: Kling 생성 순서 → 파일명 저장 규칙 → CapCut 임포트 순서

## MVP 경계
- 최종 mp4 렌더/타임라인 자동화 없음
- (선택) `kling-jobs.json` stub 배열만 허용

## 검증
가능하면 각 shot.json에 `node scripts/validate-shot.mjs`
