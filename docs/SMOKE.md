# 스모크 체크리스트

서버: 프로젝트 루트에서 `npm start` → `http://localhost:3000`

자동 검사:

```bash
npm start   # 다른 터미널
npm run smoke
```

## 공통

| ID | 영역 | 확인 |
|----|------|------|
| S1 | 공개 | 홈 `/`, 쇼케이스 `/showcase.html`, 상세 1건 |
| S2 | 관리자 제품 | `/admin/` 로그인 → 제품 등록/수정/삭제 |
| S3 | 관리자 제품 | 이미지 keep, ▲▼·드래그 순서, 카테고리 |
| S4 | 쇼케이스 | 칩·검색·필터·더 보기 (`public-ui` ProductCard) |
| S5 | 관리자 탭 | `/admin/#/news` · `/admin/#/resources` · `/admin/#/inquiries` · `/admin/#/settings` 진입 |
| S6 | 페이지 편집 | `/admin-pages.html` 로드·저장 (레거시) |
| S7 | 리다이렉트 | `admin.html`→`/admin/`, `admin-news.html`→`/admin/#/news` 등 |

## Phase 1 (카드 모듈)

| ID | 확인 |
|----|------|
| P1-1 | 카드 UI 정상 |
| P1-2 | 카드는 `public-ui` ProductCard |
| P1-3 | S4 |
| P1-4 | 빈 목록 / API 실패 안내 |
| P1-5 | 상세 링크 |

## Phase 2–3 (React admin)

| ID | 확인 |
|----|------|
| P2-1 | `/admin/` SPA, 스타일·번들 로드 |
| P2-2 | 제품 FormData 저장 후 쇼케이스 반영 |
| P3-1 | 공지 CRUD |
| P3-2 | 자료 업로드·다운로드 |
| P3-3 | 문의 상태·메모·첨부 |
| P3-4 | 비밀번호 변경 UI |

## API 빠른 확인

```powershell
Invoke-RestMethod http://localhost:3000/api/products
```
