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
        fields.push({ el: el, key: 'auto:' + b.name + ':' + n, label: b.label + (n > 1 ? ' ' + n : ''), type: 'rich' });
      });
    });
    return fields;
  }

  function apply(data) {
    if (!data) return;
    collect(document).forEach(function (f) {
      if (!Object.prototype.hasOwnProperty.call(data, f.key)) return;
      var val = data[f.key];
      if (val === undefined || val === null) return;
      if (f.type === 'image') {
        if (!val) return;
        if (f.el.tagName === 'IMG') { f.el.src = val; }
        else { f.el.style.backgroundImage = 'url(' + val + ')'; f.el.style.backgroundSize = 'cover'; f.el.style.backgroundPosition = 'center'; }
      } else {
        f.el.innerHTML = val;
      }
    });
    // 이미지 표시 크기: "<키>__h" (높이 px)
    Object.keys(data).forEach(function (k) {
      if (k.slice(-3) !== '__h') return;
      var base = k.slice(0, -3), v = data[k];
      if (!v) return;
      document.querySelectorAll('[data-cms-img="' + base + '"]').forEach(function (el) {
        el.style.height = v + 'px';
        if (el.tagName === 'IMG') el.style.width = 'auto';
      });
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

  document.addEventListener('DOMContentLoaded', function () {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    fetch('/api/content/' + page).then(function (r) { return r.json(); }).then(function (data) {
      apply(data);
      applyMaps(data);
      applySeo(data);
    }).catch(function () {});
  });
})();
