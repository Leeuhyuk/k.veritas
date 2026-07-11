/**
 * 기존 resources 파일에 Content-Disposition: attachment 설정
 * 실행: node scripts/set-resources-attachment.js
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';
const store = require('../lib/store');
const { initFirebase, getBucket, isFirebaseReady } = require('../lib/firebase');

function objectPathFromUrl(url) {
  if (!url) return null;
  const m1 = String(url).match(/storage\.googleapis\.com\/[^/]+\/(.+?)(?:\?|$)/);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = String(url).match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
  if (m2) return decodeURIComponent(m2[1]);
  return null;
}

async function main() {
  initFirebase();
  if (!isFirebaseReady()) process.exit(1);
  store.boot();
  const bucket = getBucket();
  const list = await store.listResources();
  console.log('resources', list.length);
  for (const r of list) {
    const path = objectPathFromUrl(r.file);
    if (!path) {
      console.log('skip', r.id, 'no path');
      continue;
    }
    const name = (r.originalName || path.split('/').pop() || 'file').replace(/"/g, '');
    const file = bucket.file(path);
    try {
      const [meta] = await file.getMetadata();
      await file.setMetadata({
        contentType: meta.contentType || 'application/octet-stream',
        contentDisposition:
          'attachment; filename="' + name + '"; filename*=UTF-8\'\'' + encodeURIComponent(name),
      });
      console.log('ok', r.id, path);
    } catch (e) {
      console.warn('fail', r.id, e.message);
    }
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
