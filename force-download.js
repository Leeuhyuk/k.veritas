/**
 * 크로스 오리진 파일도 브라우저에서 "저장"되게 강제 다운로드
 * (다른 도메인 URL은 a[download] 속성이 무시되어 미리보기/실행됨)
 */
(function (global) {
  function safeName(name, url) {
    var n = String(name || '').trim() || 'download';
    n = n.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
    if (n.indexOf('.') === -1 && url) {
      try {
        var path = new URL(url, location.href).pathname;
        var m = path.match(/\.([a-z0-9]{1,8})$/i);
        if (m) n += '.' + m[1].toLowerCase();
      } catch (e) { /* ignore */ }
    }
    return n;
  }

  function triggerBlobDownload(blob, filename) {
    var objUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try {
        URL.revokeObjectURL(objUrl);
      } catch (e) { /* ignore */ }
      a.remove();
    }, 1500);
  }

  /**
   * @param {string} url
   * @param {string} [filename]
   * @returns {Promise<void>}
   */
  function forceDownload(url, filename) {
    if (!url) return Promise.reject(new Error('url required'));
    var name = safeName(filename, url);

    // 같은 출처 API 다운로드는 브라우저 기본 동작 유지 가능
    try {
      var u = new URL(url, location.href);
      if (u.origin === location.origin && /\/api\/.*\/download/.test(u.pathname)) {
        var a0 = document.createElement('a');
        a0.href = url;
        a0.download = name;
        a0.rel = 'noopener';
        document.body.appendChild(a0);
        a0.click();
        a0.remove();
        return Promise.resolve();
      }
    } catch (e0) { /* continue */ }

    return fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        // 타입만 있는 blob이면 파일명 확장자 유지
        triggerBlobDownload(blob, name);
      })
      .catch(function (err) {
        // CORS 실패 시: 새 탭 (최후 수단) — 가능하면 Content-Disposition attachment 권장
        console.warn('[forceDownload] blob 실패, 새 탭 폴백', err && err.message);
        window.open(url, '_blank', 'noopener,noreferrer');
      });
  }

  /** data-force-download 링크 위임 */
  function bindForceDownload(root) {
    var el = root || document;
    el.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[data-force-download]');
      if (!a) return;
      var href = a.getAttribute('href') || a.dataset.fileUrl || '';
      if (!href || href === '#') return;
      e.preventDefault();
      e.stopPropagation();
      var label = a.getAttribute('data-download-name') || a.getAttribute('download') || '';
      a.classList.add('is-downloading');
      forceDownload(href, label).finally(function () {
        a.classList.remove('is-downloading');
      });
    });
  }

  global.forceDownload = forceDownload;
  global.bindForceDownload = bindForceDownload;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindForceDownload(document);
    });
  } else {
    bindForceDownload(document);
  }
})(window);
