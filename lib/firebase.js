/**
 * Firebase Admin 초기화
 * 환경변수:
 *   USE_FIREBASE=1
 *   FIREBASE_PROJECT_ID=...
 *   GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
 *   또는 FIREBASE_SERVICE_ACCOUNT_JSON='{...}'
 *   FIREBASE_STORAGE_BUCKET=...appspot.com
 */
const path = require('path');
const fs = require('fs');

let admin = null;
let app = null;
let initError = null;

function wantFirebase() {
  const v = String(process.env.USE_FIREBASE || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON 파싱 실패: ' + e.message);
    }
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
    if (!fs.existsSync(abs)) {
      throw new Error('서비스 계정 파일 없음: ' + abs);
    }
    return JSON.parse(fs.readFileSync(abs, 'utf-8'));
  }
  // 기본 경로 후보
  const candidates = [
    path.join(process.cwd(), 'secrets', 'serviceAccount.json'),
    path.join(process.cwd(), 'serviceAccount.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  return null;
}

function initFirebase() {
  if (app) return { ok: true, admin, app };
  if (!wantFirebase()) {
    return { ok: false, reason: 'USE_FIREBASE not set' };
  }
  try {
    admin = require('firebase-admin');
    if (admin.apps && admin.apps.length) {
      app = admin.app();
      return { ok: true, admin, app };
    }
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      'production-management-e70fd';
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : 'production-management-e70fd.appspot.com');
    const credential = loadCredential();

    const opts = {};
    if (credential) {
      opts.credential = admin.credential.cert(credential);
      if (!projectId && credential.project_id) opts.projectId = credential.project_id;
    } else {
      // ADC (Cloud Run / GCP 환경)
      opts.credential = admin.credential.applicationDefault();
    }
    if (projectId) opts.projectId = projectId;
    if (storageBucket) opts.storageBucket = storageBucket;

    app = admin.initializeApp(opts);
    return { ok: true, admin, app };
  } catch (e) {
    initError = e;
    console.error('[firebase] 초기화 실패:', e.message);
    return { ok: false, reason: e.message };
  }
}

function isFirebaseReady() {
  if (!wantFirebase()) return false;
  if (app) return true;
  const r = initFirebase();
  return !!r.ok;
}

function getAdmin() {
  if (!isFirebaseReady()) return null;
  return admin;
}

function getDb() {
  const a = getAdmin();
  return a ? a.firestore() : null;
}

function getBucket() {
  const a = getAdmin();
  if (!a) return null;
  const name = process.env.FIREBASE_STORAGE_BUCKET || undefined;
  return name ? a.storage().bucket(name) : a.storage().bucket();
}

function getInitError() {
  return initError;
}

function modeLabel() {
  if (!wantFirebase()) return 'json';
  if (isFirebaseReady()) return 'firebase';
  return 'json-fallback';
}

module.exports = {
  wantFirebase,
  initFirebase,
  isFirebaseReady,
  getAdmin,
  getDb,
  getBucket,
  getInitError,
  modeLabel,
};
