/* ============================================================
   k.veritas — 공통 네비게이션 / 푸터
   메뉴 항목은 여기 NAV_GROUPS 한 곳만 고치면 전 페이지에 반영됩니다.
   페이지에 <div id="site-nav"></div> 와 <div id="site-footer"></div>
   를 두고 이 스크립트를 불러오면 자동으로 채워집니다.
   ============================================================ */

/* 상단 드롭다운 메뉴 정의 — 항목 추가는 children 배열에 한 줄 추가 */
const NAV_GROUPS = [
  {
    key: 'company',
    label: '회사소개',
    href: 'about.html',
    children: [
      { label: '회사소개', href: 'about.html' },
      { label: '연혁', href: 'about.html#history' },
      { label: '인증·특허', href: 'certifications.html' },
      { label: '시험·조립 설비', href: 'facilities.html' },
      { label: '오시는 길', href: 'location.html' },
    ],
  },
  {
    key: 'biz',
    label: '사업영역',
    href: 'index.html#business',
    children: [
      { label: '시험기 설계·제작', href: 'biz-machining.html' },
      { label: '시험 규격 대응', href: 'biz-mold.html' },
      { label: '설치·교정·지원', href: 'biz-assembly.html' },
    ],
  },
  {
    key: 'prod',
    label: '제품소개',
    href: 'products.html',
    children: [
      { label: '생산제품', href: 'showcase.html' },
      { label: '가구 내구성 시험기', href: 'product-parts.html' },
      { label: '금속·재료 시험기', href: 'product-mold.html' },
      { label: '내구성·피로 시험기', href: 'product-module.html' },
    ],
  },
  {
    key: 'support',
    label: '고객지원',
    href: 'support.html',
    children: [
      { label: '공지사항', href: 'news.html' },
      { label: '자료실', href: 'reference.html' },
      { label: '문의 채널', href: 'support.html#channels' },
      { label: '자주 묻는 질문', href: 'support.html#faq' },
      { label: '견적 문의', href: 'support.html#contact' },
    ],
  },
];

/* 푸터 컬럼 정의 */
const FOOTER_COLS = [
  {
    title: '사업영역',
    links: [
      { label: '시험기 설계·제작', href: 'biz-machining.html' },
      { label: '시험 규격 대응', href: 'biz-mold.html' },
      { label: '설치·교정·지원', href: 'biz-assembly.html' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: '회사소개', href: 'about.html' },
      { label: '인증·특허', href: 'certifications.html' },
      { label: '시험·조립 설비', href: 'facilities.html' },
      { label: '오시는 길', href: 'location.html' },
    ],
  },
  {
    title: '자료',
    links: [
      { label: '생산제품', href: 'showcase.html' },
      { label: '자료실', href: 'reference.html' },
      { label: '공지사항', href: 'news.html' },
      // 상대경로 — GitHub Pages(/k.veritas/)에서도 올바른 admin/ 으로 연결
      { label: '관리자', href: 'admin/' },
    ],
  },
];

const LOGO_SVG =
  '<svg width="14" height="20" viewBox="0 0 14 20" fill="none" aria-hidden="true">' +
  '<path d="M11 1 L3 19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const SEARCH_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
  '<circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>' +
  '<path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

/* 현재 페이지가 속한 그룹 키 (활성 메뉴 표시용) */
function currentGroupKey() {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const map = {
    'about.html': 'company', 'certifications.html': 'company', 'facilities.html': 'company', 'location.html': 'company',
    'biz-machining.html': 'biz', 'biz-mold.html': 'biz', 'biz-assembly.html': 'biz',
    'products.html': 'prod', 'product-parts.html': 'prod', 'product-mold.html': 'prod', 'product-module.html': 'prod', 'showcase.html': 'prod', 'showcase-detail.html': 'prod',
    'support.html': 'support', 'news.html': 'support', 'news-detail.html': 'support', 'reference.html': 'support',
  };
  return map[file] || '';
}

function renderNav() {
  const active = currentGroupKey();

  /* 데스크톱 드롭다운 */
  const groups = NAV_GROUPS.map((g) => {
    const items = g.children
      .map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
      .join('');
    const isActive = g.key === active ? ' is-active' : '';
    return (
      `<li class="has-dropdown">` +
      `<a href="${g.href}" class="nav__trigger${isActive}" aria-haspopup="true">${g.label}</a>` +
      `<ul class="dropdown">${items}</ul>` +
      `</li>`
    );
  }).join('');

  /* 모바일 메뉴 (펼침형) */
  const mobileGroups = NAV_GROUPS.map((g) => {
    const items = g.children
      .map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
      .join('');
    return (
      `<div class="m-group">` +
      `<p class="m-group__label microlabel">${g.label}</p>` +
      `<ul class="m-group__items">${items}</ul>` +
      `</div>`
    );
  }).join('');

  return (
    `<header class="nav" id="site-header"><nav class="nav__inner">` +
    `<ul class="nav__links nav__links--left">${groups}</ul>` +
    `<a href="index.html" class="logo" aria-label="회사 홈">${LOGO_SVG}<span class="logo__wm">k<span class="logo__dot">.</span>veritas</span></a>` +
    `<ul class="nav__links nav__links--right">` +
    `<li><button type="button" class="icon-btn nav-search-btn" aria-label="사이트 검색 열기" title="검색">${SEARCH_SVG}</button></li>` +
    `<li><a href="index.html" class="btn btn--ghost">회사소개</a></li>` +
    `<li><a href="support.html#contact" class="btn btn--primary">견적 문의</a></li>` +
    `</ul>` +
    `<button class="nav__burger" aria-label="메뉴" aria-expanded="false" aria-controls="mobile-menu">` +
    `<span></span><span></span><span></span></button>` +
    `</nav>` +
    `<div class="mobile-menu" id="mobile-menu">${mobileGroups}` +
    `<div class="mobile-menu__cta">` +
    `<button type="button" class="btn btn--ghost nav-search-btn">${SEARCH_SVG}<span>검색</span></button>` +
    `<a href="index.html" class="btn btn--ghost">회사소개</a>` +
    `<a href="support.html#contact" class="btn btn--primary">견적 문의</a>` +
    `</div></div>` +
    `<div class="site-search" id="site-search" hidden>` +
    `<div class="site-search__panel" role="dialog" aria-modal="true" aria-labelledby="site-search-title">` +
    `<div class="site-search__head"><h2 id="site-search-title">검색</h2><button type="button" class="icon-btn" id="site-search-close" aria-label="검색 닫기">×</button></div>` +
    `<label class="site-search__field" for="site-search-input">${SEARCH_SVG}<input id="site-search-input" type="search" placeholder="제품, 소재, 공정, 자료 검색" autocomplete="off" /></label>` +
    `<div class="site-search__results" id="site-search-results"><p class="site-search__empty">검색어를 입력하세요.</p></div>` +
    `</div></div></header>`
  );
}

/* 햄버거 토글 + 링크 클릭 시 닫기 */
function wireMobileMenu() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const burger = header.querySelector('.nav__burger');
  const menu = header.querySelector('.mobile-menu');
  if (!burger || !menu) return;

  burger.addEventListener('click', () => {
    const open = header.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      header.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
}

function wireSiteSearch() {
  const overlay = document.getElementById('site-search');
  if (!overlay) return;
  const input = document.getElementById('site-search-input');
  const results = document.getElementById('site-search-results');
  const closeBtn = document.getElementById('site-search-close');
  const header = document.getElementById('site-header');
  const burger = header?.querySelector('.nav__burger');
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let timer = null;
  let controller = null;

  const setMessage = (text) => {
    results.innerHTML = `<p class="site-search__empty">${esc(text)}</p>`;
  };
  const closeSearch = () => {
    overlay.hidden = true;
    document.body.classList.remove('is-search-open');
  };
  const openSearch = () => {
    if (header) header.classList.remove('is-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    overlay.hidden = false;
    document.body.classList.add('is-search-open');
    window.setTimeout(() => input?.focus(), 0);
  };
  const renderResults = (items) => {
    if (!items.length) {
      setMessage('검색 결과가 없습니다.');
      return;
    }
    results.innerHTML = items.map((item) => (
      `<a class="site-search__item" href="${esc(item.url)}">` +
      `<span class="site-search__type">${esc(item.type)}</span>` +
      `<strong>${esc(item.title)}</strong>` +
      `<small>${esc(item.summary)}</small>` +
      `</a>`
    )).join('');
  };
  const runSearch = () => {
    const q = (input?.value || '').trim();
    if (!q) {
      if (controller) controller.abort();
      setMessage('검색어를 입력하세요.');
      return;
    }
    if (controller) controller.abort();
    controller = new AbortController();
    setMessage('검색 중입니다.');
    fetch('/api/search?q=' + encodeURIComponent(q), { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(renderResults)
      .catch((err) => {
        if (err.name !== 'AbortError') setMessage('검색을 불러오지 못했습니다.');
      });
  };

  document.querySelectorAll('.nav-search-btn').forEach((btn) => btn.addEventListener('click', openSearch));
  closeBtn?.addEventListener('click', closeSearch);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearch(); });
  results.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
  input?.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(runSearch, 180);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeSearch();
  });
}

/* 문의 폼 → 서버 접수 (DB 저장) */
function wireInquiryForm() {
  const form = document.getElementById('inquiry-form');
  if (!form) return;
  const msg = document.getElementById('inquiry-msg');
  const val = (id) => (form.querySelector('#' + id)?.value || '').trim();
  const params = new URLSearchParams(location.search);
  const productId = params.get('productId') || '';
  const productTitle = params.get('productTitle') || '';
  if (productId || productTitle) {
    let idInput = form.querySelector('#productId');
    let titleInput = form.querySelector('#productTitle');
    if (!idInput) {
      idInput = document.createElement('input');
      idInput.type = 'hidden';
      idInput.id = 'productId';
      idInput.name = 'productId';
      form.appendChild(idInput);
    }
    if (!titleInput) {
      titleInput = document.createElement('input');
      titleInput.type = 'hidden';
      titleInput.id = 'productTitle';
      titleInput.name = 'productTitle';
      form.appendChild(titleInput);
    }
    idInput.value = productId;
    titleInput.value = productTitle;
    if (productTitle && !val('message')) {
      const message = form.querySelector('#message');
      if (message) message.value = `[제품 문의] ${productTitle}\n\n수량:\n희망 납기:\n도면 첨부 여부:\n문의 내용:`;
    }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (msg) { msg.style.color = ''; msg.textContent = '보내는 중…'; }
    const payload = new FormData(form);
    payload.set('name', val('name'));
    payload.set('company', val('company'));
    payload.set('email', val('email'));
    payload.set('phone', val('phone'));
    payload.set('type', val('type'));
    payload.set('message', val('message'));
    payload.set('website', val('website'));
    payload.set('agree', form.querySelector('#agree')?.checked ? 'true' : 'false');
    payload.set('productId', productId || val('productId'));
    payload.set('productTitle', productTitle || val('productTitle'));
    fetch('/api/inquiries', {
      method: 'POST',
      body: payload,
    }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || '접수에 실패했습니다.');
      return d;
    }).then(() => {
      form.reset();
      if (msg) { msg.style.color = ''; msg.textContent = '문의가 정상 접수되었습니다. 빠르게 회신드리겠습니다.'; }
    }).catch((err) => {
      if (msg) { msg.style.color = 'var(--color-warm-loam)'; msg.textContent = err.message; }
    });
  });
}

function wireNoticePopups() {
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (file.startsWith('admin')) return;

  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('ko-KR'); } catch (e) { return ''; } };
  const key = 'kveritas_notice_popup_closed';
  const readClosed = () => {
    try { return JSON.parse(sessionStorage.getItem(key) || '[]'); } catch (e) { return []; }
  };
  const writeClosed = (ids) => {
    try { sessionStorage.setItem(key, JSON.stringify(ids)); } catch (e) {}
  };

  fetch('/api/news')
    .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
    .then((items) => {
      const closed = readClosed();
      const popups = items.filter((n) => n.isPopup && !closed.includes(n.id)).slice(0, 3);
      if (!popups.length) return;

      const el = document.createElement('div');
      el.className = 'notice-popup';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'notice-popup-title');
      el.innerHTML = `
        <div class="notice-popup__panel">
          <div class="notice-popup__head">
            <div>
              <p class="microlabel">NOTICE</p>
              <h2 id="notice-popup-title">공지사항</h2>
            </div>
            <button type="button" class="icon-btn notice-popup__close" aria-label="공지 팝업 닫기">×</button>
          </div>
          <div class="notice-popup__list">
            ${popups.map((n) => `
              <article class="notice-popup__item">
                <p class="news-item__date">${fmt(n.createdAt)}</p>
                <h3>${esc(n.title)}</h3>
                ${strip(n.body) ? `<p>${esc(strip(n.body)).slice(0, 110)}</p>` : ''}
                <a class="btn btn--ghost btn--sm" href="news-detail.html?id=${encodeURIComponent(n.id)}">자세히 보기</a>
              </article>
            `).join('')}
          </div>
        </div>`;

      const close = () => {
        writeClosed(Array.from(new Set(readClosed().concat(popups.map((n) => n.id)))));
        el.remove();
      };
      el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.notice-popup__close')) close(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key !== 'Escape' || !document.body.contains(el)) return;
        document.removeEventListener('keydown', onKey);
        close();
      });
      document.body.appendChild(el);
    })
    .catch(() => {});
}

function renderFooter() {
  const cols = FOOTER_COLS.map((col) => {
    const links = col.links
      .map((l) => `<a href="${l.href}">${l.label}</a>`)
      .join('');
    return `<div><p class="microlabel">${col.title}</p>${links}</div>`;
  }).join('');

  return (
    `<footer class="footer"><div class="footer__inner">` +
    `<a href="index.html" class="logo">${LOGO_SVG}<span class="logo__wm">k<span class="logo__dot">.</span>veritas</span></a>` +
    `<nav class="footer__cols">${cols}</nav>` +
    `</div>` +
    `<p class="footer__fine mono">© 2026 k.veritas · 경기도 안산시 단원구 · 대표전화 031-000-0000 · <a href="privacy.html">개인정보처리방침</a></p>` +
    `</footer>`
  );
}

/* 파비콘 / 기본 OG 태그를 전 페이지에 주입 */
function injectHeadMeta() {
  if (!document.querySelector('link[rel="icon"]')) {
    const l = document.createElement('link');
    l.rel = 'icon'; l.type = 'image/svg+xml'; l.href = 'favicon.svg';
    document.head.appendChild(l);
  }
  // CSS 캐시 갱신 (로고 크기 등 스타일 변경 반영)
  document.querySelectorAll('link[rel="stylesheet"][href*="styles.css"]').forEach((link) => {
    const base = (link.getAttribute('href') || '').split('?')[0];
    link.setAttribute('href', base + '?v=trust-logo-112-gap20');
  });
  const og = { 'og:site_name': 'k.veritas', 'og:type': 'website', 'og:title': document.title };
  Object.keys(og).forEach((k) => {
    if (document.querySelector(`meta[property="${k}"]`)) return;
    const m = document.createElement('meta');
    m.setAttribute('property', k); m.setAttribute('content', og[k]);
    document.head.appendChild(m);
  });
}

/* 스크롤 리빌 초기화 플래그 — head 인라인 안전장치가 참조 */
window.__revealInit = true;

/* 스크롤 리빌 애니메이션 (공개 페이지) — 스크롤 위치 기반(모든 환경에서 동작) */
function wireScrollReveal() {
  try {
    if (!document.body.classList.contains('site-hp')) return;
    /* 모션 최소화 선호 시: 숨김 해제하고 종료 */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reveal-off');
      return;
    }

    var sel = '.hero__content > *, .hero__media, .hero-stat, .section-head, .cat-row, .card,'
      + '.split__text, .split__media, .cta > *, .subhero__inner > *, .channel, .faq__item,'
      + '.pdp-figure, .pdp-sec__head, .pdp-highlight, .pdp-feat, .pdp-step, .spec, .stat, .tl-row';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!els.length) return;

    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    var trigger = vh * 0.9;   /* 뷰포트 하단 근처에 들어오면 등장 */

    /* 초기 화면에 보이는(위쪽) 요소는 건드리지 않음 → 항상 보임.
       스크롤해야 나오는(아래쪽) 요소만 arm(숨김) 처리해 애니메이션 대상으로 */
    var pending = [];
    els.forEach(function (el) {
      if (el.getBoundingClientRect().top >= trigger) {
        el.classList.add('reveal-armed');
        pending.push(el);
      }
    });
    if (!pending.length) return;   /* 전부 화면 안 → 숨길 것 없음 */

    /* 같은 부모의 형제 요소는 순차 지연(stagger) — animation-delay만 사용해 호버와 무충돌 */
    var seen = new Map();
    pending.forEach(function (el) {
      var p = el.parentElement || document.body;
      var i = seen.get(p) || 0; seen.set(p, i + 1);
      var d = Math.min(i * 70, 300);
      if (d) el.style.animationDelay = d + 'ms';
    });

    var ticking = false;
    var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

    function check() {
      ticking = false;
      var h = window.innerHeight || document.documentElement.clientHeight || 800;
      var t = h * 0.9;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        if (el.getBoundingClientRect().top < t) {
          el.classList.add('reveal-in');
          /* 안전장치: 애니메이션이 진행되지 않는 환경에서도 확실히 표시 */
          (function (node) { setTimeout(function () { node.classList.add('reveal-shown'); }, 1500); })(el);
          pending.splice(i, 1);
        }
      }
      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; raf(check); } }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    /* 레이아웃/뷰포트 안정화 후 자동 보정 — 초기에 잘못 숨겨진 상단 요소를 즉시 표시 */
    raf(check);
    setTimeout(check, 200);
    window.addEventListener('load', check);

    /* 최종 안전장치: 혹시 스크롤 이벤트가 오지 않아도 5초 뒤 남은 요소 모두 표시 */
    setTimeout(function () {
      pending.forEach(function (el) { el.classList.add('reveal-in', 'reveal-shown'); });
      pending.length = 0;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }, 5000);
  } catch (err) {
    /* 어떤 이유로든 실패하면 숨김 상태를 해제해 콘텐츠가 항상 보이도록 */
    document.documentElement.classList.add('reveal-off');
  }
}

/* 제품 상세(PDP) — 목차 스크롤 스파이 + 툴바 액션 */
function wireProductPage() {
  const pdp = document.querySelector('.pdp');
  if (!pdp) return;

  /* 목차 스크롤 스파이 */
  const links = Array.from(pdp.querySelectorAll('.pdp-toc a[href^="#"]'));
  const sections = links
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if (sections.length) {
    const setActive = (id) => {
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    };
    const spy = new IntersectionObserver((entries) => {
      const vis = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    sections.forEach((s) => spy.observe(s));
    setActive(sections[0].id);
    /* 부드러운 스크롤 */
    links.forEach((a) => a.addEventListener('click', (e) => {
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', a.getAttribute('href'));
    }));
  }

  /* 툴바 액션: 인쇄 / 공유 */
  const printBtn = pdp.querySelector('[data-pdp-action="print"]');
  if (printBtn) printBtn.addEventListener('click', () => window.print());

  const shareBtn = pdp.querySelector('[data-pdp-action="share"]');
  if (shareBtn) shareBtn.addEventListener('click', async () => {
    const shareData = { title: document.title, url: location.href };
    try {
      if (navigator.share) { await navigator.share(shareData); return; }
      await navigator.clipboard.writeText(location.href);
      const label = shareBtn.querySelector('span');
      if (label) { const t = label.textContent; label.textContent = '링크 복사됨'; setTimeout(() => { label.textContent = t; }, 1600); }
    } catch (_) { /* 사용자 취소 등 무시 */ }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectHeadMeta();
  const navMount = document.getElementById('site-nav');
  const footMount = document.getElementById('site-footer');
  if (navMount) navMount.innerHTML = renderNav();
  if (footMount) footMount.innerHTML = renderFooter();
  wireMobileMenu();
  wireSiteSearch();
  wireInquiryForm();
  wireNoticePopups();
  wireProductPage();
  wireScrollReveal();
});
