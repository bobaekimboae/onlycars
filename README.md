# OnlyCars Dealer Studio (한국어)

차량 사진으로 소셜 미디어용 매물 숏폼 MP4를 만드는 한국어 웹 앱입니다. 프로젝트와 영상은 현재 브라우저의 IndexedDB에 저장됩니다.

## 기능

- 매물 정보와 JPG, PNG, WebP 사진 4~30장 등록
- 표지 선택, 사진 순서 변경, 사진 추가와 제거
- 세로 9:16, 정사각 1:1, 가로 16:9 영상
- 템플릿, 카메라 움직임, 음악 스타일과 트랙 미리 듣기
- 브라우저에서 MP4(H.264/AAC) 생성, 재생, 다운로드
- 데스크톱과 모바일 반응형 한국어 화면

## 로컬 실행

```sh
npm install
npm run dev
```

Chrome 또는 Edge 최신 버전을 권장합니다. 사진과 영상 파일은 서버로 전송하지 않습니다. 브라우저 데이터를 지우면 로컬 프로젝트도 삭제됩니다.

## 배포

`main` 브랜치에 반영하면 GitHub Actions가 GitHub Pages로 빌드하고 배포합니다. Pages 주소는 `https://bobaekimboae.github.io/onlycars/` 입니다.

## 영상 제작 방식

MP4는 Mediabunny와 브라우저 WebCodecs를 사용해 이 기기에서 인코딩합니다. 브라우저/기기에서 H.264 인코딩을 제공하지 않으면 생성할 수 없습니다. 로그인, OnlyCars 계정 동기화, 원본 OnlyCars 서버의 영상 크레딧 연동은 포함되지 않습니다.
