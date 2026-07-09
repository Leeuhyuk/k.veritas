# public-ui — 공개 목록 React 섬

## 범위

| 페이지 | 루트 | 번들 |
|--------|------|------|
| `showcase.html` | `#showcase-root` | `/public-ui/assets/showcase.js` |
| `reference.html` | `#resources-root` | `/public-ui/assets/resources.js` |
| `news.html` | `#news-root` | `/public-ui/assets/news.js` |

상세 페이지(`*-detail.html`)·네비/푸터는 HTML 유지.

## 컴포넌트

- `ProductCard` — 제품 카드
- `ResourceRow` — 자료실 행
- `NewsItem` — 공지 항목
- `FilterChips` / `LoadMore` / `StatusMessage` — 공통

## 명령

```bash
npm run build:public
npm run dev:public   # :5174
npm start            # dist 없으면 자동 빌드
```

## 상세 페이지 (HTML 유지, 톤 통일)

| 페이지 | 목록 링크 |
|--------|-----------|
| `showcase-detail.html` | `showcase.html` |
| `resource-detail.html` | `reference.html` |
| `news-detail.html` | `news.html` |

공통 클래스: `.detail__back` · `.detail__tags` · `.detail__date` · `.detail__title` · `.detail__body` · `.detail__actions`

> 구 `showcase-app/` 폴더·`product-card.js` 는 제거됨.
