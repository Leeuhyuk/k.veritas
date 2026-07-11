/**
 * Storage 버킷 CORS — 사이트에서 fetch→blob 강제 다운로드 허용
 * 실행: node scripts/set-storage-cors.js
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const { initFirebase, getBucket, isFirebaseReady, getInitError } = require('../lib/firebase');

async function main() {
  const init = initFirebase();
  if (!init.ok || !isFirebaseReady()) {
    console.error('Firebase 실패', init.reason || getInitError());
    process.exit(1);
  }
  const bucket = getBucket();
  if (!bucket) {
    console.error('bucket 없음');
    process.exit(1);
  }

  const cors = [
    {
      origin: [
        'https://leeuhyuk.github.io',
        'http://localhost:3000',
        'http://localhost:4000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000',
      ],
      method: ['GET', 'HEAD', 'OPTIONS'],
      responseHeader: [
        'Content-Type',
        'Content-Disposition',
        'Content-Length',
        'Access-Control-Allow-Origin',
      ],
      maxAgeSeconds: 3600,
    },
  ];

  await bucket.setCorsConfiguration(cors);
  console.log('[cors] applied on', bucket.name);
  console.log(JSON.stringify(cors, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
