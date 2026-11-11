# simpress-deck 사용 지침서

AI 에이전트에게 **작업지시서** 한 장과 자료(pptx·pdf·svg·영상)를 주면, [simpress](https://github.com/jakalee/simpress)로 PPT처럼 꾸민 발표자료를 만들어 주는 스킬입니다.

결과물은 두 파일입니다.
- `덱.html`: 브라우저로 바로 발표. 파일 하나에 모든 게 들어 있고 오프라인에서도 동작
- `덱.json`: simpress 편집기에서 열어 계속 고치는 원본

**들어가는 것**
- 어두운 그라데이션 배경과 유리 카드, 아이콘, 움직이는 흐름선
- 순차 등장 효과
- 슬라이드 사이 3D 비행 전환과 전체 보기
- 발표자 노트(주 언어 + 번역, 발표 화면에서 P키로 보기)

---

## 1. 설치

### Claude (claude.ai · Claude 데스크톱)
1. 이 폴더(`skill/simpress-deck/`)를 zip으로 묶습니다. 저장소를 받았다면 `cd skill && zip -r simpress-deck.zip simpress-deck`
2. Claude 설정의 스킬 메뉴에서 zip을 업로드합니다.
3. 새 대화에서 작업지시서를 붙여 요청합니다. 예: "simpress-deck으로 만들어줘"

### Claude Code
`~/.claude/skills/simpress-deck/`에 이 폴더를 그대로 복사합니다. 프로젝트 전용으로 쓰려면 `.claude/skills/`에 둡니다.

### 다른 에이전트 (Hermes, Codex, 기타)
- `SKILL.md`를 에이전트의 스킬·지침 폴더에 넣고, `deckgen/`과 `example/`을 함께 둡니다.
- 에이전트가 이 폴더를 못 받으면 아래 주소에서 직접 내려받게 하면 됩니다.
  - `https://jakalee.github.io/simpress/skill/simpress-deck/SKILL.md`
  - `https://jakalee.github.io/simpress/skill/simpress-deck/deckgen/art.js`
  - `https://jakalee.github.io/simpress/skill/simpress-deck/deckgen/build.js`
  - `https://jakalee.github.io/simpress/skill/simpress-deck/deckgen/shots.js`
  - `https://jakalee.github.io/simpress/skill/simpress-deck/example/slides.js` (`notes.js`, `deck.config.json`도 같은 위치)

### 공통으로 필요한 것
- Node.js 18 이상
- `npm i playwright` 와 `npx playwright install chromium`
- 인터넷: 편집기(`https://jakalee.github.io/simpress/editor.html`)를 불러올 때만 필요합니다. 오프라인에서 쓰려면 simpress 저장소의 `editor.html` 경로를 `deck.config.json`의 `"editor"`에 넣으세요.

---

## 2. 요청하는 법 — 작업지시서

아래를 채워서 에이전트에게 보내면 됩니다. 빈칸은 기본값으로 진행하고, 어떤 기본값을 썼는지 알려 줍니다.

```
[발표 주제] 예) 우리 팀 AI 에이전트 생태계 소개와 해석 소프트웨어 연동
[청중·목적] 예) 해외 고객·파트너, 기술 소개
[언어] 슬라이드: 영어 / 발표자 노트: 영어 + 한국어 번역
[분량] 예) 20분, 10장
[자료]
  - 주자료: /경로/main.pptx
  - 사례: /경로/case.pdf
  - 다이어그램: /경로/diagram.svg
  - 영상: /경로/demo.mp4 (YouTube 링크보다 로컬 파일이 깔끔합니다)
  - 기존 자료(참고만): /경로/old.html
[발표자] 이름 · 소속 · 팀
[디자인] 기본(다크 테크) / 원하는 톤
[저장 위치] /경로/
[기타] 꼭 넣을 것, 뺄 것, 마감
```

**좋은 결과를 얻는 요령**
- **주자료가 뼈대입니다.** pptx 한 장의 내용이 대체로 슬라이드 한 장이 됩니다.
- **사례에는 출처 정보를 같이 주세요.** 발표자, 소속, 행사, 날짜가 있어야 슬라이드에 출처를 정확히 적습니다.
- **수치는 자료에 있는 것만 씁니다.** 넣고 싶은 숫자가 있으면 자료에 적어 주세요.
- **영상은 mp4를 권합니다.** YouTube 영상은 제목과 로고가 붙고, 인터넷이 없으면 재생되지 않습니다.

---

## 3. 직접 만들어 보기 (에이전트 없이)

```bash
git clone https://github.com/jakalee/simpress
cd simpress/skill/simpress-deck
npm i playwright && npx playwright install chromium
node deckgen/build.js example          # → example/out/example_deck.html, .json
node deckgen/shots.js example/out/example_deck.html   # → example/out/shots/s1.png …
```

새 덱을 만드는 순서입니다.
1. `example/` 폴더를 복사합니다. 예: `my-deck/`
2. `deck.config.json`에 제목, 출력 이름, 쓸 파일(경로, MIME, 원본 가로·세로)을 적습니다.
3. `slides.js`에 슬라이드를 씁니다. 좌표는 1920×1080 기준 왼쪽 위 픽셀이고, 도우미 함수 사용법은 `SKILL.md` 4절에 있습니다.
4. `notes.js`에 `[주 언어, 번역]`을 장 순서대로 넣습니다.
5. `node deckgen/build.js my-deck` 로 만들고, `shots.js`로 확인합니다.

---

## 4. 결과물 다루기

- **발표:** `.html`을 크롬이나 사파리로 엽니다.
  - 방향키나 PageDown으로 넘깁니다.
  - P키를 누르면 발표자 노트 창이 열립니다.
  - "전체"를 누르면 전체 보기가 나옵니다.
- **수정:**
  1. simpress 편집기에서 파일 > 열기로 `.json`을 엽니다.
  2. 글자를 클릭해서 고칩니다.
  3. HTML로 다시 내보냅니다.
- **PDF:** simpress의 "PDF로 내보내기"를 쓰면 슬라이드마다 한 쪽씩 나옵니다.

## 5. 자주 묻는 것

- **글자가 넘쳐 보여요.** 운영체제마다 기본 글꼴 폭이 다릅니다. 발표할 PC에서 한 번 넘겨 보고, 넘치는 글자는 편집기에서 줄이세요.
- **파일이 너무 커요.** 영상이 그대로 들어 있어서입니다. 영상을 짧게 자르거나 해상도를 낮추세요.
- **회사 프록시 때문에 편집기가 안 열려요.** `HTTPS_PROXY` 환경변수를 설정하거나, 로컬 `editor.html`을 `SIMPRESS_EDITOR`로 지정하세요.
- **다른 디자인을 원해요.** 작업지시서의 [디자인]에 원하는 톤을 적으면 됩니다. 색은 `deckgen/art.js` 맨 위 `C`에서 바꿉니다.
