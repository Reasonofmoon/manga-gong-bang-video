---
name: seven-axis-kling
description: "CG 마스터 레시피 7축(Subject|Camera|Lighting|Color|Texture|Motion|Mood)으로 Kling 전용 영문 영상 프롬프트·네거티브·duration/seed 가이드 작성. 스타일 시그니처 매핑, 캐릭 연속성. '7축', 'Kling 프롬프트', 'seven-axis', 시네마틱 프롬프트, negative prompt 작성/수정/재작성 시 반드시 사용. Sora/Runway 변환 요청이 와도 MVP는 Kling only 고수. 후속: 축만 수정, 톤 개선."
---

# seven-axis-kling

## 목적
breakdown 샷을 **Kling에 붙여 넣을 수 있는** 구조화 프롬프트로 바꾼다.

## 필수 참조 (필요 시 Read)
- `references/kling-notes.md` — 길이, I2V, negative 기본
- `references/style-signature-map.md` — genre/stylePreset → signature

## 7축 작성 순서
1. SUBJECT — 누구/무엇 + 캐릭 desc 앵커 + 환경
2. CAMERA — 초점거리, 샷 사이즈, 앵글, 무빙 (구체적 수치·용어)
3. LIGHTING — 광원·방향·질
4. COLOR — 제한 팔레트 2–4색
5. TEXTURE — 매체/표면 질감
6. MOTION — 피사체 움직임 + 카메라 모션 (영상 핵심)
7. MOOD — 서술형 감정 (단어 나열보다 짧은 구)

최종 `prompt.txt` 권장 형식:

```text
[SUBJECT] | [CAMERA] | [LIGHTING] | [COLOR] | [TEXTURE] | [MOTION] | [MOOD]
```

영어 작성. 한국어 beat는 번역·압축해 축에 녹인다.

## 최소 필수
Style signature + Camera + Lighting 은 절대 비우지 않는다. MVP에서는 **7축 전부** 채운다.

## Negative 기본 시드
`references/kling-notes.md` 기본 negative에 장면 특화 금지 요소를 덧붙인다.

## Continuity
- 동일 캐릭 의/의상 토큰을 샷 간 반복
- focus_char 변경 시에만 주 피사체 전환을 명시
- I2V: ref는 페이지 이미지; guide에 “use image as first frame / style lock” 메모

## 금지
- 책 PDF 템플릿 원문 대량 복사
- 다른 비디오 모델 프롬프트 방언으로 분기 (MVP)
- 빈 축 또는 “cinematic, beautiful” 같은 무의미 단독 토큰만으로 축 채우기
