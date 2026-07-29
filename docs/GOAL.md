# 최종 목표 (Final Goal)

**등록일:** 2026-07-28  
**갱신:** 2026-07-29 — G9 웹 배포 표면 확장 명시  
**상태:** Core MVP 완료 · G9 web 구현 · 실 export(G7) · live Kling 연동 대기  
**프로젝트:** `manga-gong-bang-video`

---

## 한 줄 목표

> **만화 공방(`manga-gong-bang`) 산출물을 원본 앱 수정 없이 받아, 페이지당 2–4 멀티샷의 Kling용 7축 프롬프트 클립 패키지(`clip-package/`)를 재현 가능하게 생산한다.**  
> 최종 편집(CapCut/Premiere)은 사람 핸드오프.  
> **Core MVP** 에서 자동 최종 mp4는 비목표.  
> **G9 확장** 은 웹 UI + job API(기본 mock; live는 어댑터 연동 후)를 허용한다.

---

## 성공 정의 (Done when)

| # | 조건 | 현재 |
|---|------|------|
| G1 | Export 규약 + validate CLI | ✅ |
| G2 | Multi-shot breakdown (story 2–4, cover 1–2) | ✅ |
| G3 | 7축 Kling 영문 프롬프트 + negative + guide | ✅ |
| G4 | `clip-package/{slug}/` + shotlist + continuity + editor-checklist | ✅ |
| G5 | QA 리포트 (critical/warn, validate-shot) | ✅ |
| G6 | 원본 `_ref/manga-gong-bang` / 업스트림 **무수정** | ✅ |
| G7 | **실제 만화 페이지 export** 1건 이상 end-to-end | ⏳ |
| G8 | (선택) 7축 drafts 에이전트 refinement 품질 루프 | ⏳ |
| **G9** | **최소 웹 배포 표면:** ZIP/fixture → pipeline → shotlist UI + Kling generate job API (`mock` 기본, `live` 훅) + Docker 배포 문서 | ✅ 구현 |

---

## MVP 경계: 유지 vs 확장 (명시)

### Core MVP — **유지** (변경 없음)

- 산출물 중심 = **clip-package** (프롬프트·샷리스트·가이드)
- CLI: `scripts/run-pipeline.mjs` 등
- CapCut 타임라인 **자동 조립 없음**
- 원본 만화 공방 **수정 없음**
- 다중 렌더러(Sora 등) **없음**

### G9 확장 — **명시적 추가** (2026-07-29)

| 허용 | 설명 |
|------|------|
| Next.js 앱 `web/` | 업로드·fixture·샷 목록·prompt 복사 |
| `/api/pipeline` | 기존 CLI 파이프라인 호출 |
| `/api/kling/generate` | job 생성 — **기본 `KLING_MODE=mock`** |
| Docker Compose | Node 상시 프로세스로 배포 |
| live 훅 | `web/src/lib/kling/client.ts` 에 벤더 HTTP 연결 시 실 mp4 |

| 여전히 비목표 | 설명 |
|---------------|------|
| 서버에서 완성본 feature film 자동 편집 | NLE 자동화 없음 |
| Vercel-only 풀 pipeline 보장 | 서버리스 제약 — Docker/VPS 권장 |
| 실 Kling 호출 필수 | mock으로 배포 가능; live는 키+구현 후 |

---

## 비목표 (Core — 유지)

- 만화 공방 앱 코드/레포 수정
- Sora/Runway 등 다중 렌더러
- CapCut 타임라인 자동 조립
- CG 마스터 레시피 도서 원문 재배포

---

## 표준 실행 경로

### CLI (Core)

```text
node scripts/run-pipeline.mjs --export "%EXPORT_DIR%"
```

### Web (G9)

```text
cd web && npm run dev
# 또는
docker compose up --build
```

문서: `docs/guides/deployment.md`, `docs/guides/A-kling-manual-practice.md`

---

## 가이드

| 코드 | 문서 | 상태 |
|------|------|------|
| A | [Kling 수동 실습](guides/A-kling-manual-practice.md) | 실 mp4 권장 경로 |
| C | [Kling API 최소 웹](guides/C-kling-api-minimal-web.md) | 설계 + G9 구현 대응 |
| Deploy | [배포 가이드](guides/deployment.md) | Docker / 환경 변수 |

## 변경 메모

| 날짜 | 내용 |
|------|------|
| 2026-07-28 | 초기 목표 등록 |
| 2026-07-29 | A/C 가이드 |
| 2026-07-29 | **G9 확장 명시** + `web/` 구현 + Docker 배포 |
