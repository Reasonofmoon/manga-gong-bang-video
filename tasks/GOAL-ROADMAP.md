# Goal roadmap — manga-gong-bang-video

최종 목표 원문: [`docs/GOAL.md`](../docs/GOAL.md)

## Now (등록·가동)

- [x] 최종 목표 문서 등록 (`docs/GOAL.md`)
- [x] CLAUDE.md 포인터
- [x] `scripts/run-pipeline.mjs` 원샷 파이프라인
- [x] `exports/inbox` 수신 규약
- [x] Fixture E2E 검증 완료

## Next (사용자 입력 의존)

- [ ] 실 `EXPORT_DIR` 수령
- [ ] 실 export `run-pipeline` 1회
- [ ] (선택) 7축 refinement 후 assemble 재실행
- [ ] 사용자 Kling + CapCut 조립

## Later (목표 이후 확장 — 아직 착수 금지)

- Kling API 반자동 다운로드 → 설계: `docs/guides/C-kling-api-minimal-web.md` (M1+)
- 패널 단위 크롭
- 다중 렌더러

## Guides

- [x] A 수동 Kling 실습: `docs/guides/A-kling-manual-practice.md`
- [x] C 최소 웹 설계: `docs/guides/C-kling-api-minimal-web.md`
- [ ] C M1 구현 (요청 시)
