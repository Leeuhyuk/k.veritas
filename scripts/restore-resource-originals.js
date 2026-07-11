/**
 * 자료실: 최적화된 webp 대신 Storage에 남은 원본 파일로 file URL 복구
 * 실행: node scripts/restore-resource-originals.js
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';
const path = require('path');
const store = require('../lib/store');
const { initFirebase, getBucket, isFirebaseReady } = require('../lib/firebase');

function publicUrl(bucket, objectPath) {
  return `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
}

async function main() {
  initFirebase();
  if (!isFirebaseReady()) process.exit(1);
  store.boot();
  const bucket = getBucket();
  const list = await store.listResources();
  console.log('resources', list.length);

  for (const r of list) {
    const prefix = `public/resources/${r.id}/`;
    const [files] = await bucket.getFiles({ prefix });
    if (!files.length) {
      console.log('skip', r.id, 'no files');
      continue;
    }

    // 원본 후보: file-*.webp 가 아닌 것 우선, 없으면 용량 큰 것
    const metas = [];
    for (const f of files) {
      const [m] = await f.getMetadata();
      metas.push({
        name: f.name,
        size: Number(m.size || 0),
        contentType: m.contentType || '',
        base: path.basename(f.name),
      });
    }

    let original = metas
      .filter((x) => !/^file-\d+.*\.webp$/i.test(x.base) && !/\/opt\//.test(x.name))
      .sort((a, b) => b.size - a.size)[0];

    if (!original) {
      original = metas.sort((a, b) => b.size - a.size)[0];
    }

    const url = publicUrl(bucket, original.name);
    const file = bucket.file(original.name);
    const disp = (r.originalName && !/\.webp$/i.test(r.originalName) ? r.originalName : original.base).replace(
      /"/g,
      ''
    );

    try {
      await file.makePublic();
    } catch (e) {
      /* ignore */
    }
    try {
      await file.setMetadata({
        contentType: original.contentType || 'application/octet-stream',
        contentDisposition:
          'attachment; filename="' + disp + '"; filename*=UTF-8\'\'' + encodeURIComponent(disp),
      });
    } catch (e) {
      console.warn('meta fail', r.id, e.message);
    }

    r.file = url;
    r.originalName = disp;
    r.size = original.size;
    r.updatedAt = new Date().toISOString();
    await store.saveResource(r);
    console.log('ok', r.id, '->', original.name, original.size);
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
