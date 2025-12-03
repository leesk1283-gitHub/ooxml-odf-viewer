# OOXML/ODF Viewer & Editor

View and edit the internal XML structure of OOXML and ODF files.

## 🌐 웹사이트 (Web Version)

**바로 사용하기**: https://leesk1283-github.github.io/ooxml-odf-viewer/

- 설치 불필요
- 모든 브라우저에서 사용 가능
- 항상 최신 버전

## 🔌 Chrome Extension

Chrome Extension으로도 사용할 수 있습니다.

**설치 방법:**
- GitHub Releases에서 ZIP 다운로드 (권장): https://github.com/leesk1283-gitHub/ooxml-odf-viewer/releases/latest
- 또는 로컬 빌드 후 설치

자세한 설치 방법은 [CHROME_EXTENSION.md](CHROME_EXTENSION.md)를 참조하세요.

## ✨ 주요 기능

- 📂 OOXML/ODF 파일 구조 탐색
- 📝 XML 편집 (CodeMirror)
- 🔍 검색 패널 자동 표시
- 💡 Relationship Tooltip (rId 마우스 오버 시 타겟 파일 표시)
- 🎨 다크 모드 UI
- 💾 실시간 저장 및 다운로드

## 🛠 개발자용

### 설치
```bash
npm install
```

### 개발 서버
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.

## 📄 지원 파일 형식

- `.docx`, `.xlsx`, `.pptx` (Microsoft Office)
- `.odt`, `.ods`, `.odp` (LibreOffice/OpenOffice)

## 📝 License

MIT
