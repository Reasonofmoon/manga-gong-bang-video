# Manga Gong-Bang Export Convention (v1.0)

원본 앱(`manga-gong-bang`)을 **수정하지 않고**, 이 레포의 영상 클립 패키지 파이프라인이 읽을 수 있는 스냅샷을 만드는 규약입니다.

## 왜 필요한가

만화 공방은 브라우저 IndexedDB에 상태를 둡니다. 영상 레이어는 그 내부를 추측하지 않고, **문서화된 폴더/ZIP**만 신뢰합니다.

## 디렉터리 구조

```
export/
├── meta.json              # 필수
├── pages/                 # 필수
│   ├── page-00-cover.webp
│   ├── page-01.webp
│   └── ...
└── characters/            # 권장 (캐릭터 일관성)
    ├── hero.webp
    ├── friend.webp
    └── friend2.webp
```

이미지 확장자: `.webp` 권장, `.png` / `.jpg` / `.jpeg` 허용. `meta.json`의 `imageFile` 경로와 실제 파일이 일치해야 합니다.

## meta.json 최소 예시

```json
{
  "schemaVersion": "1.0",
  "source": "manga-gong-bang",
  "exportedAt": "2026-07-28T00:00:00.000Z",
  "project": {
    "title": "My Story",
    "genre": "사이버펑크 스릴러",
    "tone": "짧고 강렬하게",
    "language": "ko-KR",
    "stylePreset": "사이버네온",
    "stylePrompt": "cyberpunk neon glow aesthetic, holographic UI elements"
  },
  "characters": [
    {
      "role": "hero",
      "name": "Aya",
      "desc": "Young woman, short black hair, leather jacket",
      "imageFile": "characters/hero.webp"
    }
  ],
  "pages": [
    {
      "id": "cover-1",
      "type": "cover",
      "pageIndex": 0,
      "imageFile": "pages/page-00-cover.webp",
      "beat": {
        "scene": "Hero stands on neon rooftop overlooking rainy city",
        "caption": "NEON RAIN",
        "focus_char": "hero",
        "choices": []
      }
    },
    {
      "id": "page-1",
      "type": "story",
      "pageIndex": 1,
      "imageFile": "pages/page-01.webp",
      "isDecisionPage": false,
      "beat": {
        "scene": "Aya chases a data courier through alleys",
        "dialogue": "Stop right there!",
        "focus_char": "hero",
        "choices": []
      }
    }
  ]
}
```

## 필드 규칙

| 필드 | 규칙 |
|------|------|
| `schemaVersion` | 현재 `"1.0"`만 지원 |
| `pages[].type` | `cover` \| `story` \| `back_cover` |
| `pages[].beat.scene` | `type=story`이면 **필수** (비어 있으면 hard fail) |
| `characters[].role` | `hero` \| `friend` \| `friend2` |
| 경로 | `meta.json` 기준 **상대 경로** |

## 만화 공방에서 수동으로 만드는 법

1. 브라우저에서 생성 완료된 페이지 이미지를 저장(우클릭 저장 또는 앱의 ZIP/PDF 기능이 있으면 페이지 이미지 추출).
2. 각 페이지의 장면 설명·대사·캡션을 메모해 `beat`에 옮긴다. (앱 UI의 내러티브 텍스트 기준)
3. 캐릭터 레퍼런스 이미지가 있으면 `characters/`에 넣는다.
4. 위 스키마로 `meta.json`을 작성한다.
5. 폴더를 그대로 쓰거나 `export.zip`으로 압축한다. (ZIP 사용 시 압축 루트에 `meta.json`이 오도록)

> 선택: 나중에 이 레포의 추출 헬퍼가 IndexedDB dump를 지원할 수 있다. 실패 시 **이 규약 수동 export가 정본**이다.

## 검증

```bash
node scripts/validate-export.mjs path/to/export
# or
npm run validate:export -- path/to/export
```

Fixture:

```bash
npm run validate:fixture
```

## 파이프라인 연결

유효한 export → `manga-to-video` 오케스트레이터 스킬 → `clip-package/{projectSlug}/` (Kling 프롬프트 패키지).
