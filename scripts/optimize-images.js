/**
 * 제품/공지/자료 이미지 일괄 최적화 + Storage 재업로드 + Firestore 갱신
 *
 * - 본문용: 최대 가로 1400px, WebP q=78
 * - 목록용 썸네일: 최대 가로 480px, WebP q=72  → thumbs[]
 *
 * 실행:
 *   node scripts/optimize-images.js
 *   node scripts/optimize-images.js --dry-run
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const store = require('../lib/store');
const { initFirebase, isFirebaseReady, getBucket } = require('../lib/firebase');
const media = require('../lib/media');

const ROOT = path.join(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');
const TMP = path.join(ROOT, 'tmp-optimize');
const dryRun = process.argv.includes('--dry-run');

const FULL = { width: 1400, quality: 78 };
const THUMB = { width: 480, quality: 72 };

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' ' + url));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function loadImageBuffer(ref) {
  if (!ref) return null;
  if (/^https?:\/\//i.test(ref)) {
    return fetchBuffer(ref);
  }
  // /uploads/name
  const name = path.basename(String(ref).split('?')[0]);
  const local = path.join(UPLOADS, name);
  if (fs.existsSync(local)) return fs.readFileSync(local);
  // try as relative
  const abs = path.isAbsolute(ref) ? ref : path.join(ROOT, ref.replace(/^\//, ''));
  if (fs.existsSync(abs)) return fs.readFileSync(abs);
  throw new Error('file not found: ' + ref);
}

async function toWebp(buf, { width, quality }) {
  return sharp(buf)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

async function uploadBuffer(buf, destPath, contentType) {
  if (dryRun) {
    console.log('  would upload', destPath, Math.round(buf.length / 1024) + 'KB');
    return `https://storage.googleapis.com/DRY/${destPath}`;
  }
  const bucket = getBucket();
  if (!bucket) {
    // local fallback: write to uploads
    const base = path.basename(destPath);
    const localPath = path.join(UPLOADS, base);
    fs.writeFileSync(localPath, buf);
    return '/uploads/' + base;
  }
  const tmp = path.join(TMP, path.basename(destPath));
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(tmp, buf);
  try {
    await bucket.upload(tmp, {
      destination: destPath,
      metadata: {
        contentType: contentType || 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable',
      },
    });
    const file = bucket.file(destPath);
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
    try {
      await file.makePublic();
    } catch (e) {
      console.warn('  makePublic warn', e.message.slice(0, 80));
    }
    return publicUrl;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) { /* ignore */ }
  }
}

async function optimizeOne(srcRef, id, index, folder) {
  const raw = await loadImageBuffer(srcRef);
  const before = raw.length;
  const fullBuf = await toWebp(raw, FULL);
  const thumbBuf = await toWebp(raw, THUMB);
  const stamp = Date.now();
  const fullDest = `public/${folder}/${id}/full-${index}-${stamp}.webp`;
  const thumbDest = `public/${folder}/${id}/thumb-${index}-${stamp}.webp`;
  const fullUrl = await uploadBuffer(fullBuf, fullDest, 'image/webp');
  const thumbUrl = await uploadBuffer(thumbBuf, thumbDest, 'image/webp');
  console.log(
    `  [${index}] ${(before / 1024).toFixed(0)}KB → full ${(fullBuf.length / 1024).toFixed(0)}KB, thumb ${(thumbBuf.length / 1024).toFixed(0)}KB`
  );
  return { fullUrl, thumbUrl };
}

async function processEntity(item, folder, saveFn) {
  const images = item.images || [];
  if (!images.length) {
    console.log('  (no images)');
    return item;
  }
  const newImages = [];
  const newThumbs = [];
  for (let i = 0; i < images.length; i++) {
    try {
      const { fullUrl, thumbUrl } = await optimizeOne(images[i], item.id, i, folder);
      newImages.push(fullUrl);
      newThumbs.push(thumbUrl);
    } catch (e) {
      console.warn('  skip', images[i], e.message);
      newImages.push(images[i]);
      newThumbs.push(item.thumbs && item.thumbs[i] ? item.thumbs[i] : images[i]);
    }
  }
  const next = {
    ...item,
    images: newImages,
    thumbs: newThumbs,
    updatedAt: new Date().toISOString(),
  };
  if (!dryRun) await saveFn(next);
  return next;
}

async function main() {
  store.boot();
  if (process.env.USE_FIREBASE === '1' || process.env.USE_FIREBASE === 'true') {
    const r = initFirebase();
    if (!r.ok || !isFirebaseReady()) {
      console.error('Firebase 초기화 실패 — JSON 모드로 로컬 uploads만 처리 가능');
    }
  }
  console.log('[optimize] mode=', store.modeLabel(), 'dryRun=', dryRun);
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(UPLOADS, { recursive: true });

  const products = await store.listProducts();
  console.log('\n== products', products.length, '==');
  for (const p of products) {
    console.log(p.id, p.title);
    await processEntity(p, 'products', (x) => store.saveProduct(x));
  }

  const news = await store.listNews();
  console.log('\n== news', news.length, '==');
  for (const n of news) {
    console.log(n.id, n.title);
    await processEntity(n, 'news', (x) => store.saveNews(x));
  }

  // resources: only optimize if file looks like image
  const resources = await store.listResources();
  console.log('\n== resources (image files only)', resources.length, '==');
  for (const r of resources) {
    const f = r.file || '';
    if (!/\.(jpe?g|png|webp|gif)$/i.test(f) && !/image\//i.test(r.mimetype || '')) {
      console.log(r.id, 'skip non-image');
      continue;
    }
    console.log(r.id, r.title);
    try {
      const raw = await loadImageBuffer(f);
      const fullBuf = await toWebp(raw, FULL);
      const dest = `public/resources/${r.id}/file-${Date.now()}.webp`;
      const url = await uploadBuffer(fullBuf, dest, 'image/webp');
      r.file = url;
      r.originalName = (r.originalName || 'file').replace(/\.[^.]+$/, '') + '.webp';
      r.size = fullBuf.length;
      r.updatedAt = new Date().toISOString();
      if (!dryRun) await store.saveResource(r);
      console.log('  resource', (raw.length / 1024).toFixed(0), '→', (fullBuf.length / 1024).toFixed(0), 'KB');
    } catch (e) {
      console.warn('  resource skip', e.message);
    }
  }

  try {
    fs.rmSync(TMP, { recursive: true, force: true });
  } catch (e) { /* ignore */ }

  console.log('\n[optimize] 완료. 이어서: npm run export:static && npm run storage:public');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
