/**
 * 공개 데이터 → static-api/*.json (GitHub Pages용)
 * Node 서버 없이 목록/상세를 표시할 수 있게 스냅샷을 만듭니다.
 *
 * 실행: node scripts/export-static-api.js
 * (USE_FIREBASE=1 이면 Firestore에서, 아니면 data/*.json)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('../lib/store');

const OUT = path.join(__dirname, '..', 'static-api');

function pub(list) {
  return (list || []).filter((x) => !x.status || x.status === 'published');
}

function write(rel, data) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log('  write', 'static-api/' + rel.replace(/\\/g, '/'));
}

async function main() {
  store.boot();
  console.log('[export-static-api] mode=', store.modeLabel());

  const products = pub(await store.listProducts());
  const news = pub(await store.listNews());
  const resources = pub(await store.listResources());
  const categories = await store.listCategories();

  write('products.json', products);
  write('news.json', news);
  write('resources.json', resources);
  write('categories.json', categories);

  for (const p of products) write(path.join('products', p.id + '.json'), p);
  for (const n of news) write(path.join('news', n.id + '.json'), n);
  for (const r of resources) write(path.join('resources', r.id + '.json'), r);

  // CMS pages (content)
  const pages = ['index.html', 'about.html', 'facilities.html', 'location.html', 'biz-machining.html'];
  for (const page of pages) {
    const c = await store.getPageContent(page);
    if (c && Object.keys(c).length) write(path.join('content', page + '.json'), c);
  }

  // meta
  write('_meta.json', {
    exportedAt: new Date().toISOString(),
    mode: store.modeLabel(),
    counts: {
      products: products.length,
      news: news.length,
      resources: resources.length,
    },
  });

  console.log('[export-static-api] done → static-api/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
