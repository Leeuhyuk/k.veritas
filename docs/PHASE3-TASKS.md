# Phase 3 — 공지·자료·문의·설정 React

## 라우트 (`basename=/admin`)

| 경로 | 기능 |
|------|------|
| `/admin/` | 제품 |
| `/admin/news` | 공지 |
| `/admin/resources` | 자료실 |
| `/admin/inquiries` | 문의 |
| `/admin/settings` | 비밀번호 변경 |
| `/admin-pages.html` | 페이지 편집 (레거시 유지) |

## 레거시 리다이렉트

- `admin-news.html` → `/admin/news`
- `admin-resources.html` → `/admin/resources`
- `admin-inquiries.html` → `/admin/inquiries`
- `admin-settings.html` → `/admin/settings`

## 빌드

```bash
npm run build:admin
npm start
```
