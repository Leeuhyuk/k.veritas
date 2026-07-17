/**
 * GitHub Pages용 관리자 API (Firestore + Storage 직접)
 */
import {
  loadFirebaseWebConfig,
  signInWithGoogle,
  signOutGoogle,
  waitForAuthUser,
  isEmailAdmin,
  ensureFirebaseApp,
  listCollection,
  getDocById,
  saveDoc,
  removeDoc,
  uploadPublicFile,
  uploadPublicJson,
  getClientAuth,
} from '../lib/firebaseClient.js';

function fdGet(fd, key) {
  const v = fd.get(key);
  return v == null ? '' : String(v);
}

function fdFiles(fd, key) {
  return fd.getAll(key).filter((f) => f && typeof f === 'object' && f.size > 0);
}

async function requireAdminUser() {
  const meta = await loadFirebaseWebConfig();
  ensureFirebaseApp(meta.config);
  const user = getClientAuth()?.currentUser || (await waitForAuthUser(3000));
  if (!user) {
    const err = new Error('로그인이 필요합니다.');
    err.status = 401;
    throw err;
  }
  const email = (user.email || '').toLowerCase();
  if (!isEmailAdmin(email, meta.adminEmails)) {
    const err = new Error('관리자 권한이 없습니다: ' + email);
    err.status = 403;
    throw err;
  }
  return { user, email, meta };
}

export const staticAdminApi = {
  async me() {
    const meta = await loadFirebaseWebConfig();
    if (!meta.config) return { admin: false };
    ensureFirebaseApp(meta.config);
    const user = getClientAuth()?.currentUser || (await waitForAuthUser(2500));
    if (!user) return { admin: false };
    const email = (user.email || '').toLowerCase();
    const admin = isEmailAdmin(email, meta.adminEmails);
    return {
      admin,
      email,
      name: user.displayName || '',
      method: admin ? 'google' : '',
    };
  },

  async firebaseConfig() {
    const meta = await loadFirebaseWebConfig();
    return {
      enabled: !!(meta.config && meta.config.apiKey && (meta.adminEmails || []).length),
      config: meta.config,
      adminEmails: meta.adminEmails || [],
    };
  },

  async login() {
    const err = new Error('GitHub Pages에서는 비밀번호 로그인 대신 Google 로그인을 사용하세요.');
    err.status = 400;
    throw err;
  },

  async loginGoogle(_idToken) {
    // 정적 모드: 팝업은 LoginForm에서 이미 처리하거나 여기서 처리
    // idToken이 오면 이미 로그인된 상태 — 권한만 검사
    const meta = await loadFirebaseWebConfig();
    ensureFirebaseApp(meta.config);
    let user = getClientAuth()?.currentUser;
    if (!user) {
      const signed = await signInWithGoogle();
      user = signed.user;
    }
    const email = (user.email || '').toLowerCase();
    if (!isEmailAdmin(email, meta.adminEmails)) {
      await signOutGoogle();
      const err = new Error(
        `이 구글 계정(${email})은 관리자로 등록되어 있지 않습니다. 허용: ${(meta.adminEmails || []).join(', ')}`
      );
      err.status = 401;
      err.data = { error: 'not_allowed', message: err.message };
      throw err;
    }
    return { ok: true, method: 'google', email, name: user.displayName || '' };
  },

  async logout() {
    await signOutGoogle();
    return { ok: true };
  },

  async changePassword() {
    const err = new Error('구글 로그인 계정은 Google 계정 설정에서 비밀번호를 변경하세요.');
    err.status = 400;
    throw err;
  },

  products: () => listCollection('products'),
  product: (id) => getDocById('products', id),

  async createProduct(fd) {
    await requireAdminUser();
    const id = 'p' + Date.now();
    const files = fdFiles(fd, 'images');
    const images = [];
    for (const f of files) images.push(await uploadPublicFile(f, `products/${id}`));
    const now = new Date().toISOString();
    const item = {
      id,
      title: fdGet(fd, 'title').trim(),
      category: fdGet(fd, 'category').trim(),
      industry: fdGet(fd, 'industry').trim(),
      material: fdGet(fd, 'material').trim(),
      process: fdGet(fd, 'process').trim(),
      summary: fdGet(fd, 'summary').trim(),
      body: fdGet(fd, 'body'),
      status: fdGet(fd, 'status') === 'draft' ? 'draft' : 'published',
      seoTitle: fdGet(fd, 'seoTitle').trim(),
      seoDescription: fdGet(fd, 'seoDescription').trim(),
      ogImage: fdGet(fd, 'ogImage').trim(),
      images,
      thumbs: images.slice(),
      order: 0,
      createdAt: now,
      updatedAt: now,
    };
    // 기존 order +1
    const all = await listCollection('products');
    for (const p of all) {
      p.order = (p.order != null ? p.order : 0) + 1;
      await saveDoc('products', p);
    }
    await saveDoc('products', item);
    return item;
  },

  // 관리자 제품(Firestore)을 공개 사이트가 읽는 파일(GCS)로 내보내기
  async publishProducts() {
    await requireAdminUser();
    const all = await listCollection('products');
    const pub = (all || [])
      .filter((p) => p && p.status !== 'draft' && p.status !== 'hidden')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    await uploadPublicJson('products-index.json', pub);
    return { count: pub.length };
  },

  // 공개 사이트의 정적 카탈로그(static-api/products.json)를 Firestore로 가져오기
  async importSampleProducts() {
    await requireAdminUser();
    let list = [];
    try {
      const res = await fetch('../static-api/products.json', { cache: 'no-store' });
      list = res.ok ? await res.json() : [];
    } catch {
      list = [];
    }
    if (!Array.isArray(list) || !list.length) return { added: 0, total: 0 };
    const existing = await listCollection('products');
    const existingIds = new Set(existing.map((p) => p.id));
    const base = existing.length;
    const now = new Date().toISOString();
    let added = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p || !p.id || existingIds.has(p.id)) continue;
      await saveDoc('products', {
        ...p,
        order: base + i,
        createdAt: p.createdAt || now,
        updatedAt: now,
      });
      added += 1;
    }
    return { added, total: list.length };
  },

  async updateProduct(id, fd) {
    await requireAdminUser();
    const p = await getDocById('products', id);
    if (!p) {
      const err = new Error('not_found');
      err.status = 404;
      throw err;
    }
    if (fd.has('title')) p.title = fdGet(fd, 'title').trim();
    if (fd.has('category')) p.category = fdGet(fd, 'category').trim();
    if (fd.has('industry')) p.industry = fdGet(fd, 'industry').trim();
    if (fd.has('material')) p.material = fdGet(fd, 'material').trim();
    if (fd.has('process')) p.process = fdGet(fd, 'process').trim();
    if (fd.has('summary')) p.summary = fdGet(fd, 'summary').trim();
    if (fd.has('body')) p.body = fdGet(fd, 'body');
    if (fd.has('status')) p.status = fdGet(fd, 'status') === 'draft' ? 'draft' : 'published';
    if (fd.has('seoTitle')) p.seoTitle = fdGet(fd, 'seoTitle').trim();
    if (fd.has('seoDescription')) p.seoDescription = fdGet(fd, 'seoDescription').trim();
    if (fd.has('ogImage')) p.ogImage = fdGet(fd, 'ogImage').trim();

    let kept = p.images || [];
    if (fd.has('keepImages')) {
      try {
        kept = JSON.parse(fdGet(fd, 'keepImages') || '[]');
      } catch {
        /* keep */
      }
    }
    const files = fdFiles(fd, 'images');
    const added = [];
    for (const f of files) added.push(await uploadPublicFile(f, `products/${id}`));
    p.images = kept.concat(added);
    // thumbs 유지/추가 (간단: 새 파일은 full URL 재사용)
    const oldThumbs = p.thumbs || [];
    p.thumbs = kept
      .map((u, i) => (oldThumbs[i] && (p.images || [])[i] === u ? oldThumbs[i] : u))
      .concat(added);
    p.updatedAt = new Date().toISOString();
    await saveDoc('products', p);
    return p;
  },

  async deleteProduct(id) {
    await requireAdminUser();
    await removeDoc('products', id);
    return { ok: true };
  },

  async orderProducts(ids) {
    await requireAdminUser();
    const list = await listCollection('products');
    const byId = new Map(list.map((p) => [p.id, p]));
    let i = 0;
    for (const id of ids) {
      const p = byId.get(id);
      if (p) {
        p.order = i++;
        await saveDoc('products', p);
        byId.delete(id);
      }
    }
    for (const p of byId.values()) {
      p.order = i++;
      await saveDoc('products', p);
    }
    return listCollection('products');
  },

  async categories() {
    const doc = await getDocById('settings', 'categories');
    return (doc && doc.items) || [];
  },
  async addCategory(name) {
    await requireAdminUser();
    const items = await this.categories();
    if (!items.includes(name)) items.push(name);
    await saveDoc('settings', { id: 'categories', items });
    return items;
  },
  async deleteCategory(name) {
    await requireAdminUser();
    const items = (await this.categories()).filter((c) => c !== name);
    await saveDoc('settings', { id: 'categories', items });
    return items;
  },

  newsList: () => listCollection('news'),
  newsOne: (id) => getDocById('news', id),

  async createNews(fd) {
    await requireAdminUser();
    const id = 'n' + Date.now();
    const files = fdFiles(fd, 'images');
    const images = [];
    for (const f of files) images.push(await uploadPublicFile(f, `news/${id}`));
    const now = new Date().toISOString();
    const item = {
      id,
      title: fdGet(fd, 'title').trim(),
      body: fdGet(fd, 'body'),
      status: fdGet(fd, 'status') === 'draft' ? 'draft' : 'published',
      isPopup: fdGet(fd, 'isPopup') === 'true' || fdGet(fd, 'isPopup') === 'on',
      seoTitle: fdGet(fd, 'seoTitle').trim(),
      seoDescription: fdGet(fd, 'seoDescription').trim(),
      ogImage: fdGet(fd, 'ogImage').trim(),
      images,
      thumbs: images.slice(),
      order: 0,
      createdAt: now,
      updatedAt: now,
    };
    await saveDoc('news', item);
    return item;
  },

  async updateNews(id, fd) {
    await requireAdminUser();
    const n = await getDocById('news', id);
    if (!n) throw Object.assign(new Error('not_found'), { status: 404 });
    if (fd.has('title')) n.title = fdGet(fd, 'title').trim();
    if (fd.has('body')) n.body = fdGet(fd, 'body');
    if (fd.has('status')) n.status = fdGet(fd, 'status') === 'draft' ? 'draft' : 'published';
    if (fd.has('isPopup')) n.isPopup = fdGet(fd, 'isPopup') === 'true' || fdGet(fd, 'isPopup') === 'on';
    if (fd.has('seoTitle')) n.seoTitle = fdGet(fd, 'seoTitle').trim();
    if (fd.has('seoDescription')) n.seoDescription = fdGet(fd, 'seoDescription').trim();
    if (fd.has('ogImage')) n.ogImage = fdGet(fd, 'ogImage').trim();
    let kept = n.images || [];
    if (fd.has('keepImages')) {
      try {
        kept = JSON.parse(fdGet(fd, 'keepImages') || '[]');
      } catch {
        /* */
      }
    }
    const files = fdFiles(fd, 'images');
    const added = [];
    for (const f of files) added.push(await uploadPublicFile(f, `news/${id}`));
    n.images = kept.concat(added);
    n.thumbs = n.images.slice();
    n.updatedAt = new Date().toISOString();
    await saveDoc('news', n);
    return n;
  },

  async deleteNews(id) {
    await requireAdminUser();
    await removeDoc('news', id);
    return { ok: true };
  },

  resources: () => listCollection('resources'),
  resource: (id) => getDocById('resources', id),

  async createResource(fd) {
    await requireAdminUser();
    const id = 'r' + Date.now();
    const file = fdFiles(fd, 'file')[0];
    if (!file) throw Object.assign(new Error('파일을 첨부해 주세요.'), { status: 400 });
    const url = await uploadPublicFile(file, `resources/${id}`);
    const now = new Date().toISOString();
    const item = {
      id,
      title: fdGet(fd, 'title').trim(),
      category: fdGet(fd, 'category').trim() || '기타',
      description: fdGet(fd, 'description').trim(),
      body: fdGet(fd, 'body'),
      seoTitle: fdGet(fd, 'seoTitle').trim(),
      seoDescription: fdGet(fd, 'seoDescription').trim(),
      ogImage: fdGet(fd, 'ogImage').trim(),
      file: url,
      originalName: file.name || 'file',
      size: file.size || 0,
      downloads: 0,
      status: fdGet(fd, 'status') === 'draft' ? 'draft' : 'published',
      isBrochure: fdGet(fd, 'isBrochure') === 'true' || fdGet(fd, 'isBrochure') === 'on',
      order: 0,
      createdAt: now,
      updatedAt: now,
    };
    await saveDoc('resources', item);
    return item;
  },

  async updateResource(id, fd) {
    await requireAdminUser();
    const r = await getDocById('resources', id);
    if (!r) throw Object.assign(new Error('not_found'), { status: 404 });
    if (fd.has('title')) r.title = fdGet(fd, 'title').trim();
    if (fd.has('category')) r.category = fdGet(fd, 'category').trim();
    if (fd.has('description')) r.description = fdGet(fd, 'description').trim();
    if (fd.has('body')) r.body = fdGet(fd, 'body');
    if (fd.has('status')) r.status = fdGet(fd, 'status') === 'draft' ? 'draft' : 'published';
    if (fd.has('isBrochure')) r.isBrochure = fdGet(fd, 'isBrochure') === 'true' || fdGet(fd, 'isBrochure') === 'on';
    if (fd.has('seoTitle')) r.seoTitle = fdGet(fd, 'seoTitle').trim();
    if (fd.has('seoDescription')) r.seoDescription = fdGet(fd, 'seoDescription').trim();
    if (fd.has('ogImage')) r.ogImage = fdGet(fd, 'ogImage').trim();
    const file = fdFiles(fd, 'file')[0];
    if (file) {
      r.file = await uploadPublicFile(file, `resources/${id}`);
      r.originalName = file.name || r.originalName;
      r.size = file.size || 0;
    }
    r.updatedAt = new Date().toISOString();
    await saveDoc('resources', r);
    return r;
  },

  async deleteResource(id) {
    await requireAdminUser();
    await removeDoc('resources', id);
    return { ok: true };
  },

  inquiries: () => listCollection('inquiries'),
  async inquiryRead(id) {
    await requireAdminUser();
    const it = await getDocById('inquiries', id);
    if (!it) throw Object.assign(new Error('not_found'), { status: 404 });
    it.read = !it.read;
    await saveDoc('inquiries', it);
    return it;
  },
  async updateInquiry(id, body) {
    await requireAdminUser();
    const it = await getDocById('inquiries', id);
    if (!it) throw Object.assign(new Error('not_found'), { status: 404 });
    if (body && body.status) it.status = body.status;
    if (body && body.memo !== undefined) it.memo = body.memo;
    await saveDoc('inquiries', it);
    return it;
  },
  async deleteInquiry(id) {
    await requireAdminUser();
    await removeDoc('inquiries', id);
    return { ok: true };
  },

  async uploadImage(file) {
    await requireAdminUser();
    const url = await uploadPublicFile(file, 'cms');
    return { url };
  },
};
