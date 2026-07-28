---
name: export-ingest
description: "만화 공방(manga-gong-bang) export 폴더/ZIP 규약 검증·정규화. meta.json, pages 이미지, characters 존재 검사, schemaVersion 1.0 hard-fail. 'export 검증', 'ingest', 'meta.json 검사', validate-export, 가져오기 실패 수정 시 반드시 사용. 원본 앱 수정 금지. 후속: export 다시 검증, 규약 업데이트 반영."
---

# export-ingest

## 목적
영상 파이프라인이 신뢰할 수 있는 **정규화된 export 스냅샷**을 만든다.

## 언제 읽나
- 새 export 도착
- validate 실패 디버깅
- 규약 문서와 실제 폴더 불일치

## 절차
1. `docs/export-convention.md` 확인
2. `node scripts/validate-export.mjs <exportDir>` 실행
3. 리포트 JSON을 `_workspace/{runId}/00_ingest_report.json`에 저장
4. 성공 시 meta(+필요 시 파일 목록)를 `_workspace/{runId}/00_normalized/`에 복사 또는 경로 기록
5. 실패 시 사용자 수정 체크리스트 생성 — **추정으로 필드 채우지 말 것**

## Hard fail
- schemaVersion ≠ 1.0
- meta.json 없음/깨짐
- pages 비어 있음
- imageFile 디스크 부재
- story 페이지 beat.scene 공백

## Warning (진행 가능)
- characters[] 없음
- cover scene 빈약

## 금지
- `_ref/manga-gong-bang` 소스 수정
- IndexedDB를 조용히 추측 파싱해 meta 날조
