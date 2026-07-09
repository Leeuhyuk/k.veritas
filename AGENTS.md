# k.veritas 사이트 — 에이전트·개발 규칙

이 문서는 AI 에이전트와 사람이 같은 제약을 따르도록 한다.  
작업 폴더: `C:\Users\lgs79\Desktop\company home` (또는 이 저장소 루트).

## 프로젝트 한 줄

정적 HTML 공개 사이트 + Express API + JSON 파일 DB + 바닐라 관리자.  
제품 쇼케이스는 `/api/products`로 카드를 렌더한다.

## 반드시 지킬 것

1. **공개 사이트 전면 React 금지.** 공개 페이지는 HTML + `site.js` / `cms.js` / 모듈 JS를 유지한다.
2. **공개 목록 UI는 `public-ui`.** 제품 카드·자료 행·공지 항목은 각각 `ProductCard` / `ResourceRow` / `NewsItem` 에서만 수정한다.
3. **API 스키마 동결 기본.** `products` / `news` / `resources` / `inquiries` / `content` 필드 변경 시 공개 페이지와 관리자를 함께 확인한다.
4. **관리자 React는 `admin-app/` 만** (도입 시). Express `/api/*` 재사용, `credentials: 'include'`.
5. **`admin-pages` CMS React 이전 보류.** `cms.js` + HTML 선택자 모델 유지.
6. **UI 문구는 한국어.** 기존 디자인 토큰·`styles.css` 클래스명을 불필요하게 바꾸지 않는다.
7. **완료 전 스모크.** `docs/SMOKE.md`의 해당 항목을 통과했다고 확인한 뒤에만 “완료”를 주장한다.
8. **파괴적 작업 전 확인.** 강제 푸시, 대량 삭제, 운영 비밀번호·세션 시크릿 변경, `data/` 초기화는 사용자 승인 후.
9. **범위 최소화.** 요청하지 않은 리팩터·의존성 추가·문서 양산을 하지 않는다.
10. **서버 실행.** 동적 기능 검증은 `npm start` 후 `http://localhost:3000` 기준. `file://` 로 열지 않는다.

## 하지 말 것 (현재 로드맵)

- 공개 사이트 Next/React 전면 전환
- 고객 대면 견적 AI 챗봇 (별도 승인 전)
- JSON DB → 외부 DB 교체를 부수 작업으로 섞기
- 구현 서브에이전트 여러 개가 **같은 파일**을 동시에 수정
- 리뷰·스모크 없이 “전부 끝남” 선언

## 아키텍처 메모

| 영역 | 경로 | 비고 |
|------|------|------|
| 공개 페이지 | `*.html` | 네비/푸터: `site.js` |
| CMS 적용 | `cms.js`, `data/content.json` | `data-cms` / 자동 BUCKETS |
| 공개 목록 | `public-ui` → `/public-ui/assets/*` | 쇼케이스·자료실·공지 React 섬 |
| 쇼케이스 | `showcase.html`, `showcase-detail.html` | API 연동 |
| 관리자 | `admin-app/` → `/admin/*` | 페이지 편집만 `admin-pages.html` |
| API | `server.js` | 세션 로그인, multer, sharp |
| 데이터 | `data/*.json` | 파일 기반 |
| 업로드 | `uploads/`, `private_uploads/` | |

## 로드맵 순서 (요약)

1. Phase 1 — 공개 카드 모듈화 → 이후 public-ui 로 흡수 ✅  
2. Phase 2 — 관리자 제품 React (`admin-app`) ✅ `/admin/`  
3. Phase 3 — 공지·자료·문의·설정 React ✅ (`/admin/news` 등)  
4. Phase 4 — 빌드 스크립트·문서·회귀 ✅ (`docs/ROADMAP.md`)  
5. Phase 5 — 공개 목록 public-ui ✅ (쇼케이스·자료실·공지)  
※ 페이지 편집(`admin-pages.html`)은 레거시 유지

상세: `docs/ROADMAP.md`, `docs/SMOKE.md`, `docs/PHASE*-TASKS.md`

## 서브에이전트 사용 규칙

- **오케스트레이터(메인)** 가 범위·완료 조건을 프롬프트에 전부 넣는다. 계획 파일만 읽히지 않게 한다.
- 구현 에이전트는 **한 태스크·최소 파일 집합**만 수정한다.
- 병렬은 파일/영역이 겹치지 않을 때만 (예: 공개 카드 vs Express 서빙 설정).
- 구현 후 가능하면 스펙 준수·품질 리뷰를 거친다.
- 브라우저 스모크(로그인·등록·쇼케이스)는 사람이 최종 확인하는 것을 권장한다.

## 완료 보고 형식

- 변경 파일 목록
- 동작 확인 방법 (`npm start` + URL)
- `docs/SMOKE.md` 중 통과한 항목 ID
- 남은 리스크·미완료 항목
