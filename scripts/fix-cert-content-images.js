/**
 * certifications CMS: cert*_image 복원 + body 텍스트만 유지
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

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

function extractImgSrc(html) {
  const m = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function stripToText(html) {
  return String(html || '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  store.boot();
  const page = 'certifications.html';
  const c = (await store.getPageContent(page)) || {};

  const src1 = c.cert1_image || extractImgSrc(c.cert1_body) || FALLBACK.cert1_image;
  const src2 = c.cert2_image || extractImgSrc(c.cert2_body) || FALLBACK.cert2_image;
  const src3 = c.cert3_image || extractImgSrc(c.cert3_body) || FALLBACK.cert3_image;

  c.cert1_image = src1;
  c.cert2_image = src2;
  c.cert3_image = src3;
  c.cert1_body = stripToText(c.cert1_body) || FALLBACK.cert1_body;
  c.cert2_body = stripToText(c.cert2_body) || FALLBACK.cert2_body;
  c.cert3_body = stripToText(c.cert3_body) || FALLBACK.cert3_body;

  await store.savePageContent(page, c);

  const root = path.join(__dirname, '..');
  const cf = path.join(root, 'data', 'content.json');
  let all = {};
  try {
    all = JSON.parse(fs.readFileSync(cf, 'utf8'));
  } catch (e) {
    all = {};
  }
  all[page] = c;
  fs.writeFileSync(cf, JSON.stringify(all, null, 2));
  fs.writeFileSync(
    path.join(root, 'static-api', 'content', 'certifications.html.json'),
    JSON.stringify(c, null, 2)
  );
  console.log('cert images restored');
  console.log({ cert1_image: c.cert1_image, cert1_body: c.cert1_body });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
