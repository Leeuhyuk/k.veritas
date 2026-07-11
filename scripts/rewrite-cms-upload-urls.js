/**
 * CMS content 안의 /uploads/... 경로를 Firebase Storage 공개 URL로 교체
 *
 * - 로컬 uploads/ 파일을 public/cms/<filename> 으로 업로드
 * - data/content.json + Firestore pages 문서 갱신
 *
 * 실행: node scripts/rewrite-cms-upload-urls.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const ROOT = path.join(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');
const CONTENT_FILE = path.join(ROOT, 'data', 'content.json');

const UPLOAD_RE = /\/uploads\/([A-Za-z0-9._-]+)/g;

function collectPaths(value, out) {
  if (typeof value === 'string') {
    let m;
    const re = new RegExp(UPLOAD_RE.source, 'g');
    while ((m = re.exec(value)) !== null) out.add(m[0]);
  } else if (value && typeof value === 'object') {
    if (Array.isArray(value)) value.forEach((v) => collectPaths(v, out));
    else Object.values(value).forEach((v) => collectPaths(v, out));
  }
}

function rewriteValue(value, map) {
  if (typeof value === 'string') {
    return value.replace(UPLOAD_RE, (full) => map[full] || full);
  }
  if (Array.isArray(value)) return value.map((v) => rewriteValue(v, map));
  if (value && typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = rewriteValue(v, map);
    return o;
  }
  return value;
}

async function main() {
  const { initFirebase, isFirebaseReady, getInitError } = require('../lib/firebase');
  const media = require('../lib/media');
  const store = require('../lib/store');

  const init = initFirebase();
  if (!init.ok || !isFirebaseReady()) {
    console.error('Firebase 초기화 실패:', init.reason || getInitError());
    process.exit(1);
  }
  store.boot();

  let content = {};
  try {
    content = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
  } catch (e) {
    console.error('content.json 읽기 실패', e.message);
    process.exit(1);
  }

  // Firestore에 더 최신 데이터가 있으면 병합(페이지 단위)
  const pages = Object.keys(content);
  for (const page of pages) {
    try {
      const remote = await store.getPageContent(page);
      if (remote && Object.keys(remote).length) {
        content[page] = { ...content[page], ...remote };
      }
    } catch (e) { /* keep local */ }
  }

  const paths = new Set();
  collectPaths(content, paths);
  console.log('[rewrite-cms] found', paths.size, 'upload paths');

  const map = {};
  for (const p of paths) {
    const name = p.replace(/^\/uploads\//, '');
    const local = path.join(UPLOADS, name);
    if (!fs.existsSync(local)) {
      console.warn('  missing', local);
      continue;
    }
    const dest = `public/cms/${name}`;
    const url = await media.uploadLocalFile(local, dest);
    map[p] = url;
    console.log('  ', p, '->', url);
  }

  if (!Object.keys(map).length) {
    console.log('[rewrite-cms] nothing to rewrite');
    process.exit(0);
  }

  const next = rewriteValue(content, map);
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(next, null, 2), 'utf8');
  console.log('[rewrite-cms] wrote data/content.json');

  for (const page of Object.keys(next)) {
    await store.savePageContent(page, next[page] || {});
    console.log('  saved page', page);
  }

  console.log('[rewrite-cms] done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
