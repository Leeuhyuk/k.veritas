/**
 * CMS(pages) 본문·필드 이미지 일괄 최적화
 * - 가로 최대 1200px, WebP q=78
 * - Storage public/cms/opt/ 업로드 후 pages 문서 URL 교체
 *
 * 실행: node scripts/optimize-cms-images.js
 *       node scripts/optimize-cms-images.js --dry-run
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const dryRun = process.argv.includes('--dry-run');
const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, 'tmp-cms-optimize');
const MAX_W = 1200;
const QUALITY = 78;
const MIN_BYTES_TO_TOUCH = 180 * 1024; // 180KB 미만이면 스킵 (이미 작음)

const URL_RE =
  /https:\/\/(?:firebasestorage\.googleapis\.com\/v0\/b\/[^/"']+\/o\/[^?"']+\?[^"'\\\s]+|storage\.googleapis\.com\/[^"'\\\s]+)/gi;
const PATH_UPLOAD_RE = /\/uploads\/([A-Za-z0-9._-]+)/g;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function collectUrls(value, out) {
  if (typeof value === 'string') {
    let m;
    const re = new RegExp(URL_RE.source, 'gi');
    while ((m = re.exec(value)) !== null) out.add(m[0]);
    const re2 = new RegExp(PATH_UPLOAD_RE.source, 'g');
    while ((m = re2.exec(value)) !== null) out.add(m[0]);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectUrls(v, out));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectUrls(v, out));
  }
}

function rewriteValue(value, map) {
  if (typeof value === 'string') {
    let s = value;
    for (const [from, to] of Object.entries(map)) {
      if (from && to && s.includes(from)) s = s.split(from).join(to);
    }
    return s;
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
  const { initFirebase, isFirebaseReady, getInitError, getBucket } = require('../lib/firebase');
  const media = require('../lib/media');
  const store = require('../lib/store');

  const init = initFirebase();
  if (!init.ok || !isFirebaseReady()) {
    console.error('Firebase 실패:', init.reason || getInitError());
    process.exit(1);
  }
  store.boot();
  fs.mkdirSync(TMP, { recursive: true });

  // pages 목록: Firestore + 로컬 content.json
  const pageIds = new Set();
  try {
    const { getDb } = require('../lib/firebase');
    const snap = await getDb().collection('pages').get();
    snap.docs.forEach((d) => pageIds.add(d.id));
  } catch (e) {
    console.warn('list pages:', e.message);
  }
  try {
    const local = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'content.json'), 'utf8'));
    Object.keys(local || {}).forEach((k) => pageIds.add(k));
  } catch (e) {
    /* ignore */
  }

  console.log('[optimize-cms] pages:', [...pageIds].join(', ') || '(none)');

  const allContent = {};
  for (const page of pageIds) {
    allContent[page] = (await store.getPageContent(page)) || {};
  }

  const urls = new Set();
  collectUrls(allContent, urls);
  console.log('[optimize-cms] unique media refs:', urls.size);

  const map = {};
  let i = 0;
  for (const ref of urls) {
    i += 1;
    process.stdout.write(`  (${i}/${urls.size}) `);
    try {
      let buf;
      let baseName = 'img';
      if (ref.startsWith('/uploads/')) {
        const local = path.join(ROOT, 'uploads', path.basename(ref));
        if (!fs.existsSync(local)) {
          console.log('skip missing', ref);
          continue;
        }
        buf = fs.readFileSync(local);
        baseName = path.basename(ref, path.extname(ref));
      } else {
        buf = await fetchBuffer(ref);
        try {
          const u = new URL(ref.split('?')[0]);
          const raw = decodeURIComponent(u.pathname.split('/').pop() || 'img');
          baseName = raw.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_').slice(0, 60) || 'img';
        } catch {
          baseName = 'img';
        }
      }

      if (buf.length < MIN_BYTES_TO_TOUCH) {
        console.log('skip small', Math.round(buf.length / 1024) + 'KB', baseName);
        continue;
      }

      const meta = await sharp(buf).metadata();
      const needResize = (meta.width || 0) > MAX_W;
      const isWebp = meta.format === 'webp';
      // 이미 WebP + 작은 해상도면 스킵
      if (isWebp && !needResize && buf.length < 400 * 1024) {
        console.log('skip ok', meta.width + 'x' + meta.height, Math.round(buf.length / 1024) + 'KB');
        continue;
      }

      const out = await sharp(buf)
        .rotate()
        .resize({ width: MAX_W, withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      const dest = `public/cms/opt/${Date.now()}-${baseName}.webp`;
      console.log(
        `${meta.width}x${meta.height} ${Math.round(buf.length / 1024)}KB → ${Math.round(out.length / 1024)}KB`,
        dest
      );

      if (dryRun) {
        map[ref] = `https://storage.googleapis.com/DRY/${dest}`;
        continue;
      }

      const url = await media.uploadLocalFile(
        (() => {
          const p = path.join(TMP, path.basename(dest));
          fs.writeFileSync(p, out);
          return p;
        })(),
        dest,
        'image/webp'
      );
      map[ref] = url;
    } catch (e) {
      console.log('FAIL', ref.slice(0, 80), e.message);
    }
  }

  if (!Object.keys(map).length) {
    console.log('[optimize-cms] nothing rewritten');
    process.exit(0);
  }

  console.log('[optimize-cms] rewriting', Object.keys(map).length, 'urls');
  const nextAll = rewriteValue(allContent, map);

  // 로컬 content.json 병합 저장
  const contentFile = path.join(ROOT, 'data', 'content.json');
  let localAll = {};
  try {
    localAll = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  } catch (e) {
    localAll = {};
  }
  for (const page of Object.keys(nextAll)) {
    localAll[page] = nextAll[page];
    if (!dryRun) {
      await store.savePageContent(page, nextAll[page] || {});
      console.log('  saved', page);
    } else {
      console.log('  would save', page);
    }
  }
  if (!dryRun) {
    fs.writeFileSync(contentFile, JSON.stringify(localAll, null, 2), 'utf8');
  }

  console.log('[optimize-cms] done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
