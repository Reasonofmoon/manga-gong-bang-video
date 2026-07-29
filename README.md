# manga-gong-bang-video

`manga-gong-bang`(만화 공방)을 **수정하지 않고**, export → 멀티샷 → **Kling 7축 프롬프트 클립 패키지**까지 만드는 후처리 워크플로우 + 에이전트 하네스.

## 최종 목표

→ **[`docs/GOAL.md`](docs/GOAL.md)** (등록·성공 기준·게이트)

### 영상 생성 · 배포 가이드

| 경로 | 문서 |
|------|------|
| **(A) Kling 수동 실습** | [`docs/guides/A-kling-manual-practice.md`](docs/guides/A-kling-manual-practice.md) |
| **(C/G9) 최소 웹** | [`web/`](web/) · [`docs/guides/deployment.md`](docs/guides/deployment.md) |
| 설계 메모 | [`docs/guides/C-kling-api-minimal-web.md`](docs/guides/C-kling-api-minimal-web.md) |

```bash
# G9 web (local)
cd web && npm install && npm run dev
# Docker
docker compose up --build
```

```bash
# 실 export 또는 fixture
node scripts/run-pipeline.mjs --export path/to/export
npm run pipeline:fixture
```


## Quick start

```bash
# 1) Validate sample export
npm run validate:fixture

# 2) Validate your export folder
npm run validate:export -- path/to/export

# 3) Bootstrap workspace (ingest + rule-based multi-shot + 7-axis drafts)
node scripts/bootstrap-workspace-from-export.mjs path/to/export
# prints runId

# 4) Assemble clip-package + validate all shots
npm run assemble -- <runId>
```

에이전트 세션에서는 **`manga-to-video`**로 더 정교한 7축 초안을 쓸 수 있다.  
CLI만으로도 `bootstrap` → `assemble` 이 동작한다.

실 export 경로를 받으면 Phase 1부터 다시 돌린다. 원본 `manga-gong-bang` / `_ref`는 **수정하지 않는다**.

## Layout

| Path | Role |
|------|------|
| `docs/export-convention.md` | Export 규약 |
| `docs/superpowers/specs/` | 설계 스펙 |
| `schemas/` | JSON Schema |
| `fixtures/sample-export/` | 샘플 입력 |
| `scripts/validate-*.mjs` | 검증 CLI |
| `.claude/agents/` | 워커 에이전트 |
| `.claude/skills/` | 스킬 + 오케스트레이터 |
| `_ref/manga-gong-bang/` | 원본 앱 읽기 전용 클론 (gitignore) |
| `clip-package/` | 생성 결과 (gitignore) |

## MVP boundary

- ✅ meta + pages → shotlist + Kling prompts
- ❌ 원본 앱 패치
- ❌ 최종 타임라인 자동 편집
- ❌ 비-Kling 도구 어댑터

## License note

CG 마스터 레시피는 **7축 방법론**만 스킬에 반영. 도서 원문/템플릿 400종 재배포 없음.
