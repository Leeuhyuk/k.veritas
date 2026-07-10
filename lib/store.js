/**
 * 데이터 저장소 추상화
 * - 기본: 로컬 JSON (data/*.json)
 * - USE_FIREBASE=1 + 자격증명: Cloud Firestore
 */
const fs = require('fs');
const path = require('path');
const {
  isFirebaseReady,
  getDb,
  initFirebase,
  modeLabel,
  wantFirebase,
} = require('./firebase');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');

const FILES = {
  products: path.join(DATA_DIR, 'products.json'),
  news: path.join(DATA_DIR, 'news.json'),
  resources: path.join(DATA_DIR, 'resources.json'),
  inquiries: path.join(DATA_DIR, 'inquiries.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  content: path.join(DATA_DIR, 'content.json'),
};

function ensureJsonDefaults() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILES.products)) fs.writeFileSync(FILES.products, '[]', 'utf-8');
  if (!fs.existsSync(FILES.news)) fs.writeFileSync(FILES.news, '[]', 'utf-8');
  if (!fs.existsSync(FILES.resources)) fs.writeFileSync(FILES.resources, '[]', 'utf-8');
  if (!fs.existsSync(FILES.inquiries)) fs.writeFileSync(FILES.inquiries, '[]', 'utf-8');
  if (!fs.existsSync(FILES.categories)) {
    fs.writeFileSync(FILES.categories, JSON.stringify(['자동차', '반도체', '의료기기'], null, 2), 'utf-8');
  }
  if (!fs.existsSync(FILES.content)) fs.writeFileSync(FILES.content, '{}', 'utf-8');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function useFb() {
  return isFirebaseReady();
}

function stripUndefined(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === undefined) return;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) ? stripUndefined(v) : v;
  });
  return out;
}

function sortByOrder(list) {
  return list.slice().sort((a, b) => {
    const ao = a.order != null ? a.order : 0;
    const bo = b.order != null ? b.order : 0;
    if (ao !== bo) return ao - bo;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

/* ---------- collection helpers (Firestore) ---------- */
async function fbList(collection, { ordered = true } = {}) {
  const db = getDb();
  const snap = await db.collection(collection).get();
  const list = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    list.push({ id: doc.id, ...data });
  });
  return ordered ? sortByOrder(list) : list;
}

async function fbGet(collection, id) {
  const db = getDb();
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function fbSet(collection, item) {
  const db = getDb();
  const id = item.id;
  if (!id) throw new Error('id required');
  const { id: _id, ...rest } = item;
  await db.collection(collection).doc(id).set(stripUndefined(rest), { merge: true });
  return item;
}

async function fbDelete(collection, id) {
  const db = getDb();
  await db.collection(collection).doc(id).delete();
}

async function fbReplaceAll(collection, list) {
  const db = getDb();
  const col = db.collection(collection);
  const existing = await col.get();
  const batchSize = 400;
  const toDelete = [];
  existing.forEach((d) => toDelete.push(d.id));
  // delete in batches
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = db.batch();
    toDelete.slice(i, i + batchSize).forEach((id) => batch.delete(col.doc(id)));
    await batch.commit();
  }
  // write new
  for (let i = 0; i < list.length; i += batchSize) {
    const batch = db.batch();
    list.slice(i, i + batchSize).forEach((item, idx) => {
      const id = item.id || `auto_${i + idx}`;
      const { id: _id, ...rest } = item;
      const payload = stripUndefined({ ...rest, order: item.order != null ? item.order : i + idx });
      batch.set(col.doc(id), payload);
    });
    await batch.commit();
  }
  return list;
}

/* ---------- Products ---------- */
async function listProducts() {
  if (useFb()) return fbList('products');
  return readJson(FILES.products, []);
}

async function getProduct(id) {
  if (useFb()) return fbGet('products', id);
  return (readJson(FILES.products, [])).find((x) => x.id === id) || null;
}

async function saveProduct(item) {
  if (useFb()) return fbSet('products', item);
  const list = readJson(FILES.products, []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeJson(FILES.products, list);
  return item;
}

async function deleteProduct(id) {
  if (useFb()) return fbDelete('products', id);
  writeJson(
    FILES.products,
    readJson(FILES.products, []).filter((x) => x.id !== id)
  );
}

async function replaceProductsOrder(ids) {
  const list = await listProducts();
  const byId = new Map(list.map((p) => [p.id, p]));
  const reordered = [];
  ids.forEach((id, i) => {
    const p = byId.get(id);
    if (p) {
      p.order = i;
      reordered.push(p);
      byId.delete(id);
    }
  });
  byId.forEach((p) => {
    p.order = reordered.length;
    reordered.push(p);
  });
  if (useFb()) {
    await fbReplaceAll('products', reordered);
  } else {
    writeJson(FILES.products, reordered);
  }
  return reordered;
}

/* ---------- News ---------- */
async function listNews() {
  if (useFb()) return fbList('news');
  return readJson(FILES.news, []);
}
async function getNews(id) {
  if (useFb()) return fbGet('news', id);
  return (readJson(FILES.news, [])).find((x) => x.id === id) || null;
}
async function saveNews(item) {
  if (useFb()) return fbSet('news', item);
  const list = readJson(FILES.news, []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeJson(FILES.news, list);
  return item;
}
async function deleteNews(id) {
  if (useFb()) return fbDelete('news', id);
  writeJson(
    FILES.news,
    readJson(FILES.news, []).filter((x) => x.id !== id)
  );
}

/* ---------- Resources ---------- */
async function listResources() {
  if (useFb()) return fbList('resources');
  return readJson(FILES.resources, []);
}
async function getResource(id) {
  if (useFb()) return fbGet('resources', id);
  return (readJson(FILES.resources, [])).find((x) => x.id === id) || null;
}
async function saveResource(item) {
  if (useFb()) return fbSet('resources', item);
  const list = readJson(FILES.resources, []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeJson(FILES.resources, list);
  return item;
}
async function deleteResource(id) {
  if (useFb()) return fbDelete('resources', id);
  writeJson(
    FILES.resources,
    readJson(FILES.resources, []).filter((x) => x.id !== id)
  );
}

/* ---------- Inquiries ---------- */
async function listInquiries() {
  if (useFb()) {
    const list = await fbList('inquiries', { ordered: false });
    return list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }
  return readJson(FILES.inquiries, []);
}
async function getInquiry(id) {
  if (useFb()) return fbGet('inquiries', id);
  return (readJson(FILES.inquiries, [])).find((x) => x.id === id) || null;
}
async function saveInquiry(item) {
  if (useFb()) return fbSet('inquiries', item);
  const list = readJson(FILES.inquiries, []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.unshift(item);
  writeJson(FILES.inquiries, list);
  return item;
}
async function deleteInquiry(id) {
  if (useFb()) return fbDelete('inquiries', id);
  writeJson(
    FILES.inquiries,
    readJson(FILES.inquiries, []).filter((x) => x.id !== id)
  );
}

/* ---------- Categories ---------- */
async function listCategories() {
  if (useFb()) {
    const db = getDb();
    const doc = await db.collection('settings').doc('categories').get();
    if (!doc.exists) return [];
    const data = doc.data() || {};
    return Array.isArray(data.items) ? data.items : [];
  }
  return readJson(FILES.categories, []);
}
async function saveCategories(items) {
  if (useFb()) {
    const db = getDb();
    await db.collection('settings').doc('categories').set({ items }, { merge: true });
    return items;
  }
  writeJson(FILES.categories, items);
  return items;
}

/* ---------- CMS content ---------- */
async function getPageContent(page) {
  if (useFb()) {
    const db = getDb();
    const doc = await db.collection('pages').doc(page).get();
    return doc.exists ? doc.data() || {} : {};
  }
  const all = readJson(FILES.content, {});
  return all[page] || {};
}
async function savePageContent(page, content) {
  if (useFb()) {
    const db = getDb();
    await db.collection('pages').doc(page).set(content || {}, { merge: false });
    return content || {};
  }
  const all = readJson(FILES.content, {});
  all[page] = content || {};
  writeJson(FILES.content, all);
  return all[page];
}

function boot() {
  ensureJsonDefaults();
  if (wantFirebase()) {
    const r = initFirebase();
    if (r.ok) {
      console.log('[store] Firebase 모드 — Firestore/Storage 사용');
    } else {
      console.warn('[store] USE_FIREBASE=1 이지만 초기화 실패 → JSON 폴백:', r.reason);
    }
  } else {
    console.log('[store] JSON 파일 모드 (data/*.json)');
  }
}

module.exports = {
  boot,
  modeLabel,
  useFb,
  listProducts,
  getProduct,
  saveProduct,
  deleteProduct,
  replaceProductsOrder,
  listNews,
  getNews,
  saveNews,
  deleteNews,
  listResources,
  getResource,
  saveResource,
  deleteResource,
  listInquiries,
  getInquiry,
  saveInquiry,
  deleteInquiry,
  listCategories,
  saveCategories,
  getPageContent,
  savePageContent,
  FILES,
  ROOT,
  DATA_DIR,
};
