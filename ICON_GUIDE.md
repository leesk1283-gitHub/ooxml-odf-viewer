# 아이콘 추가 방법

네잎클로버 아이콘을 추가하려면 다음 사이트에서 무료 아이콘을 다운로드하세요:

## 추천 사이트:
1. **Flaticon** (https://www.flaticon.com)
   - 검색: "four leaf clover" 또는 "clover"
   - PNG 형식으로 다운로드
   - 16x16, 48x48, 128x128 세 가지 크기로 다운로드

2. **Icons8** (https://icons8.com)
   - 검색: "clover"
   - 무료 PNG 다운로드

## 아이콘 추가 단계:

1. 다운로드한 아이콘 파일 이름을 다음과 같이 변경:
   - `icon16.png` (16x16 픽셀)
   - `icon48.png` (48x48 픽셀)
   - `icon128.png` (128x128 픽셀)

2. 파일을 `D:\Antigravity-workspace\ooxml-viewer\public\` 폴더에 복사

3. `manifest.json` 수정 (아래 참조)

4. 다시 빌드:
   ```bash
   npm run build
   ```

5. Chrome 확장 프로그램 새로고침
