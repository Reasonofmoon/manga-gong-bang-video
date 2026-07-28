# Kling notes (MVP)

도구 UI/API는 자주 바뀐다. 이 문서는 **프롬프트 패키지 가이드**용 실무 기본값이다.

## 강점 (프롬프트 가중치)
- 인물 표정·제스처·립 관련 모션
- 사실적 인물 중심 샷
- 동작 축(SUBJECT motion + camera move)을 명확히

## 권장 durationSec
| purpose | durationSec |
|---------|-------------|
| establish | 5 |
| action | 5–10 |
| reaction | 5 |
| transition | 5 |
| detail | 5 |

가이드에 “Kling 슬라이더/프리셋에 맞게 5s 또는 10s로 반올림” 명시.

## I2V
- ref-page 이미지를 첫 프레임/스타일 레퍼런스로 사용
- 급격한 180° 카메라 스핀 지양 (아티팩트)
- 다중 인물보다 주 focus_char 1명 + 배경 인물 약하게

## Negative (기본)
```
blurry, low quality, distorted face, extra limbs, extra fingers, watermark, text overlay, logo, cropped head, morphing identity, flicker, jittery camera, deformed anatomy
```

## Seed
- 시리즈 연속성: 동일 시드 시도 후 맘에 드는 값 기록
- `seedHint` 예: "lock seed after first approved establish shot for this character"

## 언어
영문 프롬프트 권장. 패키지의 dialogueNote는 편집자용 원문 유지 가능.
