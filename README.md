# manga-gong-bang-video

`manga-gong-bang`(만화 공방)을 **수정하지 않고**, export → 멀티샷 → **Kling 7축 프롬프트 클립 패키지**까지 만드는 후처리 워크플로우 + 에이전트 하네스.

## Quick start

```bash
# 1) Validate sample export
npm run validate:fixture

# 2) Validate your export folder
npm run validate:export -- path/to/export
```

에이전트 세션에서는 **`manga-to-video`** 스킬로 전체 파이프라인을 실행한다.

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
