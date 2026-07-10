/**
 * Firebase Web SDK — 구글 로그인 + (정적 호스팅 시) Firestore/Storage
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { isStaticHost, siteBase } from './staticMode.js';

let app = null;
let auth = null;
let db = null;
let storage = null;
let cachedMeta = null;

export async function loadFirebaseWebConfig() {
  if (cachedMeta) return cachedMeta;

  // 1) 로컬/서버 API
  try {
    const res = await fetch('/api/admin/firebase-config', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.config && data.config.apiKey) {
        cachedMeta = {
          enabled: !!data.enabled || isStaticHost(),
          config: data.config,
          adminEmails: data.adminEmails || [],
        };
        // 서버 enabled 가 false여도 정적 호스팅이면 이메일 목록을 static 파일에서 보강
        if (isStaticHost() && !cachedMeta.adminEmails.length) {
          const s = await fetchStaticConfig();
          if (s) {
            cachedMeta.adminEmails = s.adminEmails || [];
            cachedMeta.enabled = true;
            if (!cachedMeta.config && s.config) cachedMeta.config = s.config;
          }
        }
        return cachedMeta;
      }
    }
  } catch {
    /* fall through */
  }

  // 2) GitHub Pages 정적 설정
  const s = await fetchStaticConfig();
  if (s) {
    cachedMeta = {
      enabled: true,
      config: s.config,
      adminEmails: s.adminEmails || [],
    };
    return cachedMeta;
  }

  cachedMeta = { enabled: false, config: null, adminEmails: [] };
  return cachedMeta;
}

async function fetchStaticConfig() {
  const base = siteBase();
  const urls = [`${base}/static-api/firebase-web-config.json`, `static-api/firebase-web-config.json`];
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (res.ok) return res.json();
    } catch {
      /* try next */
    }
  }
  return null;
}

export function ensureFirebaseApp(config) {
  if (app) return app;
  if (!config || !config.apiKey) throw new Error('Firebase 웹 설정이 없습니다.');
  app = getApps().length ? getApps()[0] : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  // 웹 설정 storageBucket 이 달라도 실제 미디어 버킷 우선
  const bucket =
    config.storageBucket ||
    'production-management-e70fd-media';
  storage = getStorage(app, `gs://${bucket}`);
  return app;
}

export function getClientAuth() {
  return auth;
}
export function getClientDb() {
  return db;
}
export function getClientStorage() {
  return storage;
}

export async function signInWithGoogle() {
  const meta = await loadFirebaseWebConfig();
  if (!meta.config) {
    const err = new Error('구글 로그인 설정이 없습니다.');
    err.code = 'not_configured';
    throw err;
  }
  ensureFirebaseApp(meta.config);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken(true);
  return {
    idToken,
    email: (cred.user.email || '').toLowerCase(),
    name: cred.user.displayName || '',
    user: cred.user,
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

export function waitForAuthUser(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!auth) {
      resolve(null);
      return;
    }
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const t = setTimeout(() => {
      unsub();
      resolve(auth.currentUser);
    }, timeoutMs);
    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(t);
      unsub();
      resolve(u);
    });
  });
}

export function isEmailAdmin(email, adminEmails) {
  const e = String(email || '').toLowerCase();
  const list = (adminEmails || []).map((x) => String(x).toLowerCase());
  return !!e && list.includes(e);
}

export async function uploadPublicFile(file, folder = 'misc') {
  ensureFirebaseApp((await loadFirebaseWebConfig()).config);
  const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${(file.name || 'file').replace(
    /[^\w.\-]+/g,
    '_'
  )}`;
  const path = `public/${folder}/${name}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || 'application/octet-stream' });
  return getDownloadURL(r);
}

export async function listCollection(name) {
  ensureFirebaseApp((await loadFirebaseWebConfig()).config);
  try {
    const q = query(collection(db, name), orderBy('order', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // order 필드 없는 문서 대비
    const snap = await getDocs(collection(db, name));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return list.sort((a, b) => {
      const ao = a.order != null ? a.order : 0;
      const bo = b.order != null ? b.order : 0;
      if (ao !== bo) return ao - bo;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }
}

export async function getDocById(name, id) {
  ensureFirebaseApp((await loadFirebaseWebConfig()).config);
  const snap = await getDoc(doc(db, name, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function saveDoc(name, item) {
  ensureFirebaseApp((await loadFirebaseWebConfig()).config);
  const id = item.id;
  const { id: _id, ...rest } = item;
  await setDoc(doc(db, name, id), rest, { merge: true });
  return item;
}

export async function removeDoc(name, id) {
  ensureFirebaseApp((await loadFirebaseWebConfig()).config);
  await deleteDoc(doc(db, name, id));
}

export { isStaticHost };
