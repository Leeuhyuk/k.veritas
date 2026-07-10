/**
 * Storage public/** 객체를 모두 공개 읽기(makePublic)로 설정
 * 실행: node scripts/make-storage-public.js
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const { initFirebase, isFirebaseReady, getBucket } = require('../lib/firebase');

async function main() {
  const r = initFirebase();
  if (!r.ok || !isFirebaseReady()) {
    console.error('Firebase 초기화 실패:', r.reason);
    process.exit(1);
  }
  const bucket = getBucket();
  console.log('[public] bucket=', bucket.name);

  let nextQuery = { prefix: 'public/', autoPaginate: false, maxResults: 200 };
  let total = 0;
  let ok = 0;
  let fail = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [files, , apiResponse] = await bucket.getFiles(nextQuery);
    for (const file of files) {
      total += 1;
      try {
        await file.makePublic();
        ok += 1;
        if (ok % 10 === 0) console.log('  public', ok, file.name);
      } catch (e) {
        fail += 1;
        console.warn('  fail', file.name, e.message.slice(0, 120));
      }
    }
    const pageToken = apiResponse && apiResponse.nextPageToken;
    if (!pageToken) break;
    nextQuery = { ...nextQuery, pageToken };
  }

  console.log(`[public] done total=${total} ok=${ok} fail=${fail}`);
  if (ok) {
    console.log(
      '예시 URL: https://storage.googleapis.com/' +
        bucket.name +
        '/public/...'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
