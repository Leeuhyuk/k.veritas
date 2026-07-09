# Phase 1 — 공개 제품 카드 모듈화 (에이전트 실행용)

## 목표

쇼케이스 목록 카드 HTML 생성을 `product-card.js` 한곳으로 옮기고,  
`showcase.html`은 필터·페이징·데이터 로딩만 담당한다.  
**동작·UI 회귀 없음.** React 도입 없음.

## 비범위

- 홈 미리보기 섹션 (선택 후속)
- API·CSS 클래스명 변경
- 관리자·상세 페이지 리팩터
- 빌드 툴 도입

## 태스크

### T1. `product-card.js` 추가

**파일:** `product-card.js` (사이트 루트)

**요구:**

- IIFE 또는 동등 패턴으로 전역 `ProductCard` (또는 `window.ProductCard`) 노출
- `esc(str)` — 기존과 동일 이스케이프 (`& < > "`)
- `renderCard(product)` — 기존 `showcase.html` 카드와 **동일 마크업**:
  - `a.show-card` → `showcase-detail.html?id=...`
  - media: 첫 이미지 또는 `NO IMAGE`
  - body: category tag, industry/material/process meta, title, summary
- `renderCards(products)` — 배열 map join

**완료:** 모듈만 추가, 다른 파일 미연결이어도 T1 완료 가능.

### T2. `showcase.html` 연결

**파일:** `showcase.html`

**요구:**

- `<script src="product-card.js"></script>` (`site.js` 근처)
- 인라인의 카드 템플릿 제거 → `ProductCard.renderCard` / `renderCards` 사용
- `esc` 중복은 칩/select용으로 페이지에 남겨도 되고, `ProductCard.esc` 재사용 가능
- 필터·더 보기·fetch 로직 유지

**완료:** P1-1 ~ P1-5, S1, S4

### T3. 검증

- `npm start` 후 쇼케이스 육안·필터·상세 링크
- `docs/SMOKE.md` Phase 1 항목 체크
- 변경 파일: `product-card.js`, `showcase.html` (+ 문서)

## 완료 조건 (Phase 1)

- [x] 카드 마크업 단일 정의 (`product-card.js`)
- [x] `showcase.html` 모듈 연결, 인라인 카드 템플릿 제거
- [x] 모듈 단위 테스트 + `/api/products`·정적 서빙 확인
- [ ] 브라우저 육안: S1, S4, P1-1~P1-5 (로컬에서 한 번 더 확인 권장)

## 다음 Phase

Phase 2: `docs`에 admin React 태스크 추가 예정. API 스키마 변경 금지.
