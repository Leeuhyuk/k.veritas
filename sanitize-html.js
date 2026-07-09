/**
 * 공개 표시용 HTML 정리 (XSS 완화)
 * - Node / 브라우저 공용
 * - 관리자 RTE에서 쓰는 기본 태그만 허용
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (typeof root !== 'undefined') {
    root.sanitizeHtml = api.sanitizeHtml;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ALLOWED_TAGS = {
    p: 1, br: 1, strong: 1, b: 1, em: 1, i: 1, u: 1, s: 1, strike: 1,
    h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
    ul: 1, ol: 1, li: 1,
    table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, th: 1, td: 1, caption: 1, colgroup: 1, col: 1,
    a: 1, img: 1, span: 1, div: 1, blockquote: 1, pre: 1, code: 1, hr: 1, sub: 1, sup: 1,
  };

  var ALLOWED_ATTR = {
    href: 1, src: 1, alt: 1, title: 1, target: 1, rel: 1,
    class: 1, colspan: 1, rowspan: 1, width: 1, height: 1,
    style: 1, // 일부 표 폭 유지 — 아래에서 위험 값 제거
  };

  function isSafeUrl(url) {
    if (!url) return false;
    var u = String(url).trim().replace(/[\u0000-\u001f\u007f]/g, '');
    if (!u) return false;
    // javascript:, data:text/html, vbscript: 차단 (이미지 data:image 는 허용)
    if (/^\s*javascript\s*:/i.test(u)) return false;
    if (/^\s*vbscript\s*:/i.test(u)) return false;
    if (/^\s*data\s*:/i.test(u) && !/^\s*data\s*:\s*image\//i.test(u)) return false;
    return true;
  }

  function cleanStyle(style) {
    if (!style) return '';
    var s = String(style);
    // expression / url(javascript) / @import 등 제거
    if (/expression\s*\(|@import|javascript\s*:|behavior\s*:|binding\s*:/i.test(s)) return '';
    // 길이·색·정렬 정도만 남기도록 과도한 값 컷은 하지 않고 위험 패턴만 제거
    return s
      .replace(/expression\s*\([^)]*\)/gi, '')
      .replace(/url\s*\(\s*['"]?\s*javascript:[^)]*\)/gi, '')
      .slice(0, 500);
  }

  function sanitizeWithDom(html) {
    if (typeof document === 'undefined' || !document.implementation) return null;
    var doc = document.implementation.createHTMLDocument('');
    var body = doc.body;
    body.innerHTML = html;

    function walk(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === 1) {
          var tag = child.tagName.toLowerCase();
          if (!ALLOWED_TAGS[tag]) {
            // 내용은 유지하고 위험 태그만 제거
            while (child.firstChild) node.insertBefore(child.firstChild, child);
            node.removeChild(child);
            return;
          }
          // 속성 정리
          var attrs = Array.prototype.slice.call(child.attributes || []);
          attrs.forEach(function (attr) {
            var name = attr.name.toLowerCase();
            var val = attr.value || '';
            if (name.indexOf('on') === 0) {
              child.removeAttribute(attr.name);
              return;
            }
            if (!ALLOWED_ATTR[name]) {
              child.removeAttribute(attr.name);
              return;
            }
            if ((name === 'href' || name === 'src') && !isSafeUrl(val)) {
              child.removeAttribute(attr.name);
              return;
            }
            if (name === 'style') {
              var cleaned = cleanStyle(val);
              if (cleaned) child.setAttribute('style', cleaned);
              else child.removeAttribute('style');
            }
            if (name === 'target' && val === '_blank') {
              child.setAttribute('rel', 'noopener noreferrer');
            }
          });
          walk(child);
        } else if (child.nodeType === 8) {
          // 주석 제거
          node.removeChild(child);
        }
      });
    }

    walk(body);
    return body.innerHTML;
  }

  function sanitizeWithRegex(html) {
    var s = String(html || '');
    // null byte
    s = s.replace(/\u0000/g, '');
    // script/style/iframe 등 블록 제거
    s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
    s = s.replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|svg|math)(\s[^>]*)?\/?\s*>/gi, '');
    // 이벤트 핸들러
    s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // javascript: URL
    s = s.replace(/\b(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
    s = s.replace(/\b(href|src)\s*=\s*javascript:[^\s>]+/gi, '$1="#"');
    // data: (image 제외)
    s = s.replace(/\b(href|src)\s*=\s*(["'])\s*data:(?!image\/)[^"']*\2/gi, '$1=$2#$2');
    return s;
  }

  function sanitizeHtml(input) {
    if (input == null || input === '') return '';
    var html = String(input);
    // 먼저 정규식 1차 정리
    html = sanitizeWithRegex(html);
    // 브라우저면 DOM으로 한 번 더
    var dom = sanitizeWithDom(html);
    return dom != null ? dom : html;
  }

  return { sanitizeHtml: sanitizeHtml };
});
