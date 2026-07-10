/**
 * GitHub Pages용 공개 Firebase 웹 설정 생성
 * (apiKey 는 웹 공개 키 — 시크릿 아님. 관리 권한은 이메일 허용목록 + Security Rules)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'static-api');
fs.mkdirSync(outDir, { recursive: true });

const adminEmails = String(process.env.ADMIN_GOOGLE_EMAILS || 'lgs79422@gmail.com,lgs7942@naver.com')
  .split(/[,;]+/)
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const apiKey = process.env.FIREBASE_WEB_API_KEY || '';
const payload = {
  enabled: !!(apiKey && adminEmails.length),
  adminEmails,
  config: apiKey
    ? {
        apiKey,
        authDomain:
          process.env.FIREBASE_AUTH_DOMAIN || 'production-management-e70fd.firebaseapp.com',
        projectId: process.env.FIREBASE_PROJECT_ID || 'production-management-e70fd',
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'production-management-e70fd-media',
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.FIREBASE_WEB_APP_ID || '',
      }
    : null,
  note: 'GitHub Pages admin Google login — rules enforce admin emails',
};

const out = path.join(outDir, 'firebase-web-config.json');
fs.writeFileSync(out, JSON.stringify(payload, null, 2), 'utf8');
console.log('[export] wrote', out, 'enabled=', payload.enabled, 'emails=', adminEmails.join(','));
