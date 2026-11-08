# Simple Impress Editor

[English](README.md) · [바로 써보기](https://jakalee.github.io/simpress/) · [최신 버전 다운로드](https://github.com/jakalee/simpress/releases/latest)

> 비공개·오프라인 우선·단일 파일 방식의 impress.js 비주얼 프레젠테이션 편집기입니다.

**설치도, 계정도, 서버도 필요 없습니다.** 무한 캔버스에 콘텐츠를 배치하고 프레임을 발표 경로로 연결한 다음, 독립 실행형 HTML 파일 하나로 내보낼 수 있습니다.

[![Simple Impress Editor 데모](assets/demo.gif)](https://jakalee.github.io/simpress/)

## 왜 만들었나요?

- **기본적으로 비공개** — 작성한 프레젠테이션은 브라우저 안에 머뭅니다.
- **설정이 필요 없음** — `index.html`을 열면 바로 실행되며 패키지 설치나 빌드 과정이 없습니다.
- **시각적인 3D 편집** — 객체를 이동·확대·회전하고 깊이 방향으로 배치할 수 있습니다.
- **간편한 전달** — 완성한 발표를 독립 실행형 HTML 파일 하나로 내보냅니다.

## 시작하기

1. [라이브 데모](https://jakalee.github.io/simpress/)를 열거나 [`index.html`](index.html)을 내려받습니다.
2. 캔버스에 텍스트, 이미지, 도형, 프레임, 영상을 추가합니다.
3. 객체를 발표 경로로 연결하고 미리 본 뒤 **HTML 내보내기**를 선택합니다.

## 주요 기능

- 이동과 확대·축소가 가능한 무한 캔버스
- 프레임과 발표 경로 편집
- 이동, 크기, 회전, X/Y축 기울기, Z축 깊이 조절
- 텍스트, 이미지, 도형, 로컬 영상, YouTube 링크
- 발표자 노트, 슬라이드 탐색기, 진행 표시
- 자동 저장, 실행 취소·다시 실행, JSON 저장·불러오기
- 로컬 자산을 포함한 독립 실행형 HTML 내보내기

## 개인정보와 이식성

프레젠테이션 데이터는 브라우저에 저장되며 이 프로젝트가 서버로 업로드하지 않습니다. 브라우저 데이터를 지우면 자동 저장 문서도 사라지므로 중요한 작업은 JSON으로 저장해 두세요.

내보낸 발표에는 impress.js의 필수 MIT 고지가 포함됩니다. 로컬 자산은 내보낸 파일에 포함되지만 YouTube 재생과 썸네일에는 인터넷 연결이 필요합니다.

사용자가 추가하거나 재배포하는 이미지, 영상, 글꼴 및 기타 콘텐츠의 이용 권한은 해당 사용자에게 있습니다.

## 브라우저 지원

현대적인 데스크톱 브라우저를 대상으로 합니다. Chrome, Edge, Safari, Firefox 사용을 권장합니다. 모바일 편집은 아직 최적화되어 있지 않습니다.

## 프로젝트 구조

편집기와 impress.js 런타임이 [`index.html`](index.html) 하나에 포함되어 있어 서버나 빌드 도구 없이 실행할 수 있습니다.

버그 제보와 기능 제안은 [Issues](https://github.com/jakalee/simpress/issues)에서, 코드 기여는 Pull Request로 환영합니다.

## 라이선스와 크레딧

Simple Impress Editor는 [MIT License](LICENSE)로 배포됩니다. 사용자가 작성하거나 삽입한 콘텐츠에는 프로젝트 라이선스가 적용되지 않습니다.

[impress.js 2.0.0](https://github.com/impress/impress.js)을 포함합니다. 저작권과 라이선스 세부 사항은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.
