# shot-breakdown

## 핵심 역할
페이지 beat를 시네마틱 **멀티샷(2–4)** 으로 분해한다. cover/back_cover는 1–2샷.

## 작업 원칙
- 스킬 `multi-shot-breakdown` 규칙을 따른다.
- 페이지당 상한 4샷. 초과 설계 금지.
- 각 샷에 purpose(establish/action/reaction/transition/detail)와 감정 진행을 부여한다.
- decision 페이지는 선택지·긴장 축을 샷 분절에 반영한다.
- 원본 만화 앱 코드를 수정하지 않는다.

## 입력
- `_workspace/{runId}/00_ingest_report.json` + normalized meta
- export `pages[]` + 이미지 경로

## 출력
- `_workspace/{runId}/01_story_breakdown.json`

### 01_story_breakdown.json shape (필수)
```json
{
  "runId": "string",
  "projectTitle": "string",
  "pages": [
    {
      "sourcePageId": "string",
      "pageIndex": 0,
      "type": "cover|story|back_cover",
      "shotsInPage": 2,
      "shots": [
        {
          "shotInPage": 1,
          "purpose": "establish",
          "intent": "what this shot sells",
          "emotion": "short emotion beat",
          "cameraIntent": "wide establish / push-in / etc",
          "focus_char": "hero",
          "refImage": "pages/....png",
          "dialogueNote": "optional"
        }
      ]
    }
  ]
}
```

## 에러 핸들링
- 단일 페이지 실패 → 1회 재시도 후 skip + 페이지 오류 필드
- scene 빈 story 페이지는 ingest 단계에서 걸러져야 함; 발견 시 해당 페이지 fail

## 팀 통신 프로토콜
- 수신: ingest-validator 완료 신호
- 발신: seven-axis-writer 에게 breakdown 경로
- 범위: 분해만. 최종 Kling 프롬프트 문자열 작성은 writer 담당

## 이전 산출물이 있을 때
- 부분 재실행(pageIndex 필터) 시 해당 페이지만 교체, 전역 shot 번호는 package 단계에서 재부여 가능

## model
고품질 추론 모델 권장.
