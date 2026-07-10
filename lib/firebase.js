/**
 * Firebase Admin 초기화 (firebase-admin v12+ modular / 호환)
 * 환경변수:
 *   USE_FIREBASE=1
 *   FIREBASE_PROJECT_ID=production-management-e70fd
 *   GOOGLE_APPLICATION_CREDENTIALS=./secrets/serviceAccount.json
 *   FIREBASE_STORAGE_BUCKET=production-management-e70fd.appspot.com
 */
const path = require('path');
const fs = require('fs');

let adminAppMod = null;
let firestoreMod = null;
let storageMod = null;
let app = null;
let initError = null;

const DEFAULT_PROJECT = 'production-management-e70fd';

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
  const candidates = [
    path.join(process.cwd(), 'secrets', 'serviceAccount.json'),
    path.join(process.cwd(), 'serviceAccount.json'),
  ];
  // adminsdk 파일명 자동 탐색
  const secretsDir = path.join(process.cwd(), 'secrets');
  if (fs.existsSync(secretsDir)) {
    const found = fs
      .readdirSync(secretsDir)
      .filter((n) => /firebase-adminsdk.*\.json$/i.test(n) || n === 'serviceAccount.json');
    found.forEach((n) => candidates.unshift(path.join(secretsDir, n)));
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  return null;
}

function initFirebase() {
  if (app) return { ok: true, app };
  if (!wantFirebase()) {
    return { ok: false, reason: 'USE_FIREBASE not set' };
  }
  try {
    adminAppMod = require('firebase-admin/app');
    firestoreMod = require('firebase-admin/firestore');
    storageMod = require('firebase-admin/storage');

    const { initializeApp, cert, applicationDefault, getApps, getApp } = adminAppMod;

    if (getApps && getApps().length) {
      app = getApp();
      return { ok: true, app };
    }

    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GCLOUD_PROJECT ||
      DEFAULT_PROJECT;
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET ||
      'production-management-e70fd-media';

    const credentialJson = loadCredential();
    let credential;
    if (credentialJson) {
      credential = cert(credentialJson);
    } else {
      credential = applicationDefault();
    }

    app = initializeApp({
      credential,
      projectId: projectId || (credentialJson && credentialJson.project_id) || undefined,
      storageBucket,
    });
    return { ok: true, app };
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

function getDb() {
  if (!isFirebaseReady()) return null;
  return firestoreMod.getFirestore(app);
}

function getBucket() {
  if (!isFirebaseReady()) return null;
  const name = process.env.FIREBASE_STORAGE_BUCKET || undefined;
  const storage = storageMod.getStorage(app);
  return name ? storage.bucket(name) : storage.bucket();
}

function getInitError() {
  return initError;
}

function modeLabel() {
  if (!wantFirebase()) return 'json';
  if (isFirebaseReady()) return 'firebase';
  return 'json-fallback';
}

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    DEFAULT_PROJECT
  );
}

module.exports = {
  wantFirebase,
  initFirebase,
  isFirebaseReady,
  getDb,
  getBucket,
  getInitError,
  modeLabel,
  getProjectId,
};
