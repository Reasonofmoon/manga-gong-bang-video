# 배포 가이드 (G9 web surface)

**관련:** `docs/GOAL.md` (G9), `docs/guides/C-kling-api-minimal-web.md`, `web/`, `railway.toml`

## MVP 경계 (유지 vs 확장)

| 레이어 | 상태 |
|--------|------|
| **Core MVP (G1–G6)** | CLI clip-package — **유지** |
| **G9 확장** | Next.js 웹 + pipeline API + Kling job API |
| **Kling live** | `KLING_MODE=live` + Bearer 또는 AK/SK JWT (`web/src/lib/kling/live.ts`) |
| **원본 만화 앱** | `_ref` / upstream **수정 금지** |
| **타임라인 자동 조립** | 비목표 |

---

## 1. 로컬 실행

```powershell
cd manga-gong-bang-video\web
npm install
npm run dev
# http://localhost:3000
```

```powershell
# Docker
cd manga-gong-bang-video
docker compose up --build
# http://localhost:3000
node scripts/deploy-smoke.mjs http://127.0.0.1:3000
```

---

## 2. VPS (Ubuntu 등) — Docker Compose 절차

### 2.1 사전 요구

- Docker Engine + Compose plugin  
- 공개 포트 80/443 (또는 리버스 프록시)  
- git

### 2.2 설치

```bash
sudo apt update && sudo apt install -y git docker.io docker-compose-v2
sudo usermod -aG docker $USER   # re-login after
git clone https://github.com/Reasonofmoon/manga-gong-bang-video.git
cd manga-gong-bang-video
```

### 2.3 환경 파일

```bash
cp .env.example .env
# edit .env — start with mock:
# KLING_MODE=mock
```

### 2.4 기동

```bash
docker compose up -d --build
docker compose ps
curl -s http://127.0.0.1:3000/api/health | jq .
node scripts/deploy-smoke.mjs http://127.0.0.1:3000
```

### 2.5 HTTPS (권장: Caddy)

```bash
# install caddy, then Caddyfile:
# your.domain.com {
#   reverse_proxy localhost:3000
# }
```

### 2.6 업데이트

```bash
git pull
docker compose up -d --build
```

### 2.7 디스크

볼륨: `web-data`, `workspace`, `packages` — 주기적으로 정리하지 않으면 커짐.  
공개 서비스면 인증/레이트리밋 추가 권장 (현재 미구현).

---

## 3. Railway 절차

### 3.1 대시보드

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub**  
2. 저장소: `Reasonofmoon/manga-gong-bang-video`  
3. **Root Directory:** 레포 루트 (`/`)  
4. **Builder:** Dockerfile (`railway.toml` 에 지정됨)  
5. 생성 후 **Settings → Networking → Generate Domain**

### 3.2 환경 변수 (Variables)

| 변수 | 예시 | 필수 |
|------|------|------|
| `KLING_MODE` | `mock` | 권장 (기본 mock) |
| `PORT` | Railway 자동 | 자동 주입 시 무시 가능 |
| `KLING_API_KEY` | Bearer 토큰 | live + bearer |
| `KLING_ACCESS_KEY` | AK | live + JWT |
| `KLING_SECRET_KEY` | SK | live + JWT |
| `KLING_BASE_URL` | `https://api.klingai.com` | live 시 확인 |
| `KLING_I2V_PATH` | `/v1/videos/image2video` | 포털과 다르면 수정 |
| `KLING_QUERY_PATH` | `/v1/videos/{task_id}` | 포털과 다르면 수정 |
| `KLING_MODEL` | `kling-v1` | 포털 모델명 |
| `KLING_POLL_ATTEMPTS` | `12` | 선택 |
| `KLING_POLL_MS` | `5000` | 선택 |

### 3.3 헬스체크

- Path: `/api/health` (`railway.toml`)  
- 배포 로그에 `next start -H 0.0.0.0` 확인

### 3.4 스모크

```bash
node scripts/deploy-smoke.mjs https://YOUR-APP.up.railway.app
```

### 3.5 Railway 주의

| 이슈 | 대응 |
|------|------|
| 에페메럴 디스크 | 재배포 시 업로드/job 유실 가능 → Volume 연결 권장 |
| 빌드 시간 | monorepo Docker 첫 빌드 수 분 |
| 장시간 pipeline | 요청 타임아웃 설정 확인 (fixture ~30s+) |
| 서버리스 아님 | Dockerfile 서비스로 유지 |

### 3.6 CLI (선택)

```bash
# npm i -g @railway/cli && railway login
railway link
railway up
railway variables set KLING_MODE=mock
```

---

## 4. Kling live 어댑터

구현: `web/src/lib/kling/live.ts`, `jwt.ts`, `client.ts`

### 4.1 인증 모드

1. **Bearer:** `KLING_API_KEY` (또는 `KLING_BEARER_TOKEN`)  
2. **AK/SK JWT:** `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` → HS256 JWT (`iss`=AK)

### 4.2 기본 HTTP 계약 (포털에 맞게 env로 조정)

- **Create:** `POST {KLING_BASE_URL}{KLING_I2V_PATH}`  
  body: `model_name`, `image` (data URI), `prompt`, `negative_prompt`, `duration` (`5`|`10`), `mode`  
- **Query:** `GET {KLING_BASE_URL}` + `KLING_QUERY_PATH` (`{task_id}` 치환)

응답 envelope 은 `data.task_id` / `task_status` / `task_result.videos[0].url` 등 여러 형태를 관대하게 파싱.

### 4.3 라이브 켜기

```bash
# .env or Railway variables
KLING_MODE=live
KLING_ACCESS_KEY=...
KLING_SECRET_KEY=...
# or
KLING_API_KEY=...
KLING_BASE_URL=https://api.klingai.com
```

**주의:** 공식 포털 경로/필드명이 바뀌면 env만 바꾸거나 `live.ts` body 매핑을 수정.  
키가 없거나 HTTP 실패 시 **mock처럼 성공 위장하지 않고 failed** 로 반환.

### 4.4 폴링

- `POST /api/kling/generate` 가 live 시 기본 짧은 폴링 (`KLING_POLL_*`)  
- `GET /api/jobs/:id` 가 live + queued/running 이면 재조회

실 mp4 URL 이 오면 `job.url` 에 저장. mock 은 URL 없이 handoff note 만.

### 4.5 대안: 수동 Path A

API 키 없이 영상만 필요하면 `docs/guides/A-kling-manual-practice.md` (권장 안정 경로).

---

## 5. 환경 변수 전체

| 변수 | 기본 | 설명 |
|------|------|------|
| `KLING_MODE` | `mock` | `mock` \| `live` |
| `KLING_API_KEY` | — | Bearer |
| `KLING_ACCESS_KEY` / `KLING_SECRET_KEY` | — | JWT |
| `KLING_BASE_URL` | `https://api.klingai.com` | API host |
| `KLING_I2V_PATH` | `/v1/videos/image2video` | create path |
| `KLING_QUERY_PATH` | `/v1/videos/{task_id}` | status path |
| `KLING_MODEL` | `kling-v1` | model_name |
| `KLING_GEN_MODE` | `std` | std/pro 등 |
| `KLING_POLL_ATTEMPTS` | `12` | |
| `KLING_POLL_MS` | `5000` | |

`.env.example` 참고. **시크릿 커밋 금지.**

---

## 6. API 요약

| Method | Path | 역할 |
|--------|------|------|
| GET | `/api/health` | 배포 헬스 + script/fixture 존재 |
| POST | `/api/pipeline` | ZIP 또는 `mode=fixture` |
| POST | `/api/kling/generate` | mock/live job (+ optional poll) |
| GET | `/api/jobs/:id` | 상태 (live 재조회) |
| GET | `/api/sessions/:id` | 세션 |
| GET | `/api/shots/:sessionId/:shotId` | prompt 파일 |

---

## 7. 보안 체크리스트 (공개 배포 전)

- [x] 업로드 크기 제한 (80MB)
- [x] ZIP slip 방지
- [ ] rate limit / 인증 (미구현 — 공개 시 추가)
- [x] API 키 서버 env 전용
- [ ] 생성 데이터 주기 삭제
- [ ] HTTPS 강제

---

## 8. 배포 후 스모크

1. `GET /api/health` → `ok: true`, scripts/fixture true  
2. UI **Run fixture demo** → shotCount ≥ 1  
3. shot → prompt  
4. Generate → mock `succeeded` 또는 live `url`/`failed` 메시지  
5. `node scripts/deploy-smoke.mjs <base-url>`  

---

## 9. 플랫폼 선택 요약

| 플랫폼 | 적합성 | 비고 |
|--------|--------|------|
| **Docker / VPS** | ✅ 최우선 | compose + 볼륨 |
| **Railway** | ✅ | Dockerfile + healthcheck |
| **Fly.io** | ✅ | 유사 Docker |
| **Vercel only** | ⚠️ | pipeline spawn 비권장 |
