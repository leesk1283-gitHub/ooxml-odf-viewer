# OOXML/ODF Viewer & Editor

View and edit the internal XML structure of OOXML and ODF files.

## 🌐 웹사이트 (Web Version)

**바로 사용하기**: [https://ooxml-odf-viewer.vercel.app/](https://ooxml-odf-viewer.vercel.app/)

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
- 📝 XML 편집 (Monaco Editor - VS Code와 동일한 에디터)
- 🔍 검색 패널 자동 표시
- 💡 Relationship Tooltip (rId 마우스 오버 시 타겟 파일 표시)
- 🎨 다크 모드 UI
- 💾 실시간 저장 및 다운로드
- 🔄 Diff 모드 (두 파일 비교)
- 🗑️ 파일/폴더 삭제 기능

## ⌨️ 단축키

### 편집
- `Ctrl/Cmd + S` - 저장
- `Ctrl/Cmd + F` - 찾기
- `Ctrl/Cmd + H` - 찾기 및 바꾸기

### Monaco Editor 기본 기능
- `Ctrl/Cmd + D` - 다음 같은 단어 선택 (멀티 커서)
- `Alt + Click` - 멀티 커서 추가
- `Ctrl/Cmd + /` - 주석 토글
- `Alt + ↑/↓` - 줄 이동
- `Shift + Alt + ↑/↓` - 줄 복사

## 🏗️ 아키텍처

### 클래스 계층 구조

**Mode 계층:**
```
BaseMode (공통 트리 관리 및 애니메이션)
  ├─ Mode (단일 파일 모드)
  └─ DiffMode (비교 모드)
```

**Editor 계층:**
```
BaseEditor (공통 관계 처리 및 XML 포매팅)
  ├─ Editor (단일 편집기)
  └─ DiffEditor (비교 편집기)
```

**UI 컴포넌트:**
- `TreeView`: isDiffMode 플래그로 단일/비교 모드 지원
- `ZipHandler`: JSZip 래퍼, 파일 CRUD 작업

### 주요 디렉터리
```
src/
  modes/        # 애플리케이션 모드 (Single/Diff)
  ui/           # UI 컴포넌트 (Editor, TreeView)
  utils/        # 유틸리티 (ZipHandler, DiffUtils, DomUtils)
  types/        # TypeScript 타입 정의
  const/        # 상수 정의
```

## 📄 지원 파일 형식

- `.docx`, `.xlsx`, `.pptx` (Microsoft Office)
- `.odt`, `.ods`, `.odp` (LibreOffice/OpenOffice)
- 기타 xml 형식의 파일들 (hwpx 등)

## 📝 License

MIT

---
Created by <a href="https://github.com/leesk1283-github" target="_blank" rel="noopener noreferrer">leesk1283-github</a>
