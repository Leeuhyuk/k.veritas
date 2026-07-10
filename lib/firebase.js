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
let authMod = null;
let app = null;
let initError = null;

const DEFAULT_PROJECT = 'production-management-e70fd';

function wantFirebase() {
  const v = String(process.env.USE_FIREBASE || '').toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  // 구글 로그인 허용 이메일이 있으면 Admin SDK 초기화
  if (process.env.ADMIN_GOOGLE_EMAILS) return true;
  return false;
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
    authMod = require('firebase-admin/auth');

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

function getAuth() {
  if (!isFirebaseReady()) return null;
  return authMod.getAuth(app);
}

/** 관리자 허용 구글 이메일 목록 (소문자) */
function getAdminGoogleEmails() {
  const raw = process.env.ADMIN_GOOGLE_EMAILS || '';
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim().toLowerCase().replace(/^["']|["']$/g, '').replace(/^\uFEFF/, ''))
    .filter(Boolean);
}

/**
 * Firebase ID 토큰 검증 후 관리자 여부 확인
 * @returns {Promise<{ ok: true, email: string, name?: string, uid: string } | { ok: false, code: string, message: string, email?: string }>}
 */
async function verifyAdminGoogleToken(idToken) {
  if (!isFirebaseReady()) {
    const r = initFirebase();
    if (!r.ok) {
      return {
        ok: false,
        code: 'firebase_unavailable',
        message: 'Firebase 인증을 사용할 수 없습니다. USE_FIREBASE=1 과 서비스 계정을 확인하세요. (' + (r.reason || '') + ')',
      };
    }
  }
  const auth = getAuth();
  if (!auth) {
    return {
      ok: false,
      code: 'firebase_unavailable',
      message: 'Firebase Auth 초기화에 실패했습니다.',
    };
  }
  const allow = getAdminGoogleEmails();
  if (!allow.length) {
    return {
      ok: false,
      code: 'allowlist_empty',
      message: 'ADMIN_GOOGLE_EMAILS 환경변수에 허용할 구글 이메일을 넣어 주세요.',
    };
  }
  try {
    // checkRevoked=false: 네트워크 이슈로 실패하는 경우 줄임
    const decoded = await auth.verifyIdToken(String(idToken || ''), false);
    const email = String(decoded.email || '').trim().toLowerCase();
    console.log('[auth/google] token ok email=', email, 'allow=', allow.join(','));
    if (!email || !allow.includes(email)) {
      return {
        ok: false,
        code: 'not_allowed',
        email,
        message:
          '이 구글 계정(' +
          (email || '이메일 없음') +
          ')은 관리자로 등록되어 있지 않습니다. 허용: ' +
          allow.join(', '),
      };
    }
    // 허용 목록에 있으면 email_verified 검사 완화 (일부 계정 예외)
    return {
      ok: true,
      email,
      name: decoded.name || '',
      uid: decoded.uid,
    };
  } catch (e) {
    console.error('[auth/google] verifyIdToken failed:', e && e.code, e && e.message);
    return {
      ok: false,
      code: 'invalid_token',
      message:
        '구글 로그인 토큰 검증 실패: ' +
        ((e && (e.message || e.code)) || 'unknown') +
        '. Firebase Authentication → Google 사용 설정과 프로젝트 ID를 확인하세요.',
    };
  }
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
  getAuth,
  getAdminGoogleEmails,
  verifyAdminGoogleToken,
  getInitError,
  modeLabel,
  getProjectId,
};
