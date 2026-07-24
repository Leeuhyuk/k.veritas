/* ============================================================
   페이지 콘텐츠 적용 + 편집 가능 요소 자동 수집
   - 명시적 표시:  [data-cms="키"] / [data-cms-img="키"]
   - 자동 인식:    아래 BUCKETS의 선택자에 해당하는 콘텐츠 요소
   admin-pages.html 도 window.cmsCollect 를 사용해 동일하게 폼을 구성합니다.
   ============================================================ */
(function () {
  // 자동 편집 대상 (선택자별로 순번 키를 부여)
  var BUCKETS = [
    { name: 'subhero_title', sel: '.subhero__title', label: '상단 제목' },
    { name: 'subhero_sub', sel: '.subhero__sub', label: '상단 설명' },
    { name: 'hero_headline', sel: '.hero__headline', label: '히어로 제목' },
    { name: 'hero_sub', sel: '.hero__sub', label: '히어로 설명' },
    { name: 'eyebrow', sel: '.microlabel', label: '말머리 라벨' },
    { name: 'sectitle', sel: '.section-title', label: '섹션 제목' },
    { name: 'card_title', sel: '.card__title', label: '카드 제목' },
    { name: 'card_body', sel: '.card__body', label: '카드 설명' },
    { name: 'split_body', sel: '.split__body', label: '본문 문단' },
    { name: 'split_li', sel: '.split__list li', label: '목록 항목' },
    { name: 'cta_title', sel: '.cta__title', label: '배너 제목' },
    { name: 'cta_sub', sel: '.cta__sub', label: '배너 설명' },
    { name: 'ch_title', sel: '.channel__title', label: '채널 제목' },
    { name: 'ch_detail', sel: '.channel__detail', label: '채널 내용' },
    { name: 'tl_year', sel: '.tl-row .tl-year', label: '연도' },
    { name: 'tl_text', sel: '.tl-row p', label: '연혁 내용' },
    { name: 'stat_num', sel: '.stat strong', label: '현황 숫자' },
    { name: 'stat_label', sel: '.stat span', label: '현황 라벨' },
    { name: 'faq_q', sel: '.faq__item summary', label: 'FAQ 질문' },
    { name: 'faq_a', sel: '.faq__answer', label: 'FAQ 답변' },
    { name: 'spec_cell', sel: '.spec th, .spec td', label: '표 칸' },
    { name: 'prose', sel: '.prose h2, .prose p, .prose li', label: '본문' },
  ];

  function inChrome(el) { return !!(el.closest && el.closest('#site-nav, #site-footer')); }
  function snippet(el) {
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 22 ? t.slice(0, 22) + '…' : t;
  }
  // 요소의 구조 경로(안정 키) — 항목 추가/삭제에도 다른 요소 키가 밀리지 않음
  function nodePath(el) {
    var parts = [];
    var n = el;
    while (n && n.nodeType === 1 && n.tagName !== 'BODY' && n.tagName !== 'HTML') {
      var t = n.tagName.toLowerCase(), i = 1, s = n;
      while (s.previousElementSibling) { s = s.previousElementSibling; if (s.tagName === n.tagName) i++; }
      parts.unshift(t + i);
      n = n.parentElement;
    }
    // 저장소(예: Firestore) 필드명에 안전하도록 [a-z0-9_] 만 사용
    return parts.join('_');
  }
  // 항목을 추가/삭제할 수 있는 반복 영역 (컨테이너 · 항목)
  var REPEAT = [
    { c: '.features__grid', i: '.card' },
    { c: '.cat-browse', i: '.cat-row' },
    { c: '.timeline', i: '.tl-row' },
    { c: '.faq', i: '.faq__item' },
    { c: '.channels', i: '.channel' },
    { c: '.stats', i: '.stat' },
    { c: '.pdp-grid', i: '.card' },
    { c: '.pdp-feats', i: '.pdp-feat' },
    { c: '.pdp-steps', i: '.pdp-step' },
    { c: '.spec tbody', i: 'tr' },
  ];
  function listKey(container) { return '__list__' + nodePath(container); }
  // 순서까지 관리하는(원본 포함 전체 재구성) 반복 영역 표시 키
  function fullKey(container) { return '__full__' + nodePath(container); }

  // 이미지가 없는 카드에 '선택 카드 이미지' 슬롯을 자동 주입 (공개/편집기 동일)
  //  → 편집기에서 빈 슬롯을 클릭해 사진을 넣을 수 있고, 저장된 사진은 공개 페이지에 표시됨
  function ensureCardMedia(root) {
    (root || document).querySelectorAll('.card').forEach(function (card) {
      if (inChrome(card)) return;
      if (card.querySelector('img')) return;                        // 이미 이미지 있음(cert 등)
      if (card.querySelector(':scope > .card__optimg')) return;     // 이미 슬롯 있음(biz 등)
      var box = document.createElement('div');
      box.className = 'card__optimg';
      var img = document.createElement('img');
      img.setAttribute('alt', '');
      img.setAttribute('data-cms-label', '카드 이미지(선택)');
      img.style.display = 'none';
      function show() { if (img.getAttribute('src')) { img.style.display = 'block'; box.classList.add('is-on'); } }
      img.addEventListener('load', show);
      box.appendChild(img);
      card.insertBefore(box, card.firstChild);
    });
  }

  // 편집 가능한 요소 목록을 결정적 순서로 수집 (공개페이지/관리자 동일)
  function collect(root) {
    ensureCardMedia(root);
    var fields = [];
    var used = [];
    function mark(el) { if (used.indexOf(el) !== -1) return false; used.push(el); return true; }

    root.querySelectorAll('[data-cms]').forEach(function (el) {
      if (inChrome(el) || !mark(el)) return;
      fields.push({ el: el, key: el.getAttribute('data-cms'), label: el.getAttribute('data-cms-label') || el.getAttribute('data-cms'), type: 'rich' });
    });
    root.querySelectorAll('[data-cms-img]').forEach(function (el) {
      if (inChrome(el) || !mark(el)) return;
      fields.push({ el: el, key: el.getAttribute('data-cms-img'), label: el.getAttribute('data-cms-label') || el.getAttribute('data-cms-img'), type: 'image' });
    });
    // 모든 텍스트(잎 요소) — 구조 경로 기반 안정 키로 stamp
    var AUTOSEL = 'main h1, main h2, main h3, main h4, main h5, main h6, main p, main li, main caption, main figcaption, main th, main td, main dt, main dd, main blockquote, main summary, main .tag, main .btn, main .faq__answer, main .hero-stat__num, main .hero-stat__label, main .cat-row__t b, main .cat-row__t span, main .stat strong, main .stat span, main .tl-year, main .channel__detail';
    var AUTO_INNER = 'h1,h2,h3,h4,h5,h6,p,li,caption,figcaption,th,td,dt,dd,blockquote,summary,.tag,.btn,.faq__answer,.hero-stat__num,.hero-stat__label,.cat-row__t b,.cat-row__t span,.stat strong,.stat span,.tl-year,.channel__detail,[data-cms],[data-cms-img]';
    root.querySelectorAll(AUTOSEL).forEach(function (el) {
      if (el.hasAttribute('data-cms') || el.hasAttribute('data-cms-img') || inChrome(el)) return;
      if (used.indexOf(el) !== -1) return;
      if (!(el.textContent || '').trim()) return;
      // 다른 편집 요소를 감싸는 래퍼는 건너뛰고 잎 요소만 편집 대상
      if (el.querySelector(AUTO_INNER)) return;
      if (!mark(el)) return;
      var kx = 'p_' + nodePath(el);
      try { el.setAttribute('data-cms', kx); } catch (e) { /* ignore */ }
      fields.push({ el: el, key: kx, label: snippet(el) || '텍스트', type: 'rich' });
    });
    // 본문 이미지도 전부 교체 가능하게 — 구조 경로 키
    root.querySelectorAll('main img').forEach(function (el) {
      if (el.hasAttribute('data-cms-img') || el.hasAttribute('data-cms') || inChrome(el) || !mark(el)) return;
      var ki = 'p_' + nodePath(el);
      try { el.setAttribute('data-cms-img', ki); } catch (e) { /* ignore */ }
      fields.push({ el: el, key: ki, label: '이미지', type: 'image' });
    });
    // 실제 페이지(DOM) 순서로 정렬 → 편집기 섹션 순서가 페이지와 일치
    // (명시 data-cms 를 먼저 모은 뒤 자동감지를 뒤에 붙여 순서가 어긋나던 문제 해결)
    fields.sort(function (a, b) {
      if (a.el === b.el) return 0;
      return (a.el.compareDocumentPosition(b.el) & 4) ? -1 : 1; /* 4 = FOLLOWING */
    });
    return fields;
  }

  /** /uploads/... · /static-api/... 절대경로 → SITE_BASE 보정 (GitHub Pages) */
  function fixMediaUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0 || url.charAt(0) === 'data:') return url;
    if (window.withSiteBase && url.charAt(0) === '/') return window.withSiteBase(url);
    return url;
  }

  /** HTML 안 img/src·a/href 의 /uploads/ 경로 보정 */
  function fixHtmlMedia(html) {
    return String(html || '').replace(
      /\b(src|href)=(["'])(\/uploads\/[^"']+)\2/gi,
      function (_m, attr, q, path) {
        return attr + '=' + q + fixMediaUrl(path) + q;
      }
    );
  }

  function wireTrustLogo(img) {
    if (!img || img._trustWired) return;
    img._trustWired = true;
    var item = img.closest('.trust-item') || img.parentElement;
    function showImage() {
      img.classList.add('is-on');
      if (item) item.classList.add('has-logo');
      if (!img.getAttribute('alt')) {
        var nameEl = item && item.querySelector('.trust-name');
        if (nameEl) img.setAttribute('alt', (nameEl.textContent || '').replace(/\s+/g, ' ').trim());
      }
    }
    function showName() {
      img.classList.remove('is-on');
      if (item) item.classList.remove('has-logo');
      img.removeAttribute('src');
    }
    img.addEventListener('load', showImage);
    img.addEventListener('error', showName);
  }

  function apply(data) {
    if (!data) return;
    collect(document).forEach(function (f) {
      if (!Object.prototype.hasOwnProperty.call(data, f.key)) return;
      var val = data[f.key];
      if (val === undefined || val === null) return;
      if (f.type === 'image') {
        if (f.el.tagName === 'IMG' && f.el.classList.contains('trust-logo')) {
          wireTrustLogo(f.el);
          var url = String(val || '').trim();
          // HTML 태그가 섞인 경우 src 추출
          if (url && url.indexOf('<') !== -1) {
            var mSrc = url.match(/src\s*=\s*["']([^"']+)["']/i);
            if (mSrc) url = mSrc[1];
          }
          if (!url || url === 'null' || url === 'undefined') {
            f.el.classList.remove('is-on');
            var itemEmpty = f.el.closest('.trust-item');
            if (itemEmpty) itemEmpty.classList.remove('has-logo');
            try { f.el.removeAttribute('src'); } catch (e0) { /* ignore */ }
            return;
          }
          var fixedLogo = fixMediaUrl(url);
          // 캐시된 이미지는 load 이벤트가 안 올 수 있음
          f.el.onload = function () {
            f.el.classList.add('is-on');
            var it = f.el.closest('.trust-item');
            if (it) it.classList.add('has-logo');
          };
          f.el.src = fixedLogo;
          if (f.el.complete && f.el.naturalWidth > 0) {
            f.el.classList.add('is-on');
            var it2 = f.el.closest('.trust-item');
            if (it2) it2.classList.add('has-logo');
          }
          return;
        }
        if (!val) return;
        var imgUrl = fixMediaUrl(val);
        if (f.el.tagName === 'IMG') {
          // 선택 카드 이미지(.card__optimg)는 load 이벤트에 의존하지 않고 즉시 표시
          // (loading=lazy + display:none 조합의 교착 방지)
          var optbox = f.el.closest && f.el.closest('.card__optimg');
          if (optbox) { f.el.removeAttribute('loading'); f.el.style.display = 'block'; optbox.classList.add('is-on'); }
          f.el.src = imgUrl;
        }
        else { f.el.style.backgroundImage = 'url(' + imgUrl + ')'; f.el.style.backgroundSize = 'cover'; f.el.style.backgroundPosition = 'center'; }
      } else {
        f.el.innerHTML = fixHtmlMedia(val);
      }
    });
    // 이미지 표시 크기: "<키>__h" (높이 px) — 고객사 로고는 CSS 고정(112px) 유지
    Object.keys(data).forEach(function (k) {
      if (k.slice(-3) !== '__h') return;
      var base = k.slice(0, -3), v = data[k];
      if (!v) return;
      if (/^client\d+_logo$/.test(base)) return;
      document.querySelectorAll('[data-cms-img="' + base + '"]').forEach(function (el) {
        el.style.height = v + 'px';
        if (el.tagName === 'IMG') el.style.width = 'auto';
      });
    });
    // 고객사 로고: 표시 상태 + 인라인 높이 제거(CSS 112px 적용)
    document.querySelectorAll('.trust-logo, .trust-item .trust-logo').forEach(function (img) {
      wireTrustLogo(img);
      img.style.height = '';
      img.style.width = '';
      img.style.maxHeight = '';
      img.style.maxWidth = '';
      img.style.border = '';
      img.style.padding = '';
      img.removeAttribute('width');
      img.removeAttribute('height');
      if (!img.getAttribute('src')) {
        img.classList.remove('is-on');
        var item = img.closest('.trust-item');
        if (item) item.classList.remove('has-logo');
      } else if (img.complete && img.naturalWidth > 0) {
        img.classList.add('is-on');
        var item2 = img.closest('.trust-item');
        if (item2) item2.classList.add('has-logo');
      }
    });
  }

  function htmlToText(html) {
    var div = document.createElement('div');
    div.innerHTML = String(html || '').replace(/<br\s*\/?>/gi, ' ');
    return (div.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function applyMaps(data) {
    document.querySelectorAll('[data-cms-map]').forEach(function (frame) {
      var key = frame.getAttribute('data-cms-map') || 'addr';
      var source = Object.prototype.hasOwnProperty.call(data || {}, key)
        ? data[key]
        : ((document.querySelector('[data-cms="' + key + '"]') || {}).innerHTML || '');
      var query = htmlToText(source);
      if (!query) return;
      frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(query) + '&t=&z=15&ie=UTF8&iwloc=&output=embed';
    });
  }

  function upsertMeta(selector, attr, name, value) {
    if (!value) return;
    var el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }
  function applySeo(data) {
    if (!data) return;
    var title = data.__seoTitle || '';
    var desc = data.__seoDescription || '';
    var image = data.__seoImage || '';
    if (title) document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', desc);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title || document.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
  }

  // 선택 카드 이미지(.card__optimg) 표시 — src 가 있으면 즉시 노출
  // (추가된 카드는 직렬화 HTML 에 display:none 이 남아 있어 여기서 강제 표시)
  function revealCardMedia(root) {
    (root || document).querySelectorAll('.card__optimg').forEach(function (box) {
      var img = box.querySelector('img');
      if (img && img.getAttribute('src')) {
        img.removeAttribute('loading');
        img.style.display = 'block';
        box.classList.add('is-on');
      }
    });
  }
  window.cmsRevealCardMedia = revealCardMedia;

  // 관리자에서 추가/정렬한 항목을 공개 페이지에 반영
  //  · 일반: base 항목 뒤에 추가 항목만 append
  //  · 관리형(__full__): 원본 포함 전체를 저장 순서대로 재구성
  function applyLists(data) {
    if (!data) return;
    REPEAT.forEach(function (r) {
      document.querySelectorAll(r.c).forEach(function (cont) {
        if (inChrome(cont)) return;
        var arr = data[listKey(cont)];
        var full = !!data[fullKey(cont)];
        if (full) {
          if (!arr) return;
          // 전체 관리: 기존 항목 제거 후 저장 순서대로 재구성
          [].slice.call(cont.querySelectorAll(':scope > ' + r.i)).forEach(function (x) { x.remove(); });
        } else if (!arr || !arr.length) {
          return;
        }
        arr.forEach(function (html) {
          var s = String(html || '').trim();
          if (!s) return;
          // 표 행(tr)은 div.innerHTML 로 파싱하면 사라지므로 tbody 컨텍스트에서 파싱
          var tmp = document.createElement(cont.tagName === 'TBODY' ? 'tbody' : 'div');
          tmp.innerHTML = s;
          var node = tmp.firstElementChild;
          if (node) { node.setAttribute('data-cms-added', '1'); cont.appendChild(node); revealCardMedia(node); }
        });
      });
    });
  }

  window.cmsCollect = collect;
  window.cmsNodePath = nodePath;
  window.cmsListKey = listKey;
  window.cmsFullKey = fullKey;
  window.cmsRepeat = REPEAT;
  window.cmsApplyLists = applyLists;

  /** Firestore REST (공개 읽기) — 관리자 저장 직후 static-api 없이도 반영 */
  function fetchFirestorePage(page) {
    var projectId = 'production-management-e70fd';
    var url =
      'https://firestore.googleapis.com/v1/projects/' +
      projectId +
      '/databases/(default)/documents/pages/' +
      encodeURIComponent(page);
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) return null;
      return r.json().then(function (doc) {
        if (!doc || !doc.fields) return null;
        return firestoreFieldsToObject(doc.fields);
      });
    }).catch(function () { return null; });
  }

  function firestoreValue(v) {
    if (!v || typeof v !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(v, 'stringValue')) return v.stringValue;
    if (Object.prototype.hasOwnProperty.call(v, 'integerValue')) return Number(v.integerValue);
    if (Object.prototype.hasOwnProperty.call(v, 'doubleValue')) return v.doubleValue;
    if (Object.prototype.hasOwnProperty.call(v, 'booleanValue')) return v.booleanValue;
    if (Object.prototype.hasOwnProperty.call(v, 'nullValue')) return null;
    if (v.mapValue && v.mapValue.fields) return firestoreFieldsToObject(v.mapValue.fields);
    if (v.arrayValue && v.arrayValue.values) {
      return (v.arrayValue.values || []).map(firestoreValue);
    }
    return null;
  }

  function firestoreFieldsToObject(fields) {
    var o = {};
    Object.keys(fields || {}).forEach(function (k) {
      o[k] = firestoreValue(fields[k]);
    });
    return o;
  }

  // 사이트 공통(일괄) 설정 적용 — 모든 페이지에 동일 적용되는 CSS 변수 등
  function applyGlobal(g) {
    if (!g) return;
    var op = g.__subheroBgOpacity;
    if (op !== undefined && op !== null && op !== '') {
      var v = parseFloat(op);
      if (!isNaN(v)) {
        if (v > 1) v = v / 100; // 퍼센트로 저장된 값 방어
        v = Math.max(0, Math.min(1, v));
        if (document.body) document.body.style.setProperty('--subhero-bg-opacity', String(v));
      }
    }
  }
  window.cmsApplyGlobal = applyGlobal;

  function loadPageContent(page) {
    // 1) API (로컬 서버 / site-base 가 static-api 로 폴백)
    return fetch('/api/content/' + page)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        // 로컬(개발 서버)만 API 사용, 그 외 모든 배포는 Firestore 병합
        var host = (location.hostname || '').toLowerCase();
        var onStaticHost = globalThis.FORCE_STATIC_API === true ||
          !(host === 'localhost' || /^127(?:\.\d+){3}$/.test(host) || host === '::1' || /\.local$/.test(host));
        // 로컬 Express 등: API 결과만 사용
        if (!onStaticHost) return data || {};
        // GitHub Pages: static-api 스냅샷 + Firestore 최신본 병합
        // (스냅샷에 로고가 비어 있어도 관리자 저장본 URL이 있으면 표시)
        return fetchFirestorePage(page).then(function (live) {
          var base = data && typeof data === 'object' ? data : {};
          if (live && typeof live === 'object' && Object.keys(live).length) {
            return Object.assign({}, base, live);
          }
          return base;
        });
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!page || page === 'k.veritas') page = 'index.html';
    // 사이트 공통 설정(모든 페이지 일괄) — 병렬로 로드/적용
    loadPageContent('site-settings').then(function (g) { applyGlobal(g); }).catch(function () {});
    loadPageContent(page).then(function (data) {
      apply(data);
      // 편집기(?edit=1)에서는 추가 항목을 편집기가 직접 이어붙이며 관리 → 여기선 건너뜀
      if (!/[?&]edit=1\b/.test(location.search || '')) applyLists(data);
      revealCardMedia();
      applyMaps(data);
      applySeo(data);
      // SEO og:image 절대경로 보정
      if (data && data.__seoImage) {
        var fixed = fixMediaUrl(data.__seoImage);
        if (fixed !== data.__seoImage) {
          var el = document.querySelector('meta[property="og:image"]');
          if (el) el.setAttribute('content', fixed);
        }
      }
    }).catch(function () {});
  });
})();
