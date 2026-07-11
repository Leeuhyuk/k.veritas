/**
 * certifications: 별도 cert*_image → card body 안 img (메인 사업영역 카드와 동일)
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';

const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

const ROOT = path.join(__dirname, '..');

const FALLBACK = {
  cert1_image:
    'https://storage.googleapis.com/production-management-e70fd-media/public/cms/opt/1783748080530-public_cms_1783737918913-132161639-wallpapertip_imac-5k-wall.webp',
  cert2_image:
    'https://storage.googleapis.com/production-management-e70fd-media/public/cms/opt/1783748083911-public_cms_1783737921022-941183904-wallpapertip_5k-wallpaper.webp',
  cert3_image:
    'https://storage.googleapis.com/production-management-e70fd-media/public/cms/opt/1783748086309-public_cms_1783737922779-740610676-wallpaperbetter.com_5760x.webp',
  cert1_body: '품질경영시스템 국제 표준 인증.',
  cert2_body: '자동차 산업 품질경영시스템 인증.',
  cert3_body: '환경경영시스템 인증.',
};

function stripImg(html) {
  return String(html || '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/^(<br\s*\/?>|\s)+/i, '')
    .trim();
}

function wrap(src, alt, text) {
  return (
    '<img src="' +
    src +
    '" alt="' +
    alt +
    '" style="max-width:100%;border-radius:8px" loading="lazy" decoding="async">' +
    text
  );
}

async function main() {
  store.boot();
  const page = 'certifications.html';
  const c = (await store.getPageContent(page)) || {};

  const img1 = c.cert1_image || FALLBACK.cert1_image;
  const img2 = c.cert2_image || FALLBACK.cert2_image;
  const img3 = c.cert3_image || FALLBACK.cert3_image;

  // body에 이미 img가 있으면 src만 유지, 없으면 이미지 필드로 합성
  const hasImg = (html) => /<img\s/i.test(String(html || ''));

  if (!hasImg(c.cert1_body)) {
    c.cert1_body = wrap(img1, 'ISO 9001', stripImg(c.cert1_body) || FALLBACK.cert1_body);
  }
  if (!hasImg(c.cert2_body)) {
    c.cert2_body = wrap(img2, 'IATF 16949', stripImg(c.cert2_body) || FALLBACK.cert2_body);
  }
  if (!hasImg(c.cert3_body)) {
    c.cert3_body = wrap(img3, 'ISO 14001', stripImg(c.cert3_body) || FALLBACK.cert3_body);
  }

  delete c.cert1_image;
  delete c.cert2_image;
  delete c.cert3_image;
  delete c.cert1_image__h;
  delete c.cert2_image__h;
  delete c.cert3_image__h;

  await store.savePageContent(page, c);

  const cf = path.join(ROOT, 'data', 'content.json');
  let all = {};
  try {
    all = JSON.parse(fs.readFileSync(cf, 'utf8'));
  } catch (e) {
    all = {};
  }
  all[page] = c;
  fs.writeFileSync(cf, JSON.stringify(all, null, 2), 'utf8');

  const out = path.join(ROOT, 'static-api', 'content', 'certifications.html.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(c, null, 2), 'utf8');

  console.log('[migrate-cert] done');
  console.log('  cert1_body sample:', String(c.cert1_body).slice(0, 140));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
