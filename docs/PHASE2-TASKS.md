# Phase 2 — 관리자 제품 React

## 목표

제품 관리 UI를 `admin-app` (Vite + React) SPA로 이전.  
기존 Express `/api/*` · 세션 쿠키 유지. 공개 사이트 변경 없음.

## 사용법

```bash
# 최초 / 의존성
npm install
cd admin-app && npm install && cd ..

# 관리자 빌드 후 사이트 실행
npm run build:admin
npm start
# → http://localhost:3000/admin/

# 개발 시 (API는 3000 프록시)
# 터미널1: npm start
# 터미널2: npm run dev:admin
# → http://localhost:5173/admin/
```

## 범위

- [x] 로그인 / 로그아웃 / 세션
- [x] 제품 목록·페이징·▲▼·드래그 순서
- [x] 등록·수정·삭제·FormData 이미지
- [x] 카테고리 CRUD
- [x] 미리보기 모달
- [x] 리치 에디터 핵심 (굵게/목록/표/본문 이미지)
- [ ] 표 셀 병합·리사이즈 (레거시 table-editor 동등) — 후속
- [ ] 공지·자료·문의 React — Phase 3

## 레거시

- `admin.html` → 빌드 있으면 `/admin/` 리다이렉트
- 공지 등: `admin-news.html` 등 기존 HTML 유지
