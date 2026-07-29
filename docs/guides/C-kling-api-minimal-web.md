# (C) Kling API 포함 최소 웹 — 설계 (미구현 스펙)

**상태:** 설계 + **G9 구현** (`web/`, Docker). Core MVP 자동 최종 mp4는 비목표 유지; mock job + live 훅.  
**원본 앱 수정 금지.** 이 레포에만 웹 레이어 추가.  
**배포:** `docs/guides/deployment.md`

---

## 1. 목표 (Minimal)

사용자가 브라우저에서:

1. export ZIP(또는 폴더 업로드) 제출  
2. 파이프라인으로 shotlist/prompt 생성  
3. **Kling API로 샷 1개 이상** mp4 생성  
4. 다운로드 링크 확인  

**비범위(1차):** 전체 타임라인 자동 조립, 결제, 멀티 유저 권한, Sora/Runway.

---

## 2. 아키텍처

```text
[Browser]
  upload ZIP → POST /api/pipeline
  click "Generate S01" → POST /api/kling/generate
  poll GET /api/jobs/:id
  download mp4 URL

[Next.js App Router 권장]
  /                 업로드 + 샷 목록 UI
  /api/pipeline     validate + bootstrap + assemble (서버 디스크 또는 /tmp)
  /api/kling/generate  Kling 어댑터 호출
  /api/jobs/[id]    상태 조회

[Secrets]
  KLING_API_KEY     (또는 access_key/secret — 벤더 문서 따름)
  KLING_BASE_URL

[Storage]
  로컬 dev: .data/uploads, .data/packages, .data/renders
  prod: R2/S3 (권장) — Vercel 서버리스는 로컬 디스크 ephemeral
```

기존 CLI 재사용:

- `scripts/validate-export.mjs`
- `scripts/bootstrap-workspace-from-export.mjs`
- `scripts/assemble-clip-package.mjs`  
  → `child_process` 또는 로직을 `src/lib/pipeline/` 로 점진 이전.

---

## 3. Kling 어댑터 경계

```text
src/lib/kling/
  types.ts          JobRequest, JobStatus
  client.ts         createImageToVideo, getJob
  mapShot.ts        shot.json + ref image → API payload
```

| 입력 | 매핑 |
|------|------|
| prompt.txt | positive prompt |
| negative.txt | negative (지원 시) |
| ref-page | image URL or multipart |
| durationSec | 5 / 10 enum |
| seedHint | seed 필드 (지원 시) |

**중요:** API 스펙은 자주 바뀐다. UI 수동 가이드(A)와 **문구/축은 공유**, 전송 포맷만 어댑터에서 변환.

공식/파트너 문서 확인 후 `client.ts`만 수정하면 되게 유지.

---

## 4. API 스케치

### POST `/api/pipeline`

- body: multipart `export.zip`
- unzip → temp dir  
- run validate → bootstrap → assemble  
- response:

```json
{
  "runId": "...",
  "slug": "...",
  "shots": [
    { "shotId": "S01_p00_s01", "purpose": "establish", "durationSec": 5 }
  ]
}
```

### POST `/api/kling/generate`

```json
{
  "runId": "...",
  "shotId": "S01_p00_s01"
}
```

- response: `{ "jobId": "..." }`  
- 백그라운드: Kling 호출 → 완료 시 `.data/renders/{shotId}.mp4` 또는 object storage

### GET `/api/jobs/:jobId`

```json
{ "status": "queued|running|succeeded|failed", "url": "...", "error": null }
```

---

## 5. 배포 옵션

| 환경 | 적합 |
|------|------|
| **로컬 first** | API 키 실험, 디스크 저장 단순 |
| Railway / Fly / VPS | 긴 job·파일 I/O 유리 |
| Vercel only | 짧은 요청 OK, **렌더 job은 외부 워커/큐 필요** |

추천 순서: **로컬 PoC (1샷)** → Railway 등 상시 서버 → 필요 시 프론트만 Vercel.

---

## 6. 보안

- API 키 서버 전용, `NEXT_PUBLIC_*` 금지  
- 업로드 크기 제한 (예: 50MB), zip slip 방지  
- rate limit (IP/유저)  
- 생성물 만료 삭제 (24–72h)

---

## 7. 구현 마일스톤

| M | 산출 | 완료 기준 |
|---|------|-----------|
| M0 | 이 문서 | ✅ |
| M1 | Next 스캐폴드 + ZIP 업로드 + pipeline API (mp4 없이 패키지 JSON만) | shotlist UI |
| M2 | Kling 어댑터 mock + job 상태 UI | fake mp4 또는 delayed success |
| M3 | 실 Kling API 1샷 I2V | 브라우저에서 S01 다운로드 |
| M4 | 전 샷 큐 + 패키지 ZIP(mp4 포함) 다운로드 | 수동 A와 동등 이상 |

**M1–M2는 키 없이 진행 가능.** M3부터 키 필수.

---

## 8. GOAL.md 와의 관계

| 현재 MVP | C 확장 시 |
|----------|-----------|
| 자동 mp4 = 비목표 | G9: “최소 웹 1샷 Kling 생성” 추가 |
| 핸드오프 = Kling 수동 | 핸드오프 = 다운로드 링크 |

착수 시 `docs/GOAL.md`에 G9 행을 명시적으로 추가할 것.

---

## 9. 지금 당장 할 일 (A vs C)

| 목적 | 선택 |
|------|------|
| 오늘 영상 클립 실험 | **A 가이드** 따라가기 |
| 제품/웹 자동화 | 이 문서 **M1** 구현 요청 |

에이전트에게 구현을 맡길 때 예시 프롬프트:

```text
docs/guides/C-kling-api-minimal-web.md 의 M1만 구현.
Next.js 앱을 apps/web 또는 루트에 추가.
ZIP 업로드 → 기존 scripts로 pipeline → shotlist JSON 반환.
Kling 실호출은 mock. _ref 수정 금지.
```
