# (A) Kling 수동 실습 가이드

**전제:** `docs/GOAL.md` — 이 레포는 **클립 패키지**까지 만들고, **Kling 렌더·NLE 조립은 사람**이 한다.  
**원본 앱:** `_ref/manga-gong-bang` 및 업스트림 **수정 금지**.

---

## 0. 이 가이드로 얻는 것

| 단계 | 결과 |
|------|------|
| 패키지 생성 | `clip-package/{slug}/` + shotlist |
| Kling | 샷별 mp4 클립 (S01, S02, …) |
| 편집 | CapCut/Premiere 러프 컷 1본 |

**소요(대략):** fixture 데모 30–60분 / 실 만화 1화 분량 2–4시간(생성 대기 포함).

---

## 1. 준비물

- [ ] Node.js 20+
- [ ] 이 레포 clone  
  `https://github.com/Reasonofmoon/manga-gong-bang-video`
- [ ] [Kling](https://klingai.com/) (또는 동일 제품 UI) 계정 + 크레딧
- [ ] (권장) CapCut 또는 Premiere
- [ ] (실습 권장) 만화 공방으로 만든 페이지 이미지  
  없으면 fixture로 파이프라인만 연습 가능 — **이미지 1×1이면 Kling 화질은 의미 없음**

---

## 2. 패키지 만들기

### 2-A. 데모 (export 없을 때)

```powershell
cd C:\Users\crescent\manga-gong-bang-video
npm run pipeline:fixture
```

- 산출: `clip-package/neon-rain-fixture/`
- 샷: `S01` … `S08` (대략)
- **용도:** 폴더 구조·shotlist·프롬프트 흐름 익히기

### 2-B. 실 export (권장)

1. `docs/export-convention.md` 대로 폴더 구성:

```text
my-export/
  meta.json
  pages/page-00-cover.png  (webp/png/jpg)
  pages/page-01.png
  characters/hero.png      (권장)
```

2. 검증 + 패키지:

```powershell
node scripts/run-pipeline.mjs --export "C:\Users\...\my-export"
```

성공 시 터미널 JSON에 `runId`, `packagePath`, `shotlist` 경로가 나온다.

3. (선택) 7축 문장 다듬기 후 재조립:

- `_workspace/<runId>/02_axes_drafts/` 의 `p00_s01.json` 등 수정  
  또는 에이전트 스킬 `seven-axis-kling` / `manga-to-video`
- 그다음:

```powershell
node scripts/assemble-clip-package.mjs <runId>
```

---

## 3. 패키지 폴더 읽는 법

```text
clip-package/{slug}/
  package.json          # status: ready|draft
  shotlist.md           # 재생 순서표
  continuity.md         # 캐릭/색 고정 메모
  editor-checklist.md   # 이 가이드와 동일 계열 체크
  qa-report.md
  shots/
    S01_p00_s01/
      prompt.txt        # Kling에 붙일 영문 프롬프트
      negative.txt
      guide.md          # duration, I2V 팁
      ref-page.png      # I2V 레퍼런스 (페이지 이미지)
      shot.json         # 구조화 메타
    S02_...
```

**재생 순서 = shotId 오름차순** (`S01` → `S02` → …).

---

## 4. Kling에서 한 샷 생성 (핵심)

UI 이름은 버전에 따라 다를 수 있다. 의미만 맞으면 된다.

### 4-1. 모드

1. **Image to Video (I2V)** 우선 — `ref-page`를 첫 프레임/스타일 락으로 사용  
2. I2V가 없거나 실패하면 TextText to Video** + `prompt.txt`만

### 4-2. 입력

| 필드 | 파일 |
|------|------|
| 이미지 | `ref-page.png` (또는 webp) |
| 프롬프트 | `prompt.txt` 전체 복사 |
| 네거티브 | `negative.txt` (UI 지원 시) |
| 길이 | `guide.md`의 durationSec → **5s 또는 10s**에 반올림 |

### 4-3. 생성 후 저장 이름

```text
renders/S01_p00_s01.mp4
renders/S02_p00_s02.mp4
...
```

`shotId`와 **파일명을 동일**하게 두면 편집이 편하다.

### 4-4. 품질 체크 (한 샷마다)

- [ ] 주인공 얼굴이 이전 샷과 크게 안 바뀌었는가 (identity)
- [ ] 의상·cyan streak 등 continuity 토큰이 유지되는가
- [ ] 과도한 손/손가락 붕괴, 워터마크 없는가
- [ ] 카메라가 프롬프트 의도(establish/action/reaction)와 맞는가

실패 시: **같은 시드 전략**으로 1–2회 재생성 → 그래도 안 되면 `prompt.txt`의 Motion/Camera 축만 약하게 수정 후 재시도.

---

## 5. 시리즈 일관성 팁 (Kling 수동)

1. **첫 승인 샷의 seed**를 `guide.md` 또는 메모에 기록  
2. 같은 캐릭 연속 샷은 seed/캐릭터 레퍼런스 옵션이 있으면 재사용  
3. `continuity.md`를 옆에 띄워 두고 의상·팔레트 확인  
4. 한 페이지 안(S03–S05)은 **같은 ref 페이지**라 스타일이 맞기 쉽다. 페이지가 바뀌면 조명 점프가 날 수 있음 → 편집에서 짧게 컷하거나 색보정

---

## 6. CapCut / Premiere 조립

1. 새 프로젝트, 비율은 프롬프트/원작에 맞춤 (예: 16:9)  
2. `renders/`를 shotId 순으로 타임라인에 올림  
3. 컷 사이: 하드컷 또는 짧은 dissolve (0.5s 이하)  
4. `shot.json` / `guide.md`의 **dialogueNote** → 자막  
5. (선택) BGM, 효과음  
6. export: `rough-cut.mp4`

`editor-checklist.md`와 동일 순서를 따르면 된다.

---

## 7. 실패 패턴 치트시트

| 증상 | 대응 |
|------|------|
| 얼굴이 샷마다 다른 사람 | I2V 강제, seed 고정, Subject 축에 외모 문장 반복 |
| 손/팔 붕괴 | negative 유지, 손 클로즈 프롬프트 피하기, 재생성 |
| 카메라 빙글빙글 | Motion/Camera에서 360·extreme whip 제거 |
| 글자/워터마크 | negative에 text/logo, 장면 묘사에서 간판 글자 최소화 |
| validate 실패 | `node scripts/validate-export.mjs <export>` 에러 수정 |
| package draft | `qa-report.md` critical 확인 후 drafts 수정 → assemble |

---

## 8. 실습 시나리오 (90분 코스)

| 분 | 할 일 |
|----|--------|
| 0–10 | clone, `npm run pipeline:fixture`, shotlist 읽기 |
| 10–20 | S01 폴더 구조·prompt 형식 확인 |
| 20–50 | Kling으로 S01–S02만 생성 (커버 2샷) |
| 50–70 | CapCut에 올려 10초 타이틀 러프 컷 |
| 70–90 | (여유) 실 export 규약 읽고 meta 초안 작성 |

그다음 세션: 실 페이지 이미지로 export → 전체 S01–Sn.

---

## 9. 다음 단계

- 실 export 1건 E2E → GOAL **G7** 클로즈  
- 웹에서 버튼으로 생성하고 싶다면 → **`docs/guides/C-kling-api-minimal-web.md`**

---

## 관련 파일

- `docs/GOAL.md`
- `docs/export-convention.md`
- `clip-package/*/editor-checklist.md`
- `scripts/run-pipeline.mjs`
- `.claude/skills/seven-axis-kling/`
