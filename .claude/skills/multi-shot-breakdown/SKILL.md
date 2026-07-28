---
name: multi-shot-breakdown
description: "만화 페이지 beat를 Kling용 시네마틱 멀티샷(스토리 2~4, 커버 1~2)으로 분해. establish/action/reaction/transition purpose, 감정 아크, 카메라 의도. '샷 분해', '멀티샷', '페이지를 클립으로', multi-shot, story breakdown 요청 시 반드시 사용. 후속: 특정 페이지만 다시 분해, 샷 수 조정."
---

# multi-shot-breakdown

## 목적
한 페이지 정지 화면을 **시간축 위의 여러 카메라 비트**로 나눈다.

## 샷 수 규칙
| page.type | shotsInPage |
|-----------|-------------|
| story | **2–4** (필수) |
| cover | 1–2 |
| back_cover | 1–2 |

## 분해 휴리스틱
1. **establish** — 공간·상황 소개 (보통 첫 샷)
2. **action** — beat.scene의 핵심 움직임
3. **reaction** — focus_char 감정/대사 반응 (dialogue 있을 때 강력 추천)
4. **transition** — 다음 페이지로 넘기는 브릿지 (decision·절정 페이지)

decision 페이지: 선택 압박을 카메라/시선 분리로 표현 (예: fork 와이드 → 얼굴 클로즈).

## 출력 계약
에이전트 `shot-breakdown`의 `01_story_breakdown.json` shape을 따른다.  
각 샷에 `refImage`는 **해당 페이지 이미지** (MVP에서 패널 크롭 없음).

## 품질 기준
- 같은 페이지 샷들이 **같은 사건**을 말하되 카메라/감정이 진행될 것
- “거의 같은 샷 3개” 금지 — purpose·cameraIntent가 구분되어야 함
- 전역 S## 번호는 package 단계에서 부여 가능; 여기선 page-local shotInPage 확정

## 금지
- 페이지당 5샷 이상
- 원본 앱 수정
- 최종 Kling 프롬프트 완성 책임 가져가기 (writer 영역)
