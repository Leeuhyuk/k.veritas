# k.veritas 홈페이지 + 제품 쇼케이스

정적 홈페이지 + Node/Express 백엔드(제품 등록 관리자)로 구성됩니다.

## 실행 방법

```bash
npm install
npm run build:ui
npm start
```

- 사이트: http://localhost:3000
- 쇼케이스 / 자료실 / 공지 (React 목록):  
  `/showcase.html` · `/reference.html` · `/news.html`
- 관리자(React): http://localhost:3000/admin/
  - 공지 `/admin/news` · 자료 `/admin/resources` · 문의 `/admin/inquiries` · 설정 `/admin/settings`
  - 페이지 편집은 레거시: `/admin-pages.html`
- 레거시 `admin.html` / `admin-news.html` 등은 빌드 시 React 경로로 리다이렉트

개발 시 관리자 핫리로드:

```bash
# 터미널 1
npm start
# 터미널 2
npm run dev:admin
# → http://localhost:5173/admin/
```

> ⚠️ 정적 파일을 직접(`file://`) 열면 제품 쇼케이스/관리자 기능은 동작하지 않습니다.
> 반드시 `npm start` 후 **http://localhost:3000** 으로 접속하세요.

## 관리자 사용법 (블로그식 제품 등록)

1. `/admin/` 접속 → 비밀번호로 로그인 (기본값 `admin1234`, 변경했을 수 있음)
2. 제품명·카테고리·요약·소개 내용을 작성하고 사진을 첨부 → **등록하기**
   - 사진은 여러 장 첨부 가능하며 **첫 장이 대표 이미지**입니다.
   - 소개 내용은 빈 줄로 문단을 나눌 수 있습니다.
3. 카테고리는 관리자 페이지 하단 **카테고리 관리**에서 직접 추가/삭제하며, 제품 등록 시 그 목록에서 드롭다운으로 선택합니다.
   - 카테고리를 삭제해도 이미 그 값으로 등록된 제품의 카테고리는 유지됩니다(편집 시 `(목록 외)`로 표시).
4. 등록한 제품은 `showcase.html`(실제 생산 제품)에 카드로 표시되고, 클릭하면 상세 페이지로 이동합니다.

### 소개 내용 서식·표 편집
- 글자 스타일(굵게·기울임·밑줄), 제목/소제목/본문 문단 스타일
- **표 삽입** 후 표 편집 툴바로: 행·열 추가/삭제, `→ 병합`(오른쪽), `↓ 병합`(아래), 병합 해제
- 표의 **폭/높이**는 셀의 오른쪽·아래 경계를 마우스로 드래그해 조절

### 제품 순서 변경
- 등록된 제품 목록을 **드래그앤드롭**(핸들 ⠿)으로 끌어 순서를 바꿉니다. ▲ / ▼ 버튼도 보조로 제공.

## 회사소개·공지·문의 (추가 기능)

- **회사소개 그룹** — `about.html`(인사말·연혁·현황), `certifications.html`(인증·특허), `facilities.html`(생산설비), `location.html`(지도·오시는 길)
- **공지사항** — 공개 `news.html` / `news-detail.html`, 관리자 `/admin/news`
- **문의 접수** — 고객지원 폼이 서버 DB(`data/inquiries.json`)에 저장됩니다. **개인정보 수집 동의 필수**, 스팸 봇 차단(허니팟) 포함. 관리자 `/admin/inquiries`에서 확인·회신(메일)·삭제
- **개인정보처리방침** — `privacy.html` (푸터 링크)
- 관리자 페이지는 상단 탭(제품 / 공지사항 / 문의 내역)으로 이동

## 페이지 내용 직접 편집 (관리자)

관리자 → **페이지 편집**(`admin-pages.html`) 탭에서 코딩 없이 각 페이지의 문구·이미지를 수정합니다.

- 편집할 페이지를 고르면, 그 페이지에서 편집 가능한 항목이 **자동으로** 폼으로 나타납니다.
- 본문 항목은 굵게/제목/**이미지 삽입** 등 서식 편집 가능, 이미지 항목은 업로드로 교체.
- 저장하면 공개 페이지에 즉시 반영(레이아웃은 그대로 유지). "기본값" 버튼으로 원래 문구 복원.
- 대상: 홈, 회사소개·인증·생산설비·오시는 길, 사업영역 3종, 제품소개·제품 상세 3종, 고객지원(FAQ/채널).

대부분의 콘텐츠 요소(제목·설명·카드·목록·연혁·현황·FAQ·표 칸·채널·배너 등)는 `cms.js`의
`BUCKETS` 규칙으로 **자동 인식**되어 별도 표시 없이 편집됩니다.

### 편집 항목 추가 방법 (개발자용)
- 특정 요소를 콕 집어 라벨까지 지정하려면 `data-cms="고유키"`(텍스트) / `data-cms-img="고유키"`(이미지) + `data-cms-label="표시이름"`을 붙입니다.
- 새 유형을 통째로 편집 대상에 넣으려면 `cms.js`의 `BUCKETS` 배열에 선택자를 한 줄 추가합니다.
- 저장값은 `data/content.json`에 보관됩니다. (자동 항목 키는 `auto:유형:순번` 형태)

## SEO·성능

- 전 페이지 **파비콘**(`favicon.svg`) 및 기본 OG 태그 자동 주입(site.js)
- `robots.txt`, 동적 `/sitemap.xml`(제품·공지 상세 포함)
- 업로드 이미지 **자동 리사이즈**(최대 폭 1600px, sharp) — 원본이 크면 자동 축소
4. 목록에서 **수정 / 삭제** 가능. 수정 시 기존 사진을 개별로 빼거나 추가할 수 있습니다.

## 비밀번호 변경

관리자(`/admin/settings`)에서 현재 비밀번호 확인 후 새 비밀번호(6자 이상)로 바꿀 수 있습니다.
변경된 비밀번호는 `data/admin.json`에 해시로 저장됩니다. (최초 기본값은 `admin1234`)

## 보안 설정 (운영 전 필수)

- 최초 기본 비밀번호(`admin1234`)는 **반드시 변경**하세요. (변경 시 **8자 이상**)
- 환경변수 `ADMIN_PASSWORD`로 최초값을 지정할 수 있습니다(이미 `data/admin.json`이 있으면 그 값이 우선).
- 세션 시크릿·HTTPS 쿠키·프록시 설정을 적용하세요.

```bash
# 예 (PowerShell) — 운영 권장 환경변수
$env:NODE_ENV="production"
$env:SESSION_SECRET="충분히-긴-무작위-문자열"
$env:TRUST_PROXY="1"          # Nginx 등 리버스 프록시 뒤일 때
$env:COOKIE_SECURE="1"        # HTTPS 사용 시 (로컬 http면 0 또는 생략)
# 최초 1회만 (admin.json 없을 때)
$env:ADMIN_PASSWORD="강력한비밀번호"
npm start
```

### 적용된 보안 보강
- 세션 쿠키: `httpOnly` + `sameSite=lax` + (운영 시) `secure`
- 로그인 실패 10회 / 15분 잠금 (IP 기준)
- 자료실 업로드 확장자 화이트리스트
- `/uploads/` 경로만 삭제 허용 (`safeJoin`)
- 제품·공지·자료 본문 HTML sanitize (저장 시 + 상세 페이지 표시 시)
- `data/`, `.git/`, `docs/` 등 민감 경로 직접 접근 차단

> 운영 배포 시 HTTPS, 정기 백업(`data/`, `uploads/`, `private_uploads/`), 관리자 비밀번호 관리를 추가로 지켜 주세요.

## 제품 수량 / 표시

- 제품은 **최대 100개**까지 등록됩니다. (초과 시 등록이 막히고 안내 메시지가 표시됩니다.)
- `showcase.html`은 **카테고리 필터**와 **"더 보기"(12개씩)** 로 많은 제품을 페이지네이션해 보여줍니다.

## 데이터 위치

- 제품 데이터: `data/products.json`
- 업로드 이미지: `uploads/`

## 구조

| 구분 | 파일 |
|------|------|
| 메인/소개 | `index.html`, `products.html`, `support.html`, `biz-*.html`, `product-*.html` |
| 제품 쇼케이스(공개) | `showcase.html`, `showcase-detail.html` |
| 관리자 | `admin-app/` → `/admin/` (페이지 편집만 `admin-pages.html`) |
| 백엔드 | `server.js` |
| 공통 스타일/스크립트 | `styles.css`, `site.js` |
| 디자인 토큰 | `design/` |
