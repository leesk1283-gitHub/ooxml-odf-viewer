# Chrome Extension 설치 가이드

## OOXML/ODF Viewer를 Chrome Extension으로 설치하기

### 방법 1: GitHub Releases에서 다운로드 (권장)

빌드 없이 바로 설치할 수 있는 가장 간단한 방법입니다.

1. **ZIP 파일 다운로드**
   - https://github.com/leesk1283-gitHub/ooxml-odf-viewer/releases/latest 접속
   - `ooxml-odf-viewer-vX.X.X.zip` 파일 다운로드

2. **압축 해제**
   - 다운로드한 ZIP 파일을 원하는 위치에 압축 해제

3. **Chrome Extension 로드**
   - Chrome 브라우저 열기
   - 주소창에 `chrome://extensions/` 입력
   - 우측 상단의 **"개발자 모드"** 토글 활성화
   - **"압축해제된 확장 프로그램을 로드합니다"** 클릭
   - 압축 해제한 폴더 선택

4. **사용**
   - Chrome 툴바에 나타난 확장 프로그램 아이콘 클릭
   - 새 탭에서 OOXML/ODF Viewer 실행

### 방법 2: 로컬 빌드 파일 사용

1. **프로젝트 빌드 (Chrome Extension용)**
   ```bash
   cd d:/Antigravity-workspace/ooxml-viewer
   npm install
   npm run build:extension
   ```
   
   > **중요**: `npm run build` 대신 `npm run build:extension`을 사용해야 합니다!
   > - `npm run build:extension`: Chrome Extension용 (base 경로: './')
   > - `npm run build`: GitHub Pages용 (base 경로: '/ooxml-odf-viewer/')

2. **Chrome Extension 로드**
   - Chrome 브라우저 열기
   - 주소창에 `chrome://extensions/` 입력
   - 우측 상단의 **"개발자 모드"** 토글 활성화
   - **"압축해제된 확장 프로그램을 로드합니다"** 클릭
   - `d:/Antigravity-workspace/ooxml-viewer/dist` 폴더 선택

3. **사용**
   - Chrome 툴바에 나타난 확장 프로그램 아이콘 클릭
   - 새 탭에서 OOXML/ODF Viewer 실행

### 방법 3: GitHub에서 다운로드

1. **소스 코드 다운로드 및 빌드**
   ```bash
   git clone https://github.com/leesk1283-gitHub/ooxml-odf-viewer.git
   cd ooxml-odf-viewer
   npm install
   npm run build:extension
   ```

2. **Chrome Extension 로드** (위의 방법 1과 동일)
   - `chrome://extensions/`
   - 개발자 모드 활성화
   - "압축해제된 확장 프로그램을 로드합니다"
   - `dist` 폴더 선택

### 웹사이트 vs Chrome Extension

| 기능 | 웹사이트 | Chrome Extension |
|------|----------|------------------|
| 접근 방법 | https://leesk1283-github.github.io/ooxml-odf-viewer/ | Chrome 툴바 아이콘 클릭 |
| 설치 필요 | ❌ | ✅ |
| 오프라인 사용 | ❌ | ✅ (설치 후) |
| 브라우저 | 모든 브라우저 | Chrome만 |
| 업데이트 | 자동 (GitHub Pages) | 수동 (재빌드 필요) |

### 주의사항
- Chrome Extension은 개발자 모드로 설치되므로, Chrome 업데이트 시 비활성화될 수 있습니다
- Chrome Web Store에 정식 배포하려면 별도의 검토 과정이 필요합니다
- 웹사이트 버전은 항상 최신 상태로 유지됩니다

### 문제 해결

**Extension이 로드되지 않는 경우:**
- `dist` 폴더에 `manifest.json`, `index.html`, `background.js` 파일이 있는지 확인
- `npm run build` 명령어를 다시 실행
- Chrome 개발자 도구(F12) Console 탭에서 오류 메시지 확인

**아이콘이 보이지 않는 경우:**
- `dist` 폴더에 `icon16.png`, `icon48.png`, `icon128.png` 파일 확인
- 빌드가 제대로 완료되었는지 확인
