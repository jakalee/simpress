# SIMPress 기능 쇼케이스

[편집기 열기](https://jakalee.github.io/simpress/) · [기능 쇼케이스 실행](https://jakalee.github.io/simpress/example/feature-showcase.html) · [한국어 설명서](../README.ko.md)

![SIMPress 기능 쇼케이스 미리보기](preview.png)

SIMPress로 직접 제작하고 HTML 파일 하나로 내보낸 인터랙티브 기능 소개자료입니다. 별도의 발표 프로그램이나 계정 없이 현대적인 데스크톱 브라우저에서 실행됩니다.

## 데모에서 확인할 수 있는 기능

1. 줌·회전·깊이를 이용한 공간형 프레젠테이션
2. 마우스로 직접 돌리고 확대할 수 있는 3D 제품 모델
3. 콤보박스와 드래그바에 따라 KPI·그래프·표가 바뀌는 데이터 대시보드
4. p5.js로 실행되는 필드 시뮬레이션과 화이트보드
5. PDF 페이지 자동 배치와 PDF·HTML·JSON 내보내기 소개
6. 기존 PPTX·PDF·CAD·데이터를 SIMPress 발표자료로 재구성하는 AI 에이전트 스킬
7. Chrome 페이지 번역을 이용한 다국어 발표
8. 발표자 노트와 전체 공간 보기

## 조작 방법

- `←` / `→` 또는 `PageUp` / `PageDown`: 이전·다음 장면
- `O`: 전체 공간 보기
- `P`: 발표자 노트 열기
- 3D 장면: 마우스 드래그로 회전, 휠로 확대·축소
- 대시보드: 제품군 콤보박스와 부하 슬라이더 조절
- p5.js 장면: `FIELD SIMULATION`과 `WHITEBOARD`를 전환하고 캔버스에서 드래그

## 실행 환경

- Chrome, Edge, Safari, Firefox의 최신 데스크톱 버전을 권장합니다.
- 대시보드와 p5.js 코드는 데모 HTML 안에 포함되어 있습니다.
- 3D 모델은 인터넷 연결 시 three.js를 버전이 고정된 CDN에서 불러와 실시간으로 표시합니다. 오프라인에서는 내장된 모델 스냅샷이 표시됩니다.
- 파일 크기가 크므로 첫 실행에는 잠시 시간이 걸릴 수 있습니다.

## 샘플 자료와 라이선스

3D 제품 데모는 실제 회사 제품이 아닌 공개 샘플입니다.

- 모델: `CarConcept`
- 출처: [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept)
- Khronos 메타데이터에 따르면 공개 도메인·CC0 원본 모델을 기반으로 최적화된 glTF 샘플입니다.

자세한 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.

## 직접 만들어 보기

[SIMPress 편집기](https://jakalee.github.io/simpress/)를 열어 텍스트, 이미지, 차트, PDF, 3D 모델과 HTML 앱을 추가한 뒤 **HTML 내보내기**를 선택하세요. AI 에이전트로 고급 발표자료를 만들려면 [`skill/simpress-deck`](../skill/simpress-deck/)을 참고하세요.
