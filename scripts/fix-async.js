const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'server.js');
let s = fs.readFileSync(file, 'utf8');

// (req, res) => → async (req, res) => unless already async
s = s.replace(/(?<!async )\((req, res)\) =>/g, 'async (req, res) =>');
s = s.replace(/async async \(req/g, 'async (req');

// content routes
s = s.replace(
  /app\.get\('\/api\/content\/:page', async \(req, res\) => \{[\s\S]*?res\.json\(all\[req\.params\.page\] \|\| \{\}\);\s*\}\);/,
  `app.get('/api/content/:page', async (req, res) => {
  res.json(await store.getPageContent(req.params.page));
});`
);
s = s.replace(
  /app\.put\('\/api\/content\/:page', requireAuth, async \(req, res\) => \{[\s\S]*?res\.json\(all\[req\.params\.page\]\);\s*\}\);/,
  `app.put('/api/content/:page', requireAuth, async (req, res) => {
  const content = (req.body && req.body.content) || {};
  res.json(await store.savePageContent(req.params.page, content));
});`
);

// leftover write* if any
const leftover = ['writeProducts(', 'writeNews(', 'writeRes(', 'writeInq(', 'writeCats(', 'readContent(', 'writeContent('];
for (const k of leftover) {
  if (s.includes(k)) console.log('still', k);
}

fs.writeFileSync(file, s);
console.log('done');
