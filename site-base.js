/**
 * GitHub Pages (/k.veritas/) + 정적 API 폴백
 * - SITE_BASE 설정
 * - /api/* 요청을 static-api/*.json 으로 폴백 (github.io 또는 ?static=1)
 * - /public-ui 등 루트 절대경로 보정은 HTML에서 상대경로 사용 권장
 */
(function () {
  var host = location.hostname || '';
  var path = location.pathname || '';
  var isGh = /\.github\.io$/i.test(host);

  // Project Pages: https://user.github.io/repo-name/...
  if (isGh) {
    var segs = path.split('/').filter(Boolean);
    window.SITE_BASE = segs.length ? '/' + segs[0] : '';
  } else {
    window.SITE_BASE = window.SITE_BASE || '';
  }

  var preferStatic =
    isGh ||
    /[?&]static=1(?:&|$)/.test(location.search || '') ||
    window.FORCE_STATIC_API === true;

  function withBase(url) {
    if (!url || typeof url !== 'string') return url;
    if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0) return url;
    if (url.charAt(0) !== '/') return url;
    if (!window.SITE_BASE) return url;
    if (url.indexOf(window.SITE_BASE + '/') === 0 || url === window.SITE_BASE) return url;
    return window.SITE_BASE + url;
  }

  function apiToStatic(url) {
    // /api/products → static-api/products.json
    // /api/products/p1 → static-api/products/p1.json
    // /api/content/index.html → static-api/content/index.html.json
    var u = url.split('?')[0];
    var m = u.match(/^\/api\/(.+)$/);
    if (!m) return null;
    var rest = m[1].replace(/\/$/, '');
    if (!rest) return null;
    // download 등은 정적 불가
    if (/\/download$/.test(rest)) return null;
    return withBase('/static-api/' + rest + '.json');
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url;
    if (typeof url !== 'string') return origFetch(input, init);

    // 절대 /api 만 처리
    var pathOnly = url;
    try {
      if (/^https?:\/\//i.test(url)) {
        var parsed = new URL(url, location.origin);
        if (parsed.origin === location.origin) pathOnly = parsed.pathname + parsed.search;
        else return origFetch(input, init);
      }
    } catch (e) { /* keep */ }

    var pathNoQuery = pathOnly.split('?')[0];

    if (pathNoQuery.indexOf('/api/') === 0) {
      var staticUrl = preferStatic ? apiToStatic(pathNoQuery) : null;
      var liveUrl = withBase(pathNoQuery) + (pathOnly.indexOf('?') >= 0 ? pathOnly.slice(pathOnly.indexOf('?')) : '');

      if (staticUrl) {
        return origFetch(staticUrl, init).then(function (res) {
          if (res && res.ok) return res;
          // 정적 실패 시 라이브 API 시도 (로컬 서버 등)
          return origFetch(liveUrl, init);
        }).catch(function () {
          return origFetch(liveUrl, init);
        });
      }
      return origFetch(liveUrl, init);
    }

    // 같은 오리진 절대 경로에 base 적용
    if (preferStatic && pathNoQuery.charAt(0) === '/' && pathNoQuery.indexOf(window.SITE_BASE) !== 0) {
      if (
        pathNoQuery.indexOf('/public-ui/') === 0 ||
        pathNoQuery.indexOf('/uploads/') === 0 ||
        pathNoQuery.indexOf('/static-api/') === 0
      ) {
        var fixed = withBase(pathNoQuery);
        if (typeof input === 'string') return origFetch(fixed, init);
      }
    }

    return origFetch(input, init);
  };

  window.withSiteBase = withBase;

  /**
   * 정적 호스팅: a[href*="/api/resources/"][href$="/download"] 클릭 시
   * static-api 메타의 file(공개 Storage URL)로 연결
   */
  if (preferStatic && typeof document !== 'undefined') {
    document.addEventListener(
      'click',
      function (e) {
        var a = e.target && e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        var href = a.getAttribute('href') || '';
        var path = href;
        try {
          if (/^https?:\/\//i.test(href)) {
            var u = new URL(href, location.href);
            if (u.origin !== location.origin) return;
            path = u.pathname;
          }
        } catch (err) {
          return;
        }
        // /k.veritas/api/... or /api/...
        var m = path.match(/\/api\/resources\/([^/]+)\/download\/?$/);
        if (!m) return;
        e.preventDefault();
        var id = decodeURIComponent(m[1]);
        var metaUrl = withBase('/static-api/resources/' + encodeURIComponent(id) + '.json');
        fetch(metaUrl, { cache: 'no-store' })
          .then(function (r) {
            if (!r.ok) throw new Error('not found');
            return r.json();
          })
          .then(function (data) {
            if (data && data.file && /^https?:\/\//i.test(data.file)) {
              // 비동기 window.open은 팝업 차단 대상이므로 현재 위치 이동을 사용한다.
              // Storage 객체의 Content-Disposition: attachment가 저장을 처리한다.
              window.location.assign(data.file);
              return;
            }
            throw new Error('no file');
          })
          .catch(function () {
            alert('다운로드할 파일을 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.');
          });
      },
      true
    );
  }
})();
