/**
 * 미디어 업로드/삭제
 * - JSON 모드: 로컬 uploads/
 * - Firebase 모드: Cloud Storage + 공개 URL (또는 /uploads 프록시 경로 유지 옵션)
 */
const fs = require('fs');
const path = require('path');
const { isFirebaseReady, getBucket, getAdmin } = require('./firebase');

const ROOT = path.join(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT, 'uploads');

function useFb() {
  return isFirebaseReady();
}

function resolveLocalUpload(urlPath) {
  if (!urlPath || typeof urlPath !== 'string') return null;
  const normalized = urlPath.replace(/\\/g, '/').split('?')[0].split('#')[0];
  const m = normalized.match(/^\/uploads\/([^/]+)$/);
  if (!m) return null;
  const name = m[1];
  if (!name || name.includes('..') || name.includes('\0')) return null;
  const target = path.resolve(UPLOAD_DIR, name);
  const root = path.resolve(UPLOAD_DIR);
  if (!(target.startsWith(root + path.sep) || target === root)) return null;
  return target;
}

function isAllowedMediaUrl(u) {
  if (!u || typeof u !== 'string') return false;
  if (resolveLocalUpload(u)) return true;
  if (/^https:\/\/firebasestorage\.googleapis\.com\//i.test(u)) return true;
  if (/^https:\/\/storage\.googleapis\.com\//i.test(u)) return true;
  return false;
}

function filterKeptMediaUrls(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(isAllowedMediaUrl);
}

/**
 * multer 파일 배열 → 공개 URL 배열
 * @param {Express.Multer.File[]} files
 * @param {string} folder e.g. products | news | resources
 */
async function publishFiles(files, folder = 'misc') {
  const list = files || [];
  if (!list.length) return [];

  if (!useFb()) {
    return list.map((f) => '/uploads/' + f.filename);
  }

  const bucket = getBucket();
  if (!bucket) {
    return list.map((f) => '/uploads/' + f.filename);
  }

  const urls = [];
  for (const f of list) {
    const dest = `public/${folder}/${f.filename}`;
    await bucket.upload(f.path, {
      destination: dest,
      metadata: {
        contentType: f.mimetype || 'application/octet-stream',
        cacheControl: 'public,max-age=31536000',
      },
    });
    // 공개 읽기 (버킷 규칙이 public일 때) — 토큰 URL 생성
    const file = bucket.file(dest);
    try {
      await file.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${dest}`;
      urls.push(publicUrl);
    } catch (e) {
      // makePublic 실패 시 signed URL (7일) — 운영에서는 버킷 규칙 권장
      const [signed] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 3600 * 1000,
      });
      urls.push(signed);
    }
    // 로컬 임시 파일 정리 (업로드 성공 후)
    try {
      if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (e) { /* ignore */ }
  }
  return urls;
}

async function publishSingle(file, folder = 'misc') {
  if (!file) return null;
  const urls = await publishFiles([file], folder);
  return urls[0] || null;
}

/**
 * 로컬 또는 Storage 객체 삭제
 */
async function deleteMediaUrl(urlPath) {
  if (!urlPath) return;

  const local = resolveLocalUpload(urlPath);
  if (local && fs.existsSync(local)) {
    try { fs.unlinkSync(local); } catch (e) { /* ignore */ }
    return;
  }

  if (!useFb()) return;
  const bucket = getBucket();
  if (!bucket) return;

  // https://storage.googleapis.com/BUCKET/public/...
  let objectPath = null;
  const m1 = String(urlPath).match(/storage\.googleapis\.com\/[^/]+\/(.+)$/);
  if (m1) objectPath = decodeURIComponent(m1[1].split('?')[0]);
  // firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED
  const m2 = String(urlPath).match(/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?]+)/);
  if (m2) objectPath = decodeURIComponent(m2[1]);

  if (!objectPath) return;
  try {
    await bucket.file(objectPath).delete({ ignoreNotFound: true });
  } catch (e) {
    console.warn('[media] delete failed', objectPath, e.message);
  }
}

async function deleteMediaUrls(urls) {
  for (const u of urls || []) {
    await deleteMediaUrl(u);
  }
}

/**
 * 로컬 파일을 Storage로 이전 (마이그레이션용)
 */
async function uploadLocalFile(localPath, destPath, contentType) {
  const bucket = getBucket();
  if (!bucket) throw new Error('Storage bucket not ready');
  await bucket.upload(localPath, {
    destination: destPath,
    metadata: {
      contentType: contentType || 'application/octet-stream',
      cacheControl: 'public,max-age=31536000',
    },
  });
  const file = bucket.file(destPath);
  try {
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${destPath}`;
  } catch (e) {
    const [signed] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 3600 * 1000,
    });
    return signed;
  }
}

module.exports = {
  UPLOAD_DIR,
  resolveLocalUpload,
  isAllowedMediaUrl,
  filterKeptMediaUrls,
  publishFiles,
  publishSingle,
  deleteMediaUrl,
  deleteMediaUrls,
  uploadLocalFile,
  useFb,
};
