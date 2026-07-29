# 배포 가이드 (G9 web surface)

**관련:** `docs/GOAL.md` (G9 확장), `docs/guides/C-kling-api-minimal-web.md`, `web/`

## MVP 경계 (유지 vs 확장)

| 레이어 | 상태 |
|--------|------|
| **Core MVP (G1–G6)** | CLI clip-package — **유지** |
| **G9 확장** | Next.js 웹: ZIP/fixture → pipeline → shotlist UI + Kling **job API (기본 mock)** |
| **실 Kling mp4** | `KLING_MODE=live` + `client.ts` 벤더 연동 **또는** 수동 path A |
| **원본 만화 앱** | `_ref` / upstream **수정 금지** |
| **타임라인 자동 조립** | 여전히 비목표 |

## 로컬 실행

```powershell
cd manga-gong-bang-video\web
npm install
npm run dev
# http://localhost:3000
```

- **Run fixture demo** 버튼 → 기존 `fixtures/sample-export` 파이프라인  
- ZIP 업로드 → `docs/export-convention.md` 규약 export.zip  

모노레포 루트에 `scripts/run-pipeline.mjs` 가 있어야 API가 동작한다 (`web`의 cwd 기준 상위 디렉터리).

## Docker (권장 프로덕션 형태)

```powershell
cd manga-gong-bang-video
docker compose up --build
# http://localhost:3000
```

- Node 상시 프로세스 + 디스크 볼륨 (`_workspace`, `clip-package`, `web/.data`)
- Vercel 서버리스만으로는 spawn + 장시간 pipeline + 파일 I/O가 불안정

## 환경 변수

| 변수 | 기본 | 설명 |
|------|------|------|
| `KLING_MODE` | `mock` | `mock` \| `live` |
| `KLING_API_KEY` | — | live 시 필수 (연동 구현 후) |
| `KLING_BASE_URL` | — | 벤더 base URL |

`.env.example` 참고. 시크릿을 레포에 커밋하지 말 것.

## 플랫폼 선택

| 플랫폼 | 적합성 |
|--------|--------|
| **Docker / Railway / Fly / VPS** | ✅ 권장 (G9 풀스택) |
| **Vercel** | ⚠️ UI만 가능; pipeline API는 타임아웃·파일시스템 제약 — 별도 워커 필요 |
| **정적 호스팅 only** | ❌ API 없음 |

## API 요약

| Method | Path | 역할 |
|--------|------|------|
| POST | `/api/pipeline` | `file` ZIP 또는 `mode=fixture` |
| POST | `/api/kling/generate` | `{ sessionId, shotId }` mock/live job |
| GET | `/api/jobs/:id` | job 상태 |
| GET | `/api/sessions/:id` | 세션 |
| GET | `/api/shots/:sessionId/:shotId` | prompt 파일 |

## 보안 체크리스트 (공개 배포 전)

- [ ] 업로드 크기 제한 (80MB 코드 내 적용)
- [ ] ZIP slip 방지 (코드 내 적용)
- [ ] rate limit / 인증 (미구현 — 공개 시 추가)
- [ ] `KLING_API_KEY` 서버 전용
- [ ] 생성 데이터 주기적 삭제

## 배포 후 스모크

1. UI 로드  
2. Fixture demo → shotCount ≥ 1  
3. shot 클릭 → prompt 표시  
4. Generate → job `succeeded` + mock note  
5. `_ref` 변경 없음 확인  
