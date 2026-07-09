# 로드맵 적용 상태

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | 규칙·스모크 문서 (`AGENTS.md`, `docs/SMOKE.md`) | ✅ |
| 1 | 공개 카드 모듈 (`product-card.js`) | ✅ |
| 2 | 관리자 제품 React (`admin-app`, `/admin/`) | ✅ |
| 3 | 공지·자료·문의·설정 React | ✅ |
| 4 | 운영 스크립트·문서·회귀·링크 정리 | ✅ (본 문서) |
| 5 | 공개 목록 public-ui (쇼케이스·자료실·공지) | ✅ |

## Phase 4 산출물

- `npm start` 시 dist 없으면 자동 `build:admin` (`scripts/ensure-admin-build.js`)
- `npm run smoke` HTTP 회귀 (`scripts/smoke-check.js`)
- 푸터 관리자 링크 → `/admin/`
- `admin-pages` 탭 → React 경로 연결
- 레거시 HTML 리다이렉트 유지

## 일상 실행

```bash
npm install
npm start          # prestart가 admin·showcase 빌드 보장
npm run smoke      # 서버 기동 후
```

개발:

```bash
npm start
npm run dev:admin     # :5173
npm run dev:showcase  # :5174
```

## Phase 5 메모

- `public-ui` 멀티 엔트리: showcase / resources / news
- 문서: `docs/PUBLIC-UI.md`
