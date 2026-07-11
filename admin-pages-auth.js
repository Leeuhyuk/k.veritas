/**
 * 페이지 편집(admin-pages.html) 인증 + 콘텐츠 API
 * - 로컬: Express 세션 (/api/admin/*) + 선택적 Google
 * - GitHub Pages: Firebase Auth + Firestore pages + Storage
 */
(function (global) {
  var meta = null;
  var app = null;
  var auth = null;
  var db = null;
  var storage = null;
  var ready = null;

  function isStaticHost() {
    if (global.FORCE_STATIC_ADMIN === true) return true;
    var h = (location.hostname || '').toLowerCase();
    return /\.github\.io$/.test(h);
  }

  function siteBase() {
    if (typeof global.SITE_BASE === 'string' && global.SITE_BASE) return global.SITE_BASE;
    var path = location.pathname || '';
    if (path.indexOf('/k.veritas') === 0) return '/k.veritas';
    return '';
  }

  function withBase(url) {
    if (!url || typeof url !== 'string') return url;
    if (/^https?:\/\//i.test(url) || url.indexOf('//') === 0) return url;
    if (url.charAt(0) !== '/') return url;
    var b = siteBase();
    if (!b) return url;
    if (url.indexOf(b + '/') === 0 || url === b) return url;
    return b + url;
  }

  function adminEmailsLower(list) {
    return (list || []).map(function (e) {
      return String(e || '').toLowerCase();
    });
  }

  function isEmailAdmin(email, list) {
    var e = String(email || '').toLowerCase();
    return !!e && adminEmailsLower(list).indexOf(e) !== -1;
  }

  async function fetchJson(url, opts) {
    var res = await fetch(url, opts);
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* empty */
    }
    if (!res.ok) {
      var err = new Error((data && (data.message || data.error)) || '요청 실패 (' + res.status + ')');
      err.status = res.status;
      err.data = data;
      err.code = data && data.error;
      throw err;
    }
    return data;
  }

  async function loadMeta() {
    if (meta) return meta;

    // 1) 서버 설정 (로컬)
    if (!isStaticHost()) {
      try {
        var live = await fetchJson('/api/admin/firebase-config', { credentials: 'include' });
        if (live && live.config && live.config.apiKey) {
          meta = {
            enabled: !!live.enabled,
            config: live.config,
            adminEmails: live.adminEmails || [],
          };
          return meta;
        }
      } catch (e) {
        /* fall through */
      }
    }

    // 2) 정적 설정 (GH Pages / 폴백)
    var urls = [
      withBase('/static-api/firebase-web-config.json'),
      'static-api/firebase-web-config.json',
    ];
    for (var i = 0; i < urls.length; i++) {
      try {
        var res = await fetch(urls[i], { cache: 'no-store' });
        if (res.ok) {
          var s = await res.json();
          meta = {
            enabled: true,
            config: s.config,
            adminEmails: s.adminEmails || [],
          };
          return meta;
        }
      } catch (e2) {
        /* next */
      }
    }

    meta = { enabled: false, config: null, adminEmails: [] };
    return meta;
  }

  function ensureFirebase() {
    if (app) return app;
    if (!meta || !meta.config || !meta.config.apiKey) {
      throw new Error('Firebase 웹 설정이 없습니다.');
    }
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK가 로드되지 않았습니다.');
    }
    if (!firebase.apps || !firebase.apps.length) {
      app = firebase.initializeApp(meta.config);
    } else {
      app = firebase.app();
    }
    auth = firebase.auth();
    db = firebase.firestore();
    var bucket = meta.config.storageBucket || 'production-management-e70fd-media';
    storage = firebase.app().storage('gs://' + bucket);
    return app;
  }

  function waitForUser(timeoutMs) {
    timeoutMs = timeoutMs || 2500;
    return new Promise(function (resolve) {
      if (!auth) {
        resolve(null);
        return;
      }
      if (auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        unsub();
        resolve(auth.currentUser);
      }, timeoutMs);
      var unsub = auth.onAuthStateChanged(function (u) {
        if (done) return;
        done = true;
        clearTimeout(t);
        unsub();
        resolve(u);
      });
    });
  }

  async function me() {
    await loadMeta();

    // 정적: Firebase Auth 세션
    if (isStaticHost()) {
      if (!meta.config) return { admin: false };
      ensureFirebase();
      var user = auth.currentUser || (await waitForUser(2500));
      if (!user) return { admin: false };
      var email = (user.email || '').toLowerCase();
      var ok = isEmailAdmin(email, meta.adminEmails);
      return {
        admin: ok,
        email: email,
        name: user.displayName || '',
        method: ok ? 'google' : '',
      };
    }

    // 로컬: 서버 세션
    try {
      return await fetchJson('/api/admin/me', { credentials: 'include' });
    } catch (e) {
      return { admin: false };
    }
  }

  async function loginPassword(password) {
    if (isStaticHost()) {
      var err = new Error('GitHub Pages에서는 Google 로그인을 사용하세요.');
      err.code = 'use_google';
      throw err;
    }
    return fetchJson('/api/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    });
  }

  async function loginGoogle() {
    await loadMeta();
    if (!meta.config || !meta.config.apiKey) {
      var e0 = new Error('구글 로그인 설정이 없습니다. FIREBASE_WEB_* / static-api 설정을 확인하세요.');
      e0.code = 'not_configured';
      throw e0;
    }
    ensureFirebase();
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    var cred = await auth.signInWithPopup(provider);
    var user = cred.user;
    var email = ((user && user.email) || '').toLowerCase();
    var idToken = await user.getIdToken(true);

    if (isStaticHost()) {
      if (!isEmailAdmin(email, meta.adminEmails)) {
        try {
          await auth.signOut();
        } catch (x) {
          /* ignore */
        }
        var e1 = new Error(
          '이 구글 계정(' +
            email +
            ')은 관리자로 등록되어 있지 않습니다. 허용: ' +
            adminEmailsLower(meta.adminEmails).join(', ')
        );
        e1.code = 'not_allowed';
        throw e1;
      }
      return { ok: true, method: 'google', email: email, name: (user && user.displayName) || '' };
    }

    // 로컬: 서버에 토큰 전달 → 세션 쿠키
    try {
      var result = await fetchJson('/api/admin/login-google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken }),
      });
      try {
        await auth.signOut();
      } catch (x2) {
        /* ignore */
      }
      return result;
    } catch (err) {
      try {
        await auth.signOut();
      } catch (x3) {
        /* ignore */
      }
      throw err;
    }
  }

  async function logout() {
    if (isStaticHost()) {
      try {
        await loadMeta();
        if (meta.config) {
          ensureFirebase();
          await auth.signOut();
        }
      } catch (e) {
        /* ignore */
      }
      return { ok: true };
    }
    try {
      return await fetchJson('/api/admin/logout', { method: 'POST', credentials: 'include' });
    } catch (e2) {
      return { ok: true };
    }
  }

  async function getContent(page) {
    await loadMeta();
    if (isStaticHost()) {
      // 로그인 전·후 모두 공개 읽기 가능 — Firestore 우선
      try {
        ensureFirebase();
        var snap = await db.collection('pages').doc(page).get();
        if (snap.exists) return snap.data() || {};
      } catch (e) {
        /* fall through */
      }
      try {
        var urls = [
          withBase('/static-api/content/' + page + '.json'),
          'static-api/content/' + page + '.json',
        ];
        for (var i = 0; i < urls.length; i++) {
          var res = await fetch(urls[i], { cache: 'no-store' });
          if (res.ok) return await res.json();
        }
      } catch (e2) {
        /* empty */
      }
      return {};
    }
    return fetchJson('/api/content/' + encodeURIComponent(page), { credentials: 'include' }).catch(
      function () {
        return {};
      }
    );
  }

  async function saveContent(page, content) {
    await loadMeta();
    if (isStaticHost()) {
      ensureFirebase();
      var user = auth.currentUser || (await waitForUser(3000));
      if (!user) {
        var e = new Error('로그인이 필요합니다.');
        e.status = 401;
        throw e;
      }
      var email = (user.email || '').toLowerCase();
      if (!isEmailAdmin(email, meta.adminEmails)) {
        var e2 = new Error('관리자 권한이 없습니다.');
        e2.status = 403;
        throw e2;
      }
      await db.collection('pages').doc(page).set(content || {});
      return content || {};
    }
    return fetchJson('/api/content/' + encodeURIComponent(page), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content }),
    });
  }

  /**
   * 브라우저에서 업로드 전 리사이즈·압축 (GitHub Pages Storage 직업로드용)
   * 최대 가로 1200px, WebP(지원 시) 또는 JPEG q≈0.78
   */
  function compressImageFile(file, maxWidth, quality) {
    maxWidth = maxWidth || 1200;
    quality = quality || 0.78;
    if (!file || !/^image\//.test(file.type || '')) return Promise.resolve(file);
    // GIF 애니메이션 유지
    if ((file.type || '') === 'image/gif') return Promise.resolve(file);

    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(file);
          return;
        }
        var scale = Math.min(1, maxWidth / w);
        var tw = Math.max(1, Math.round(w * scale));
        var th = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, tw, th);

        function toBlob(type, q) {
          return new Promise(function (res) {
            if (canvas.toBlob) {
              canvas.toBlob(function (b) {
                res(b);
              }, type, q);
            } else {
              try {
                var data = canvas.toDataURL(type, q);
                var bin = atob(data.split(',')[1] || '');
                var arr = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                res(new Blob([arr], { type: type }));
              } catch (e) {
                res(null);
              }
            }
          });
        }

        toBlob('image/webp', quality)
          .then(function (webp) {
            if (webp && webp.size > 0 && webp.type === 'image/webp') return webp;
            return toBlob('image/jpeg', quality);
          })
          .then(function (blob) {
            if (!blob || !blob.size) {
              resolve(file);
              return;
            }
            // 압축이 더 커지면 원본 사용 (이미 작은 파일)
            if (blob.size >= file.size && scale >= 0.99) {
              resolve(file);
              return;
            }
            var ext = blob.type === 'image/webp' ? '.webp' : '.jpg';
            var base = String(file.name || 'image').replace(/\.[^.]+$/, '').replace(/[^\w.\-]+/g, '_').slice(0, 60);
            resolve(new File([blob], base + ext, { type: blob.type, lastModified: Date.now() }));
          })
          .catch(function () {
            resolve(file);
          });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  async function uploadImage(file) {
    if (!file) throw new Error('파일을 선택해 주세요.');
    await loadMeta();
    var optimized = await compressImageFile(file, 1200, 0.78);

    if (isStaticHost()) {
      ensureFirebase();
      var user = auth.currentUser || (await waitForUser(3000));
      if (!user) {
        var e = new Error('로그인이 필요합니다.');
        e.status = 401;
        throw e;
      }
      if (!isEmailAdmin((user.email || '').toLowerCase(), meta.adminEmails)) {
        var e2 = new Error('관리자 권한이 없습니다.');
        e2.status = 403;
        throw e2;
      }
      var safe = String(optimized.name || 'image')
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 80);
      var path = 'public/cms/' + Date.now() + '-' + Math.round(Math.random() * 1e9) + '-' + safe;
      var ref = storage.ref(path);
      var snap = await ref.put(optimized, {
        contentType: optimized.type || 'image/webp',
        cacheControl: 'public,max-age=31536000',
      });
      var url = await snap.ref.getDownloadURL();
      return { url: url };
    }
    var fd = new FormData();
    fd.append('image', optimized);
    return fetchJson('/api/upload', { method: 'POST', credentials: 'include', body: fd });
  }

  async function googleEnabled() {
    var m = await loadMeta();
    return !!(m.config && m.config.apiKey && (m.adminEmails || []).length);
  }

  global.AdminPagesAuth = {
    isStaticHost: isStaticHost,
    loadMeta: loadMeta,
    googleEnabled: googleEnabled,
    me: me,
    loginPassword: loginPassword,
    loginGoogle: loginGoogle,
    logout: logout,
    getContent: getContent,
    saveContent: saveContent,
    uploadImage: uploadImage,
  };
})(window);
