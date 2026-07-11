require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

async function main() {
  store.boot();
  const page = 'certifications.html';
  const c = (await store.getPageContent(page)) || {};
  for (const k of ['cert1_body', 'cert2_body', 'cert3_body']) {
    if (!c[k]) continue;
    let html = String(c[k]);
    html = html.replace(/\s*style="[^"]*"/gi, '');
    html = html.replace(/<img(\s+)/gi, '<img loading="lazy" decoding="async" $1');
    // 중복 loading 속성 정리
    html = html.replace(/(loading="lazy"\s*){2,}/gi, 'loading="lazy" ');
    html = html.replace(/(decoding="async"\s*){2,}/gi, 'decoding="async" ');
    c[k] = html;
  }
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
  console.log('ok', String(c.cert1_body).slice(0, 160));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
