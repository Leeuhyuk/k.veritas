/**
 * Firebase Web SDK (구글 로그인 전용)
 * 서버 /api/admin/firebase-config 에서 설정 로드
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

let app = null;
let auth = null;
let cachedConfig = null;

export async function loadFirebaseWebConfig() {
  if (cachedConfig) return cachedConfig;
  const res = await fetch('/api/admin/firebase-config', { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  cachedConfig = data;
  return data;
}

function ensureAuth(config) {
  if (auth) return auth;
  if (!config || !config.apiKey) {
    throw new Error('Firebase 웹 설정(apiKey)이 없습니다.');
  }
  app = initializeApp(config);
  auth = getAuth(app);
  return auth;
}

/**
 * 구글 팝업 로그인 → ID 토큰 반환
 */
export async function signInWithGoogle() {
  const { enabled, config } = await loadFirebaseWebConfig();
  if (!enabled || !config) {
    const err = new Error(
      '구글 로그인이 설정되지 않았습니다. 서버 .env 의 FIREBASE_WEB_API_KEY 와 ADMIN_GOOGLE_EMAILS 를 확인하세요.'
    );
    err.code = 'not_configured';
    throw err;
  }
  const a = ensureAuth(config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(a, provider);
  const idToken = await cred.user.getIdToken(/* forceRefresh */ true);
  return {
    idToken,
    email: cred.user.email || '',
    name: cred.user.displayName || '',
  };
}

export async function signOutGoogle() {
  if (auth) {
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
  }
}
