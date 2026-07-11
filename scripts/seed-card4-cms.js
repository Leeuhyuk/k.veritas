/**
 * index.html 카드4 CMS 필드 시드 (실제 생산 제품)
 */
require('dotenv').config();
process.env.USE_FIREBASE = process.env.USE_FIREBASE || '1';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

async function main() {
  store.boot();
  const page = 'index.html';
  const c = (await store.getPageContent(page)) || {};
  if (!c.card4_title) c.card4_title = '실제 생산 제품';
  if (!c.card4_body) {
    c.card4_body = '쇼케이스에서 실제 양산·납품 제품 사례를 확인하세요.';
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
  const out = path.join(root, 'static-api', 'content', 'index.html.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(c, null, 2));
  console.log('card4 seeded', { title: c.card4_title, body: String(c.card4_body).slice(0, 80) });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
