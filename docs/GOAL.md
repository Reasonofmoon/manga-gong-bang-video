# 최종 목표 (Final Goal)

**등록일:** 2026-07-28  
**상태:** MVP 인프라 완료 · 실 export 대기 / 운영 파이프라인 가동 중  
**프로젝트:** `manga-gong-bang-video`

---

## 한 줄 목표

> **만화 공방(`manga-gong-bang`) 산출물을 원본 앱 수정 없이 받아, 페이지당 2–4 멀티샷의 Kling용 7축 프롬프트 클립 패키지(`clip-package/`)를 재현 가능하게 생산한다.**  
> 최종 편집(CapCut/Premiere)과 Kling 렌더는 사람 핸드오프. 자동 최종 mp4는 MVP 범위 밖.

---

## 성공 정의 (Done when)

| # | 조건 | 현재 |
|---|------|------|
| G1 | Export 규약 + validate CLI | ✅ |
| G2 | Multi-shot breakdown (story 2–4, cover 1–2) | ✅ (bootstrap/agents) |
| G3 | 7축 Kling 영문 프롬프트 + negative + guide | ✅ |
| G4 | `clip-package/{slug}/` + shotlist + continuity + editor-checklist | ✅ |
| G5 | QA 리포트 (critical/warn, validate-shot) | ✅ |
| G6 | 원본 `_ref/manga-gong-bang` / 업스트림 **무수정** | ✅ 정책·준수 |
| G7 | **실제 만화 페이지 export** 1건 이상 end-to-end | ⏳ 사용자 EXPORT_DIR 대기 |
| G8 | (선택) 7축 drafts 에이전트 refinement 품질 루프 | ⏳ 운영 중 적용 |

---

## 비목표 (명시적)

- 만화 공방 앱 코드/레포 수정
- Sora/Runway 등 다중 렌더러
- CapCut 타임라인 자동 조립
- CG 마스터 레시피 도서 원문 재배포

---

## 표준 실행 경로 (등록된 운영 절차)

```text
EXPORT_DIR=<절대경로>   # 또는 exports/inbox 에 규약 폴더 배치 후 그 경로

node scripts/run-pipeline.mjs --export "%EXPORT_DIR%"
# = validate → bootstrap → assemble → QA 스텁 리포트

# 품질 업:
#  02_axes_drafts 를 manga-to-video / seven-axis-kling 로 다듬은 뒤
node scripts/assemble-clip-package.mjs <runId>
```

대안(단계별):

1. `node scripts/validate-export.mjs %EXPORT_DIR%`
2. `node scripts/bootstrap-workspace-from-export.mjs %EXPORT_DIR%`
3. (선택) 7축 refinement
4. `node scripts/assemble-clip-package.mjs <runId>`

---

## 현재 기준 산출물

| 항목 | 위치 |
|------|------|
| 스펙 | `docs/superpowers/specs/2026-07-28-manga-to-video-clip-package-design.md` |
| 하네스 | `.claude/skills/manga-to-video`, agents/* |
| Fixture dry-run package | `clip-package/neon-rain-fixture/` |
| 최신 workspace | `_workspace/20260728-192715/` |

---

## 다음 게이트

1. 사용자가 **실 EXPORT_DIR** 제공  
2. `run-pipeline.mjs`로 실 패키지 1건 생성  
3. 사용자가 Kling S01→Sn + NLE 조립  

이 게이트를 통과하면 **프로덕션 1호 클립 패키지**로 최종 목표의 G7이 닫힌다.
