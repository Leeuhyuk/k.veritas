/**
 * server.js 데이터 접근을 store/media 비동기 API로 패치
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'server.js');
let s = fs.readFileSync(file, 'utf8');

// 1) 남아 있는 동기 헬퍼 호출 패턴 교체용 — 라우트 전체를 정규식으로 바꾸기 어려우므로
//    동기 브릿지를 재도입: store를 쓰지 않고 파일을 직접 읽던 함수를 store 비동기 래핑 없이
//    다시 넣으면 firebase 미사용. 대신 모든 readX/writeX를 store 호출 코드로 일괄 치환.

function rep(a, b) {
  const n = s.split(a).length - 1;
  if (n) console.log('replace', JSON.stringify(a).slice(0, 60), 'x' + n);
  s = s.split(a).join(b);
}

// admin list routes
rep(
  `app.get('/api/admin/products', requireAuth, (req, res) => res.json(readProducts()));
app.get('/api/admin/products/:id', requireAuth, (req, res) => {
  const p = readProducts().find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json(p);
});
app.get('/api/admin/news', requireAuth, (req, res) => res.json(readNews()));
app.get('/api/admin/news/:id', requireAuth, (req, res) => {
  const n = readNews().find((x) => x.id === req.params.id);
  if (!n) return res.status(404).json({ error: 'not_found' });
  res.json(n);
});
app.get('/api/admin/resources', requireAuth, (req, res) => res.json(readRes()));
app.get('/api/admin/resources/:id', requireAuth, (req, res) => {
  const r = readRes().find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json(r);
});`,
  `app.get('/api/admin/products', requireAuth, async (req, res) => res.json(await store.listProducts()));
app.get('/api/admin/products/:id', requireAuth, async (req, res) => {
  const p = await store.getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json(p);
});
app.get('/api/admin/news', requireAuth, async (req, res) => res.json(await store.listNews()));
app.get('/api/admin/news/:id', requireAuth, async (req, res) => {
  const n = await store.getNews(req.params.id);
  if (!n) return res.status(404).json({ error: 'not_found' });
  res.json(n);
});
app.get('/api/admin/resources', requireAuth, async (req, res) => res.json(await store.listResources()));
app.get('/api/admin/resources/:id', requireAuth, async (req, res) => {
  const r = await store.getResource(req.params.id);
  if (!r) return res.status(404).json({ error: 'not_found' });
  res.json(r);
});`
);

// Generic simple replacements for common patterns
// readProducts() -> must be awaited - only inside async handlers after we fix handlers

// Fix search route to async
s = s.replace(
  /app\.get\('\/api\/search',\s*\(req, res\) => \{/,
  `app.get('/api/search', async (req, res) => {`
);
rep('publicList(readProducts())', 'publicList(await store.listProducts())');
rep('publicList(readNews())', 'publicList(await store.listNews())');
rep('publicList(readRes())', 'publicList(await store.listResources())');
rep('readProducts()', 'await store.listProducts()');
rep('readNews()', 'await store.listNews()');
rep('readRes()', 'await store.listResources()');
rep('readInq()', 'await store.listInquiries()');
rep('readCats()', 'await store.listCategories()');
rep('readContent()', '/* content via store */ null');

// write helpers - these need context-specific handling; mark remaining
console.log('remaining readProducts', (s.match(/readProducts/g) || []).length);
console.log('remaining writeProducts', (s.match(/writeProducts/g) || []).length);
console.log('remaining writeNews', (s.match(/writeNews/g) || []).length);
console.log('remaining writeRes', (s.match(/writeRes/g) || []).length);
console.log('remaining writeInq', (s.match(/writeInq/g) || []).length);
console.log('remaining writeCats', (s.match(/writeCats/g) || []).length);
console.log('remaining writeContent', (s.match(/writeContent/g) || []).length);
console.log('remaining readContent', (s.match(/readContent/g) || []).length);

fs.writeFileSync(file, s);
console.log('patched base routes');
