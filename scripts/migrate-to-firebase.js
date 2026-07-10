/**
 * 로컬 JSON + uploads → Firebase Firestore / Storage 마이그레이션
 *
 * 사전 준비:
 *   1) Firebase 콘솔에서 Firestore·Storage 생성
 *   2) 서비스 계정 JSON 발급 → secrets/serviceAccount.json
 *   3) .env 또는 환경변수 설정
 *
 * 실행:
 *   set USE_FIREBASE=1
 *   set FIREBASE_PROJECT_ID=your-project-id
 *   set GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
 *   node scripts/migrate-to-firebase.js
 *
 * 옵션:
 *   --dry-run   업로드 없이 대상만 출력
 *   --skip-files  메타데이터만 (파일 업로드 생략)
 */
const fs = require('fs');
const path = require('path');

process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const UPLOADS = path.join(ROOT, 'uploads');

const dryRun = process.argv.includes('--dry-run');
const skipFiles = process.argv.includes('--skip-files');

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
  } catch (e) {
    return fallback;
  }
}

async function main() {
  const { initFirebase, isFirebaseReady, getDb, getInitError } = require('../lib/firebase');
  const media = require('../lib/media');

  const init = initFirebase();
  if (!init.ok || !isFirebaseReady()) {
    console.error('Firebase 초기화 실패:', init.reason || getInitError());
    process.exit(1);
  }
  const db = getDb();
  console.log('[migrate] project ready, dryRun=', dryRun, 'skipFiles=', skipFiles);

  async function uploadPath(localRelOrAbs, dest) {
    if (skipFiles) return null;
    const local = path.isAbsolute(localRelOrAbs)
      ? localRelOrAbs
      : path.join(ROOT, localRelOrAbs.replace(/^\//, ''));
    if (!fs.existsSync(local)) {
      console.warn('  missing file', local);
      return null;
    }
    if (dryRun) {
      console.log('  would upload', local, '->', dest);
      return `https://storage.googleapis.com/DRY_RUN/${dest}`;
    }
    const url = await media.uploadLocalFile(local, dest);
    console.log('  uploaded', dest);
    return url;
  }

  async function migrateCollection(name, items, mapItem) {
    console.log(`\n== ${name} (${items.length}) ==`);
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const doc = await mapItem(raw, i);
      if (dryRun) {
        console.log('  would set', name, doc.id);
        continue;
      }
      const { id, ...rest } = doc;
      await db.collection(name).doc(id).set(rest, { merge: true });
      console.log('  set', id);
    }
  }

  const products = readJson('products.json', []);
  await migrateCollection('products', products, async (p, i) => {
    const images = [];
    for (const u of p.images || []) {
      if (/^https?:\/\//i.test(u)) {
        images.push(u);
        continue;
      }
      const base = path.basename(u);
      const url = await uploadPath(path.join(UPLOADS, base), `public/products/${p.id}/${base}`);
      images.push(url || u);
    }
    return {
      ...p,
      images,
      order: p.order != null ? p.order : i,
    };
  });

  const news = readJson('news.json', []);
  await migrateCollection('news', news, async (n, i) => {
    const images = [];
    for (const u of n.images || []) {
      if (/^https?:\/\//i.test(u)) {
        images.push(u);
        continue;
      }
      const base = path.basename(u);
      const url = await uploadPath(path.join(UPLOADS, base), `public/news/${n.id}/${base}`);
      images.push(url || u);
    }
    return { ...n, images, order: n.order != null ? n.order : i };
  });

  const resources = readJson('resources.json', []);
  await migrateCollection('resources', resources, async (r, i) => {
    let file = r.file;
    if (file && !/^https?:\/\//i.test(file)) {
      const base = path.basename(file);
      file = (await uploadPath(path.join(UPLOADS, base), `public/resources/${r.id}/${base}`)) || file;
    }
    return { ...r, file, order: r.order != null ? r.order : i };
  });

  const inquiries = readJson('inquiries.json', []);
  await migrateCollection('inquiries', inquiries, async (q) => q);

  const categories = readJson('categories.json', []);
  if (!dryRun) {
    await db.collection('settings').doc('categories').set({ items: categories }, { merge: true });
  }
  console.log('\n== settings/categories ==', categories.length);

  const content = readJson('content.json', {});
  const pages = Object.keys(content);
  console.log('\n== pages ==', pages.length);
  for (const page of pages) {
    if (dryRun) {
      console.log('  would set page', page);
      continue;
    }
    await db.collection('pages').doc(page).set(content[page] || {}, { merge: true });
    console.log('  set page', page);
  }

  console.log('\n[migrate] 완료. USE_FIREBASE=1 로 서버를 실행하세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
