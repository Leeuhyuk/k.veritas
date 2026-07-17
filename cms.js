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

  // 편집 가능한 요소 목록을 결정적 순서로 수집 (공개페이지/관리자 동일)
  function collect(root) {
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
    BUCKETS.forEach(function (b) {
      var n = 0;
      root.querySelectorAll(b.sel).forEach(function (el) {
        if (el.hasAttribute('data-cms') || inChrome(el) || !mark(el)) return;
        n++;
        var k = 'auto:' + b.name + ':' + n;
        try { el.setAttribute('data-cms', k); } catch (e) { /* ignore */ }
        fields.push({ el: el, key: k, label: b.label + (n > 1 ? ' ' + n : ''), type: 'rich' });
      });
    });
    // 나머지 모든 텍스트(블록 단위 잎 요소)도 편집 가능하게 — "모든 항목 편집"
    var CATCH = 'main h1, main h2, main h3, main h4, main h5, main h6, main p, main li, main caption, main figcaption, main th, main td, main dt, main dd, main blockquote, main .tag, main .btn, main .hero-stat__num, main .hero-stat__label';
    var CATCH_INNER = 'h1,h2,h3,h4,h5,h6,p,li,caption,figcaption,th,td,dt,dd,blockquote,.tag,.btn,.hero-stat__num,.hero-stat__label,[data-cms],[data-cms-img]';
    var xn = 0;
    root.querySelectorAll(CATCH).forEach(function (el) {
      if (el.hasAttribute('data-cms') || el.hasAttribute('data-cms-img') || inChrome(el)) return;
      if (used.indexOf(el) !== -1) return;
      if (!(el.textContent || '').trim()) return;
      // 다른 편집 요소를 감싸는 래퍼는 건너뛰고 잎 요소만 편집 대상
      if (el.querySelector(CATCH_INNER)) return;
      if (!mark(el)) return;
      var kx = 'auto:x:' + (++xn);
      try { el.setAttribute('data-cms', kx); } catch (e) { /* ignore */ }
      fields.push({ el: el, key: kx, label: snippet(el) || '텍스트', type: 'rich' });
    });
    // 본문 이미지도 전부 교체 가능하게
    var imn = 0;
    root.querySelectorAll('main img').forEach(function (el) {
      if (el.hasAttribute('data-cms-img') || el.hasAttribute('data-cms') || inChrome(el) || !mark(el)) return;
      var ki = 'auto:img:' + (++imn);
      try { el.setAttribute('data-cms-img', ki); } catch (e) { /* ignore */ }
      fields.push({ el: el, key: ki, label: '이미지 ' + imn, type: 'image' });
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
        if (f.el.tagName === 'IMG') { f.el.src = imgUrl; }
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

  window.cmsCollect = collect;

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

  function loadPageContent(page) {
    // 1) API (로컬 서버 / site-base 가 static-api 로 폴백)
    return fetch('/api/content/' + page)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (data) {
        var host = location.hostname || '';
        var onStaticHost =
          /\.github\.io$/i.test(host) || globalThis.FORCE_STATIC_API === true;
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
    loadPageContent(page).then(function (data) {
      apply(data);
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
