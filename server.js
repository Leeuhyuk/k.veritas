/* ============================================================
   k.veritas — 제품 쇼케이스 백엔드
   - 파일 기반 DB(data/products.json) 또는 Firebase
   - 이미지 업로드(uploads/ 또는 Storage)
   - 관리자 세션 로그인
   실행:  npm install  &&  npm start
   접속:  http://localhost:3000
   관리자: http://localhost:3000/admin/
   Firebase 프로젝트: production-management-e70fd
   ============================================================ */

try {
  require('dotenv').config();
} catch (e) {
  /* dotenv 미설치 시 무시 */
}

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sanitizeHtml } = require('./sanitize-html.js');
const store = require('./lib/store.js');
const media = require('./lib/media.js');
const firebaseLib = require('./lib/firebase.js');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'products.json');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const PRIVATE_UPLOAD_DIR = path.join(ROOT, 'private_uploads');
const INQUIRY_UPLOAD_DIR = path.join(PRIVATE_UPLOAD_DIR, 'inquiries');

/* 운영 플래그: HTTPS 뒤 프록시 / 쿠키 secure */
const IS_PROD = process.env.NODE_ENV === 'production';
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || IS_PROD;
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === '1' ||
  (IS_PROD && process.env.COOKIE_SECURE !== '0');
const SESSION_SECRET = process.env.SESSION_SECRET || 'kveritas-dev-secret-change-me';

if (TRUST_PROXY) {
  app.set('trust proxy', 1);
}

/* ----- 디렉터리/파일 준비 ----- */
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(INQUIRY_UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
store.boot();

const CAT_FILE = path.join(DATA_DIR, 'categories.json');
if (!fs.existsSync(CAT_FILE)) {
  fs.writeFileSync(CAT_FILE, JSON.stringify(['자동차', '반도체', '의료기기'], null, 2), 'utf-8');
}
/* categories → store.listCategories / saveCategories */

const NEWS_FILE = path.join(DATA_DIR, 'news.json');
if (!fs.existsSync(NEWS_FILE)) fs.writeFileSync(NEWS_FILE, '[]', 'utf-8');
/* news → store */

const INQ_FILE = path.join(DATA_DIR, 'inquiries.json');
if (!fs.existsSync(INQ_FILE)) fs.writeFileSync(INQ_FILE, '[]', 'utf-8');
/* inquiries → store */

const RES_FILE = path.join(DATA_DIR, 'resources.json');
if (!fs.existsSync(RES_FILE)) fs.writeFileSync(RES_FILE, '[]', 'utf-8');
/* resources → store */

/* 이미지 최적화 (sharp 설치 시에만 동작, 미설치면 원본 유지) */
let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.log('sharp 미설치 — 이미지 최적화는 건너뜁니다.'); }
/**
 * 업로드 즉시 WebP 압축
 * @param {Express.Multer.File[]} files
 * @param {{ maxWidth?: number, quality?: number }} [opts]
 */
async function optimizeImages(files, opts = {}) {
  if (!sharp || !files || !files.length) return;
  const maxWidth = opts.maxWidth || 1400;
  const quality = opts.quality || 78;
  for (const f of files) {
    try {
      const buf = await sharp(f.path)
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      const webpPath = f.path.replace(/\.[^.]+$/i, '') + '.webp';
      fs.writeFileSync(webpPath, buf);
      try {
        if (webpPath !== f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
      } catch (e2) { /* ignore */ }
      f.path = webpPath;
      f.filename = path.basename(webpPath);
      f.mimetype = 'image/webp';
      f.size = buf.length;
    } catch (e) { /* 실패 시 원본 유지 */ }
  }
}

/* ----- 관리자 비밀번호 (파일에 해시 저장, 화면에서 변경 가능) ----- */
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
function readAdminHash() {
  try { return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8')).hash || null; } catch (e) { return null; }
}
function writeAdminHash(hash) { fs.writeFileSync(ADMIN_FILE, JSON.stringify({ hash: hash }, null, 2), 'utf-8'); }
if (!readAdminHash()) {
  // 최초 1회: 환경변수 또는 기본값(admin1234)으로 초기화
  writeAdminHash(bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin1234', 10));
}

/* ----- 미들웨어 ----- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (!process.env.SESSION_SECRET) {
  console.warn(
    '[보안] SESSION_SECRET 미설정 — 개발용 기본값을 사용 중입니다. 운영 전 반드시 환경변수로 설정하세요.'
  );
}
if (IS_PROD && SESSION_SECRET === 'kveritas-dev-secret-change-me') {
  console.warn('[보안] 운영 환경에서 기본 SESSION_SECRET 사용 중 — 즉시 교체하세요.');
}
app.use(
  session({
    name: 'kveritas.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8, // 8시간
    },
  })
);

/* ----- 데이터 헬퍼 ----- */
/* products → store.listProducts / saveProduct / deleteProduct / replaceProductsOrder */

function isAdminReq(req) {
  return !!(req.session && req.session.admin);
}
function statusOf(v) {
  return v === 'draft' ? 'draft' : 'published';
}
function isPublished(item) {
  return statusOf(item && item.status) === 'published';
}
function publicList(list) {
  return list.filter(isPublished);
}
function visibleList(req, list) {
  return isAdminReq(req) ? list : publicList(list);
}
function cleanBool(v) {
  return v === true || v === 'true' || v === 'on' || v === '1';
}
function decodeOriginalName(name) {
  try { return Buffer.from(name || '', 'latin1').toString('utf8'); } catch (e) { return name || ''; }
}
function safeJoin(base, filename) {
  const target = path.resolve(base, filename || '');
  const root = path.resolve(base);
  return target.startsWith(root + path.sep) || target === root ? target : null;
}
/** /uploads/파일명 만 허용 (경로 조작 차단) */
function resolveUploadUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;
  const normalized = urlPath.replace(/\\/g, '/').split('?')[0].split('#')[0];
  const m = normalized.match(/^\/uploads\/([^/]+)$/);
  if (!m) return null;
  const name = m[1];
  if (!name || name === '.' || name === '..' || name.includes('..') || name.includes('\0')) return null;
  return safeJoin(UPLOAD_DIR, name);
}
async function unlinkUploadUrl(urlPath) {
  await media.deleteMediaUrl(urlPath);
}
function filterKeptUploadUrls(list) {
  return media.filterKeptMediaUrls(list);
}
function removeUploadedFiles(files) {
  (files || []).forEach((f) => {
    if (f && f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
  });
}
function stripHtml(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function searchHit(text, q) {
  return String(text || '').toLowerCase().includes(q);
}
function safeBodyHtml(value) {
  return sanitizeHtml(value || '');
}

/* 로그인 무차별 대입 완화 (IP 기준, 메모리) */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const loginAttempts = new Map();

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').toString();
}
function getLoginRecord(ip) {
  const now = Date.now();
  let rec = loginAttempts.get(ip);
  if (!rec || now - rec.windowStart > LOGIN_WINDOW_MS) {
    rec = { count: 0, windowStart: now, lockedUntil: 0 };
    loginAttempts.set(ip, rec);
  }
  return rec;
}
function assertLoginAllowed(req, res) {
  const ip = clientIp(req);
  const rec = getLoginRecord(ip);
  const now = Date.now();
  if (rec.lockedUntil && rec.lockedUntil > now) {
    const sec = Math.ceil((rec.lockedUntil - now) / 1000);
    res.status(429).json({
      error: 'too_many_attempts',
      message: `로그인 시도가 너무 많습니다. ${sec}초 후 다시 시도해 주세요.`,
    });
    return false;
  }
  return true;
}
function recordLoginFailure(req) {
  const ip = clientIp(req);
  const rec = getLoginRecord(ip);
  rec.count += 1;
  if (rec.count >= LOGIN_MAX_FAILS) {
    rec.lockedUntil = Date.now() + LOGIN_LOCK_MS;
    rec.count = 0;
    rec.windowStart = Date.now();
  }
  loginAttempts.set(ip, rec);
}
function clearLoginFailures(req) {
  loginAttempts.delete(clientIp(req));
}

/* 자료실 허용 확장자 */
const DOC_ALLOWED_EXT = new Set([
  '.pdf', '.dwg', '.dxf', '.step', '.stp', '.igs', '.iges',
  '.zip', '.rar', '.7z',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.xls', '.xlsx', '.csv',
  '.doc', '.docx', '.ppt', '.pptx', '.txt',
  '.hwp', '.hwpx',
]);

/* ----- 이미지 업로드 ----- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  },
});
/* 자료실 첨부(화이트리스트 확장자, 최대 50MB) */
const docUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (DOC_ALLOWED_EXT.has(ext)) return cb(null, true);
    cb(new Error('허용되지 않는 파일 형식입니다. (문서·도면·이미지·압축 파일만 가능)'));
  },
});
const inquiryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, INQUIRY_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const inquiryUpload = multer({
  storage: inquiryStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = new Set([
      '.pdf', '.dwg', '.dxf', '.step', '.stp', '.igs', '.iges',
      '.zip', '.rar', '.7z', '.jpg', '.jpeg', '.png', '.webp',
      '.xls', '.xlsx', '.doc', '.docx', '.ppt', '.pptx', '.txt',
    ]);
    if (allowed.has(ext)) return cb(null, true);
    cb(new Error('도면, 문서, 이미지, 압축 파일만 첨부할 수 있습니다.'));
  },
});

/* ----- 인증 가드 ----- */
function requireAuth(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

/* ============================================================
   API
   ============================================================ */

function establishAdminSession(req, res, payload) {
  return new Promise((resolve) => {
    req.session.regenerate((regenErr) => {
      if (regenErr) console.error('[auth] session regenerate', regenErr);
      req.session.admin = true;
      req.session.adminEmail = payload.email || '';
      req.session.adminName = payload.name || '';
      req.session.adminUid = payload.uid || '';
      req.session.adminMethod = payload.method || 'password';
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[auth] session save', saveErr);
          res.status(500).json({ error: 'session_error', message: '세션 저장에 실패했습니다.' });
          return resolve(false);
        }
        res.json(payload.response || { ok: true, method: payload.method });
        resolve(true);
      });
    });
  });
}

/* 관리자 로그인/로그아웃/상태 */
app.post('/api/admin/login', async (req, res) => {
  if (!assertLoginAllowed(req, res)) return;
  const { password } = req.body || {};
  const hash = readAdminHash();
  if (password && hash && bcrypt.compareSync(password, hash)) {
    clearLoginFailures(req);
    await establishAdminSession(req, res, {
      method: 'password',
      email: 'password',
      response: { ok: true, method: 'password' },
    });
    return;
  }
  recordLoginFailure(req);
  return res.status(401).json({ error: 'invalid_password', message: '비밀번호가 올바르지 않습니다.' });
});

/* 구글 로그인 (Firebase ID 토큰 → 세션) */
app.post('/api/admin/login-google', async (req, res) => {
  if (!assertLoginAllowed(req, res)) return;
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'token_required', message: '구글 로그인 토큰이 없습니다.' });
  }
  console.log('[auth/google] login attempt tokenLen=', String(idToken).length);
  if (!firebaseLib.isFirebaseReady()) {
    firebaseLib.initFirebase();
  }
  const result = await firebaseLib.verifyAdminGoogleToken(idToken);
  if (!result.ok) {
    console.warn('[auth/google] denied', result.code, result.message);
    recordLoginFailure(req);
    return res.status(401).json({ error: result.code, message: result.message, email: result.email || '' });
  }
  clearLoginFailures(req);
  console.log('[auth/google] success', result.email);
  await establishAdminSession(req, res, {
    method: 'google',
    email: result.email,
    name: result.name || '',
    uid: result.uid,
    response: {
      ok: true,
      method: 'google',
      email: result.email,
      name: result.name || '',
    },
  });
});

/* 클라이언트용 Firebase 웹 설정 (공개 가능 키만) */
app.get('/api/admin/firebase-config', async (req, res) => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY || '';
  const authDomain =
    process.env.FIREBASE_AUTH_DOMAIN ||
    `${process.env.FIREBASE_PROJECT_ID || 'production-management-e70fd'}.firebaseapp.com`;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'production-management-e70fd';
  const adminEmails = firebaseLib.getAdminGoogleEmails();
  const googleEnabled = adminEmails.length > 0 && !!apiKey;
  res.json({
    enabled: googleEnabled,
    adminEmails,
    config: apiKey
      ? {
          apiKey,
          authDomain,
          projectId,
          storageBucket:
            process.env.FIREBASE_STORAGE_BUCKET || 'production-management-e70fd-media',
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
          appId: process.env.FIREBASE_WEB_APP_ID || '',
        }
      : null,
  });
});

/* 비밀번호 변경 (현재 비밀번호 확인 후) */
app.post('/api/admin/password', requireAuth, async (req, res) => {
  if (req.session.adminMethod === 'google') {
    return res.status(400).json({
      error: 'google_account',
      message: '구글 로그인 계정은 여기서 비밀번호를 바꿀 수 없습니다. Google 계정 설정을 이용하세요.',
    });
  }
  const { current, next } = req.body || {};
  const hash = readAdminHash();
  if (!current || !hash || !bcrypt.compareSync(current, hash)) {
    return res.status(400).json({ error: 'wrong_current', message: '현재 비밀번호가 올바르지 않습니다.' });
  }
  if (!next || String(next).length < 8) {
    return res.status(400).json({ error: 'too_short', message: '새 비밀번호는 8자 이상이어야 합니다.' });
  }
  writeAdminHash(bcrypt.hashSync(String(next), 10));
  res.json({ ok: true });
});
app.post('/api/admin/logout', async (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});
app.get('/api/admin/me', async (req, res) => {
  res.json({
    admin: !!(req.session && req.session.admin),
    email: (req.session && req.session.adminEmail) || '',
    name: (req.session && req.session.adminName) || '',
    method: (req.session && req.session.adminMethod) || '',
  });
});

/* 관리자 전용 전체 목록/단건 */
app.get('/api/admin/products', requireAuth, async (req, res) => res.json(await store.listProducts()));
app.get('/api/admin/products/:id', requireAuth, async (req, res) => {
  const p = await store.getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json(p);
});
app.get('/api/admin/news', requireAuth, async (req, res) => res.json(await store.listNews()));
app.get('/api/admin/news/:id', requireAuth, async (req, res) => {
  const n = await store.getNews(req.params.id);
  if (!n) return res.status(404).json({ error: 'not_found' });
  res.json(n);
});
app.get('/api/admin/resources', requireAuth, async (req, res) => res.json(await store.listResources()));
app.get('/api/admin/resources/:id', requireAuth, async (req, res) => {
  const r = await store.getResource(req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json(r);
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const results = [];
  const add = (type, title, summary, url, haystack) => {
    if (!searchHit(haystack, q)) return;
    results.push({
      type,
      title: String(title || '').trim(),
      summary: stripHtml(summary).slice(0, 140),
      url,
    });
  };

  publicList(await store.listProducts()).forEach((p) => {
    const haystack = [p.title, p.summary, p.category, p.industry, p.material, p.process, stripHtml(p.body)].join(' ');
    add('제품', p.title, p.summary || haystack, `/showcase-detail.html?id=${encodeURIComponent(p.id)}`, haystack);
  });
  publicList(await store.listNews()).forEach((n) => {
    const haystack = [n.title, stripHtml(n.body)].join(' ');
    add('공지', n.title, stripHtml(n.body), `/news-detail.html?id=${encodeURIComponent(n.id)}`, haystack);
  });
  publicList(await store.listResources()).forEach((r) => {
    const body = stripHtml(r.body);
    const haystack = [r.title, r.category, r.description, r.originalName, body].join(' ');
    add('자료', r.title, r.description || body || r.originalName, `/resource-detail.html?id=${encodeURIComponent(r.id)}`, haystack);
  });
  [
    ['회사소개', '정밀 제조 역량과 회사 정보를 확인하세요.', '/about.html', '회사소개 연혁 인증 특허 생산설비 오시는 길'],
    ['사업영역', '정밀 가공, 금형 제작, 조립·검사 서비스를 소개합니다.', '/index.html#business', '사업영역 정밀 가공 금형 제작 조립 검사'],
    ['제품소개', '생산 제품과 주요 제품군을 확인하세요.', '/products.html', '제품소개 실제 생산 제품 정밀 가공 부품 금형 조립 모듈'],
    ['고객지원', '공지사항, 자료실, 문의 채널과 견적 문의를 제공합니다.', '/support.html', '고객지원 공지사항 자료실 문의 견적'],
  ].forEach(([title, summary, url, haystack]) => add('페이지', title, summary, url, `${title} ${summary} ${haystack}`));

  res.json(results.slice(0, 20));
});

/* 제품 목록/단건 (공개: 게시 상태만) */
app.get('/api/products', async (req, res) => res.json(publicList(await store.listProducts())));
app.get('/api/products/:id', async (req, res) => {
  const p = await store.getProduct(req.params.id);
  if (!p || !isPublished(p)) return res.status(404).json({ error: 'not_found' });
  res.json(p);
});

/* 제품 등록 (관리자) */
const MAX_PRODUCTS = 100;

app.post('/api/products', requireAuth, upload.array('images', 8), async (req, res) => {
  const current = await store.listProducts();
  const { title, category, summary, body, status, industry, material, process, seoTitle, seoDescription, ogImage } = req.body;
  if (statusOf(status) === 'published' && publicList(current).length >= MAX_PRODUCTS) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'limit_reached', message: `게시 제품은 최대 ${MAX_PRODUCTS}개까지 등록할 수 있습니다. 비공개 제품은 한도에 포함되지 않습니다.` });
  }
  if (!title || !title.trim()) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'title_required', message: '제품명을 입력해 주세요.' });
  }
  await optimizeImages(req.files);
  const images = await media.publishFiles(req.files, 'uploads');
  const now = new Date().toISOString();
  const product = {
    id: 'p' + Date.now(),
    title: title.trim(),
    category: (category || '').trim(),
    industry: (industry || '').trim(),
    material: (material || '').trim(),
    process: (process || '').trim(),
    summary: (summary || '').trim(),
    body: safeBodyHtml(body),
    status: statusOf(status),
    seoTitle: (seoTitle || '').trim(),
    seoDescription: (seoDescription || '').trim(),
    ogImage: (ogImage || '').trim(),
    images,
    createdAt: now,
    updatedAt: now,
  };
  await store.saveProduct(product);
  res.json(product);
});

/* 제품 순서 변경 (관리자) — 반드시 /:id 보다 먼저 정의 */
app.put('/api/products/order', requireAuth, async (req, res) => {
  const ids = req.body && req.body.ids;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids_required', message: '순서 배열(ids)이 필요합니다.' });
  const list = await store.listProducts();
  const byId = new Map(list.map((p) => [p.id, p]));
  const reordered = ids.map((id) => byId.get(id)).filter(Boolean);
  // 목록에서 누락된 항목은 뒤에 그대로 보존
  list.forEach((p) => { if (!ids.includes(p.id)) reordered.push(p); });
  await store.replaceProductsOrder(ids);
  res.json(reordered);
});

/* 제품 수정 (관리자) */
app.put('/api/products/:id', requireAuth, upload.array('images', 8), async (req, res) => {
  const list = await store.listProducts();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) {
    removeUploadedFiles(req.files);
    return res.status(404).json({ error: 'not_found' });
  }
  const p = list[idx];
  const { title, category, summary, body, keepImages, status, industry, material, process, seoTitle, seoDescription, ogImage } = req.body;
  const nextStatus = status !== undefined ? statusOf(status) : statusOf(p.status);
  if (!isPublished(p) && nextStatus === 'published' && publicList(list).length >= MAX_PRODUCTS) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'limit_reached', message: `게시 제품은 최대 ${MAX_PRODUCTS}개까지 등록할 수 있습니다. 비공개 제품은 한도에 포함되지 않습니다.` });
  }
  if (title !== undefined) p.title = title.trim();
  if (category !== undefined) p.category = category.trim();
  if (industry !== undefined) p.industry = industry.trim();
  if (material !== undefined) p.material = material.trim();
  if (process !== undefined) p.process = process.trim();
  if (summary !== undefined) p.summary = summary.trim();
  if (body !== undefined) p.body = safeBodyHtml(body);
  if (status !== undefined) p.status = statusOf(status);
  if (seoTitle !== undefined) p.seoTitle = seoTitle.trim();
  if (seoDescription !== undefined) p.seoDescription = seoDescription.trim();
  if (ogImage !== undefined) p.ogImage = ogImage.trim();

  // 유지할 기존 이미지 + 새로 올린 이미지 (/uploads/ 경로만 허용)
  let kept = p.images || [];
  if (keepImages !== undefined) {
    try { kept = JSON.parse(keepImages); } catch (e) { /* 무시 */ }
  }
  kept = filterKeptUploadUrls(kept);
  const removed = (p.images || []).filter((u) => !kept.includes(u));
  await media.deleteMediaUrls(removed);
  await optimizeImages(req.files);
  const added = await media.publishFiles(req.files, 'products');
  p.images = kept.concat(added);
  p.updatedAt = new Date().toISOString();

  await store.saveProduct(p);
  res.json(p);
});

/* 제품 삭제 (관리자) */
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  let list = await store.listProducts();
  const p = list.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  await media.deleteMediaUrls(p.images || []);
  await store.deleteProduct(req.params.id);
  res.json({ ok: true });
});

/* 카테고리 목록 (공개) / 추가·삭제 (관리자) */
app.get('/api/categories', async (req, res) => res.json(await store.listCategories()));
app.post('/api/categories', requireAuth, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name_required', message: '카테고리명을 입력해 주세요.' });
  const list = await store.listCategories();
  if (list.includes(name)) return res.status(400).json({ error: 'duplicate', message: '이미 있는 카테고리입니다.' });
  list.push(name);
  await store.saveCategories(list);
  res.json(list);
});
app.delete('/api/categories/:name', requireAuth, async (req, res) => {
  const list = (await store.listCategories()).filter((c) => c !== req.params.name);
  await store.saveCategories(list);
  res.json(list);
});

/* ============================================================
   공지/뉴스 (CMS)
   ============================================================ */
app.get('/api/news', async (req, res) => res.json(publicList(await store.listNews())));
app.get('/api/news/:id', async (req, res) => {
  const n = await store.getNews(req.params.id);
  if (!n || !isPublished(n)) return res.status(404).json({ error: 'not_found' });
  res.json(n);
});
app.post('/api/news', requireAuth, upload.array('images', 8), async (req, res) => {
  const { title, body, status, isPopup, seoTitle, seoDescription, ogImage } = req.body;
  if (!title || !title.trim()) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'title_required', message: '제목을 입력해 주세요.' });
  }
  await optimizeImages(req.files);
  const images = await media.publishFiles(req.files, 'uploads');
  const now = new Date().toISOString();
  const item = {
    id: 'n' + Date.now(),
    title: title.trim(),
    body: safeBodyHtml(body),
    status: statusOf(status),
    isPopup: cleanBool(isPopup),
    seoTitle: (seoTitle || '').trim(),
    seoDescription: (seoDescription || '').trim(),
    ogImage: (ogImage || '').trim(),
    images,
    createdAt: now,
    updatedAt: now,
  };
  await store.saveNews(item);
  res.json(item);
});
app.put('/api/news/:id', requireAuth, upload.array('images', 8), async (req, res) => {
  const list = await store.listNews();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) {
    removeUploadedFiles(req.files);
    return res.status(404).json({ error: 'not_found' });
  }
  const n = list[idx];
  const { title, body, keepImages, status, isPopup, seoTitle, seoDescription, ogImage } = req.body;
  if (title !== undefined) n.title = title.trim();
  if (body !== undefined) n.body = safeBodyHtml(body);
  if (status !== undefined) n.status = statusOf(status);
  if (isPopup !== undefined) n.isPopup = cleanBool(isPopup);
  if (seoTitle !== undefined) n.seoTitle = seoTitle.trim();
  if (seoDescription !== undefined) n.seoDescription = seoDescription.trim();
  if (ogImage !== undefined) n.ogImage = ogImage.trim();
  let kept = n.images || [];
  if (keepImages !== undefined) { try { kept = JSON.parse(keepImages); } catch (e) {} }
  kept = filterKeptUploadUrls(kept);
  (n.images || []).filter((u) => !kept.includes(u)).forEach((u) => unlinkUploadUrl(u));
  await optimizeImages(req.files);
  n.images = kept.concat(await media.publishFiles(req.files, 'news'));
  n.updatedAt = new Date().toISOString();
  await store.saveNews(n);
  res.json(n);
});
app.delete('/api/news/:id', requireAuth, async (req, res) => {
  let list = await store.listNews();
  const n = list.find((x) => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'not_found' });
  (n.images || []).forEach((u) => unlinkUploadUrl(u));
  await store.deleteNews(req.params.id);
  res.json({ ok: true });
});

/* ============================================================
   문의 접수 (공개 등록 / 관리자 조회·삭제)
   ============================================================ */
app.post('/api/inquiries', inquiryUpload.array('files', 5), async (req, res) => {
  const { name, company, email, phone, type, message, agree, website, productId, productTitle } = req.body;
  if (website) {
    removeUploadedFiles(req.files);
    return res.json({ ok: true }); // 허니팟(스팸 봇) — 조용히 무시
  }
  if (!name || !name.trim()) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'name_required', message: '담당자명을 입력해 주세요.' });
  }
  if (!email || !email.trim()) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'email_required', message: '이메일을 입력해 주세요.' });
  }
  if (!message || !message.trim()) {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'message_required', message: '문의 내용을 입력해 주세요.' });
  }
  if (agree !== true && agree !== 'true') {
    removeUploadedFiles(req.files);
    return res.status(400).json({ error: 'agree_required', message: '개인정보 수집·이용에 동의해 주세요.' });
  }
  const item = {
    id: 'q' + Date.now(),
    name: String(name).trim(), company: String(company || '').trim(),
    email: String(email).trim(), phone: String(phone || '').trim(),
    type: String(type || '').trim(), message: String(message).trim(),
    productId: String(productId || '').trim(),
    productTitle: String(productTitle || '').trim(),
    attachments: (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: decodeOriginalName(f.originalname),
      size: f.size,
      mimetype: f.mimetype,
    })),
    status: 'new',
    memo: '',
    read: false,
    createdAt: new Date().toISOString(),
  };
  await store.saveInquiry(item);
  res.json({ ok: true });
});
app.get('/api/inquiries', requireAuth, async (req, res) => res.json(await store.listInquiries()));
app.put('/api/inquiries/:id/read', requireAuth, async (req, res) => {
  const list = await store.listInquiries();
  const it = list.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not_found' });
  it.read = !it.read;
  await store.saveInquiry(it);
  res.json(it);
});
app.put('/api/inquiries/:id', requireAuth, async (req, res) => {
  const list = await store.listInquiries();
  const it = list.find((x) => x.id === req.params.id);
  if (!it) return res.status(404).json({ error: 'not_found' });
  const allowed = new Set(['new', 'reviewing', 'replied', 'hold']);
  if (req.body.status !== undefined && allowed.has(req.body.status)) {
    it.status = req.body.status;
    it.read = it.status !== 'new';
  }
  if (req.body.memo !== undefined) it.memo = String(req.body.memo || '').trim();
  await store.saveInquiry(it);
  res.json(it);
});
app.get('/api/inquiries/:id/attachments/:idx', requireAuth, async (req, res) => {
  const it = await store.getInquiry(req.params.id);
  if (!it) return res.status(404).send('not found');
  const idx = Number(req.params.idx);
  const a = (it.attachments || [])[idx];
  if (!a) return res.status(404).send('not found');
  const f = safeJoin(INQUIRY_UPLOAD_DIR, a.filename);
  if (!f || !fs.existsSync(f)) return res.status(404).send('file missing');
  res.download(f, a.originalName || a.filename);
});
app.delete('/api/inquiries/:id', requireAuth, async (req, res) => {
  const list = await store.listInquiries();
  const it = list.find((x) => x.id === req.params.id);
  if (it) {
    (it.attachments || []).forEach((a) => {
      const f = safeJoin(INQUIRY_UPLOAD_DIR, a.filename);
      if (f && fs.existsSync(f)) fs.unlinkSync(f);
    });
  }
  await store.deleteInquiry(req.params.id);
  res.json({ ok: true });
});

/* ============================================================
   페이지 콘텐츠 (블록 단위 편집)
   ============================================================ */
/* content → store.getPageContent / savePageContent */

app.get('/api/content/:page', async (req, res) => {
  res.json(await store.getPageContent(req.params.page));
});
app.put('/api/content/:page', requireAuth, async (req, res) => {
  const content = (req.body && req.body.content) || {};
  res.json(await store.savePageContent(req.params.page, content));
});

/* 단일 이미지 업로드 (이미지 블록 / 본문 이미지 삽입용) */
app.post('/api/upload', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file', message: '이미지를 선택해 주세요.' });
  // CMS/카드용: 가로 1200px WebP (제품 상세 1400보다 가볍게)
  await optimizeImages([req.file], { maxWidth: 1200, quality: 78 });
  res.json({ url: await media.publishSingle(req.file, 'cms') });
});

/* ============================================================
   자료실 (다운로드 자료 게시판)
   ============================================================ */
app.get('/api/resources', async (req, res) => res.json(publicList(await store.listResources())));
app.get('/api/resources/:id', async (req, res) => {
  const r = await store.getResource(req.params.id);
  if (!r || !isPublished(r)) return res.status(404).json({ error: 'not_found' });
  res.json(r);
});
app.post('/api/resources', requireAuth, docUpload.single('file'), async (req, res) => {
  const { title, category, description, body, status, isBrochure, seoTitle, seoDescription, ogImage } = req.body;
  if (!title || !title.trim()) {
    removeUploadedFiles(req.file ? [req.file] : []);
    return res.status(400).json({ error: 'title_required', message: '제목을 입력해 주세요.' });
  }
  if (!req.file) return res.status(400).json({ error: 'file_required', message: '파일을 첨부해 주세요.' });
  const now = new Date().toISOString();
  const item = {
    id: 'r' + Date.now(),
    title: title.trim(),
    category: (category || '기타').trim(),
    description: (description || '').trim(),
    body: safeBodyHtml(body),
    seoTitle: (seoTitle || '').trim(),
    seoDescription: (seoDescription || '').trim(),
    ogImage: (ogImage || '').trim(),
    file: await media.publishSingle(req.file, 'resources'),
    originalName: decodeOriginalName(req.file.originalname),
    size: req.file.size,
    downloads: 0,
    status: statusOf(status),
    isBrochure: cleanBool(isBrochure),
    createdAt: now,
    updatedAt: now,
  };
  await store.saveResource(item);
  res.json(item);
});
app.put('/api/resources/:id', requireAuth, docUpload.single('file'), async (req, res) => {
  const list = await store.listResources();
  const idx = list.findIndex((x) => x.id === req.params.id);
  if (idx < 0) {
    removeUploadedFiles(req.file ? [req.file] : []);
    return res.status(404).json({ error: 'not_found' });
  }
  const r = list[idx];
  const { title, category, description, body, status, isBrochure, seoTitle, seoDescription, ogImage } = req.body;
  if (title !== undefined) r.title = title.trim();
  if (category !== undefined) r.category = category.trim();
  if (description !== undefined) r.description = description.trim();
  if (body !== undefined) r.body = safeBodyHtml(body);
  if (status !== undefined) r.status = statusOf(status);
  if (isBrochure !== undefined) r.isBrochure = cleanBool(isBrochure);
  if (seoTitle !== undefined) r.seoTitle = seoTitle.trim();
  if (seoDescription !== undefined) r.seoDescription = seoDescription.trim();
  if (ogImage !== undefined) r.ogImage = ogImage.trim();
  if (req.file) {
    await media.deleteMediaUrl(r.file);
    r.file = await media.publishSingle(req.file, 'resources');
    r.originalName = decodeOriginalName(req.file.originalname);
    r.size = req.file.size;
  }
  r.updatedAt = new Date().toISOString();
  await store.saveResource(r);
  res.json(r);
});
app.delete('/api/resources/:id', requireAuth, async (req, res) => {
  const list = await store.listResources();
  const r = list.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  await media.deleteMediaUrl(r.file);
  await store.deleteResource(req.params.id);
  res.json({ ok: true });
});
async function sendResourceDownload(req, res, r) {
  if (!r || (!isAdminReq(req) && !isPublished(r))) return res.status(404).send('not found');
  r.downloads = (r.downloads || 0) + 1;
  await store.saveResource(r);
  if (r.file && /^https?:\/\//i.test(r.file)) {
    return res.redirect(r.file);
  }
  const f = resolveUploadUrl(r.file);
  if (!f || !fs.existsSync(f)) return res.status(404).send('file missing');
  res.download(f, r.originalName || path.basename(f));
}
app.get('/api/resources/brochure/download', async (req, res) => {
  const list = await store.listResources();
  const r = list.find((x) => isPublished(x) && x.isBrochure) ||
    list.find((x) => isPublished(x) && (/회사소개서|브로슈어|브로셔|카탈로그/i.test((x.title || '') + ' ' + (x.category || ''))));
  if (!r) return res.status(404).send('등록된 회사소개서 파일이 없습니다.');
  await sendResourceDownload(req, res, r);
});
app.get('/api/resources/:id/download', async (req, res) => {
  const r = await store.getResource(req.params.id);
  await sendResourceDownload(req, res, r);
});

/* ----- 동적 사이트맵 ----- */
app.get('/sitemap.xml', async (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  const staticPages = [
    'index.html', 'about.html', 'certifications.html', 'facilities.html', 'location.html',
    'products.html', 'product-parts.html', 'product-mold.html', 'product-module.html',
    'biz-machining.html', 'biz-mold.html', 'biz-assembly.html',
    'showcase.html', 'support.html', 'news.html', 'reference.html', 'privacy.html',
  ];
  const urls = staticPages.map((p) => `${base}/${p}`);
  publicList(await store.listProducts()).forEach((p) => urls.push(`${base}/showcase-detail.html?id=${p.id}`));
  publicList(await store.listNews()).forEach((n) => urls.push(`${base}/news-detail.html?id=${n.id}`));
  publicList(await store.listResources()).forEach((r) => urls.push(`${base}/resource-detail.html?id=${r.id}`));
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>';
  res.type('application/xml').send(xml);
});

/* ----- 정적 파일 ----- */
app.use('/uploads', express.static(UPLOAD_DIR));

/* 공개 목록 React 섬 (public-ui: 쇼케이스·자료실·공지) */
const PUBLIC_UI_DIST = path.join(ROOT, 'public-ui', 'dist');
function publicUiReady() {
  return (
    fs.existsSync(path.join(PUBLIC_UI_DIST, 'assets', 'showcase.js')) &&
    fs.existsSync(path.join(PUBLIC_UI_DIST, 'assets', 'resources.js')) &&
    fs.existsSync(path.join(PUBLIC_UI_DIST, 'assets', 'news.js'))
  );
}
if (publicUiReady()) {
  app.use('/public-ui', express.static(PUBLIC_UI_DIST, { fallthrough: true }));
}

/* React 관리자 SPA (admin-app/dist) */
const ADMIN_DIST = path.join(ROOT, 'admin-app', 'dist');
function adminSpaReady() {
  return fs.existsSync(path.join(ADMIN_DIST, 'index.html'));
}
app.get('/admin.html', async (req, res) => {
  if (adminSpaReady()) return res.redirect(302, '/admin/');
  return res.sendFile(path.join(ROOT, 'admin.html'));
});
/* 레거시 admin 페이지 → React SPA (HashRouter) */
const LEGACY_ADMIN_REDIRECTS = {
  '/admin-news.html': '/admin/#/news',
  '/admin-resources.html': '/admin/#/resources',
  '/admin-inquiries.html': '/admin/#/inquiries',
  '/admin-settings.html': '/admin/#/settings',
};
Object.entries(LEGACY_ADMIN_REDIRECTS).forEach(([from, to]) => {
  app.get(from, (req, res, next) => {
    if (adminSpaReady()) return res.redirect(302, to);
    next();
  });
});
/* 예전 path 라우트 → hash 라우트 (북마크·외부 링크 호환) */
const ADMIN_HASH_SEGMENTS = ['news', 'resources', 'inquiries', 'settings'];
ADMIN_HASH_SEGMENTS.forEach((seg) => {
  app.get(['/admin/' + seg, '/admin/' + seg + '/'], (req, res) => {
    res.redirect(302, '/admin/#/' + seg);
  });
});
if (adminSpaReady()) {
  app.use('/admin', express.static(ADMIN_DIST, { index: 'index.html', fallthrough: true }));
  app.get(/^\/admin(?:\/.*)?$/, (req, res, next) => {
    // 정적 파일이 없으면 SPA 엔트리
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(ADMIN_DIST, 'index.html'));
  });
}

app.use((req, res, next) => {
  let pathname = '';
  try { pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname); } catch (e) { pathname = req.path || ''; }
  pathname = pathname.replace(/\\/g, '/').toLowerCase();
  const blocked =
    pathname.startsWith('/data/') ||
    pathname.startsWith('/private_uploads/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/admin-app/') ||
    pathname.startsWith('/public-ui/src') ||
    pathname.startsWith('/public-ui/node_modules') ||
    pathname === '/public-ui/package.json' ||
    pathname === '/public-ui/package-lock.json' ||
    pathname === '/public-ui/vite.config.js' ||
    pathname.startsWith('/.claude/') ||
    pathname.startsWith('/.grok/') ||
    pathname.startsWith('/.git/') ||
    pathname.startsWith('/docs/') ||
    pathname.startsWith('/scripts/') ||
    pathname.startsWith('/design/') ||
    pathname === '/server.js' ||
    pathname === '/package.json' ||
    pathname === '/package-lock.json' ||
    pathname === '/agents.md' ||
    pathname === '/readme.md' ||
    pathname.endsWith('.log') ||
    pathname.endsWith('.env') ||
    pathname.includes('/.env');
  if (blocked) return res.status(404).send('not found');
  next();
});
app.use(
  express.static(ROOT, {
    // 서버/데이터 파일은 직접 노출하지 않음
    setHeaders: () => {},
  })
);

/* ----- 업로드/오류 핸들러 (라우트 이후 마지막에 등록) ----- */
app.use((err, req, res, next) => {
  console.error('[ERROR]', err && err.message);
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'file_too_large', message: '첨부 파일 용량이 너무 큽니다.' });
  }
  res.status(400).json({ error: 'upload_failed', message: (err && err.message) || '업로드 처리 중 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log('[store] mode=' + store.modeLabel());
  console.log(`k.veritas 사이트 실행 중 → http://localhost:${PORT}`);
  console.log(`관리자 페이지 → http://localhost:${PORT}/admin/  (또는 /admin.html)`);
  console.log(`쇼케이스·자료실·공지 → /showcase.html · /reference.html · /news.html`);
  console.log(
    `보안: NODE_ENV=${process.env.NODE_ENV || 'development'} · cookie.secure=${COOKIE_SECURE} · trust.proxy=${TRUST_PROXY}`
  );
  if (!adminSpaReady()) {
    console.log('  (admin-app 미빌드 — npm run build:admin)');
  }
  if (!publicUiReady()) {
    console.log('  (public-ui 미빌드 — npm run build:public)');
  }
});
