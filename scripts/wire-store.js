/**
 * server.js → store/media 연동 (신중 패치)
 */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'server.js');
let s = fs.readFileSync(file, 'utf8');

// --- requires ---
if (!s.includes("require('./lib/store.js')")) {
  s = s.replace(
    "const { sanitizeHtml } = require('./sanitize-html.js');\n",
    "const { sanitizeHtml } = require('./sanitize-html.js');\nconst store = require('./lib/store.js');\nconst media = require('./lib/media.js');\n"
  );
}
if (!s.includes('store.boot()')) {
  s = s.replace(
    'fs.mkdirSync(INQUIRY_UPLOAD_DIR, { recursive: true });\n',
    'fs.mkdirSync(INQUIRY_UPLOAD_DIR, { recursive: true });\nstore.boot();\n'
  );
}

// --- remove JSON helper function DEFINITIONS (keep only used sync bits) ---
// products
s = s.replace(
  /function readProducts\(\) \{\s*try \{\s*return JSON\.parse\(fs\.readFileSync\(DATA_FILE, 'utf-8'\)\);\s*\} catch \(e\) \{\s*return \[\];\s*\}\s*\}\s*function writeProducts\(list\) \{\s*fs\.writeFileSync\(DATA_FILE, JSON\.stringify\(list, null, 2\), 'utf-8'\);\s*\}/,
  '/* products → store.listProducts / saveProduct / deleteProduct / replaceProductsOrder */'
);
// cats
s = s.replace(
  /function readCats\(\) \{\s*try \{ return JSON\.parse\(fs\.readFileSync\(CAT_FILE, 'utf-8'\)\); \} catch \(e\) \{ return \[\]; \}\s*\}\s*function writeCats\(list\) \{\s*fs\.writeFileSync\(CAT_FILE, JSON\.stringify\(list, null, 2\), 'utf-8'\);\s*\}/,
  '/* categories → store.listCategories / saveCategories */'
);
// news
s = s.replace(
  /function readNews\(\) \{ try \{ return JSON\.parse\(fs\.readFileSync\(NEWS_FILE, 'utf-8'\)\); \} catch \(e\) \{ return \[\]; \} \}\s*function writeNews\(l\) \{ fs\.writeFileSync\(NEWS_FILE, JSON\.stringify\(l, null, 2\), 'utf-8'\); \}/,
  '/* news → store */'
);
// inq
s = s.replace(
  /function readInq\(\) \{ try \{ return JSON\.parse\(fs\.readFileSync\(INQ_FILE, 'utf-8'\)\); \} catch \(e\) \{ return \[\]; \} \}\s*function writeInq\(l\) \{ fs\.writeFileSync\(INQ_FILE, JSON\.stringify\(l, null, 2\), 'utf-8'\); \}/,
  '/* inquiries → store */'
);
// res
s = s.replace(
  /function readRes\(\) \{ try \{ return JSON\.parse\(fs\.readFileSync\(RES_FILE, 'utf-8'\)\); \} catch \(e\) \{ return \[\]; \} \}\s*function writeRes\(l\) \{ fs\.writeFileSync\(RES_FILE, JSON\.stringify\(l, null, 2\), 'utf-8'\); \}/,
  '/* resources → store */'
);

// content helpers later
s = s.replace(
  /const CONTENT_FILE = path\.join\(DATA_DIR, 'content\.json'\);\s*if \(!fs\.existsSync\(CONTENT_FILE\)\) fs\.writeFileSync\(CONTENT_FILE, '\{\}', 'utf-8'\);\s*function readContent\(\) \{ try \{ return JSON\.parse\(fs\.readFileSync\(CONTENT_FILE, 'utf-8'\)\); \} catch \(e\) \{ return \{\}; \} \}\s*function writeContent\(o\) \{ fs\.writeFileSync\(CONTENT_FILE, JSON\.stringify\(o, null, 2\), 'utf-8'\); \}/,
  '/* content → store.getPageContent / savePageContent */'
);

// media helpers
s = s.replace(
  /function filterKeptUploadUrls\(list\) \{\s*if \(!Array\.isArray\(list\)\) return \[\];\s*return list\.filter\(\(u\) => !!resolveUploadUrl\(u\)\);\s*\}/,
  `function filterKeptUploadUrls(list) {
  return media.filterKeptMediaUrls(list);
}`
);
s = s.replace(
  /function unlinkUploadUrl\(urlPath\) \{\s*const f = resolveUploadUrl\(urlPath\);\s*if \(f && fs\.existsSync\(f\)\) \{\s*try \{ fs\.unlinkSync\(f\); \} catch \(e\) \{ \/\* ignore \*\/ \}\s*\}\s*\}/,
  `async function unlinkUploadUrl(urlPath) {
  await media.deleteMediaUrl(urlPath);
}`
);

// Make handlers async when they use data (make ALL app route handlers async - safe)
function makeAsyncCallbacks(src) {
  // app.METHOD(..., (req, res) =>  -> async
  src = src.replace(
    /app\.(get|post|put|delete)\(((?:[^()]|\([^()]*\))*)\),\s*\(req,\s*res\)\s*=>/g,
    (m, method, args) => {
      if (m.includes('async (req')) return m;
      return `app.${method}(${args}, async (req, res) =>`;
    }
  );
  // with requireAuth
  src = src.replace(
    /(requireAuth),\s*\(req,\s*res\)\s*=>/g,
    '$1, async (req, res) =>'
  );
  // multer middlewares before (req,res)
  src = src.replace(
    /(upload\.array\('images',\s*8\)),\s*\(req,\s*res\)\s*=>/g,
    "$1, async (req, res) =>"
  );
  src = src.replace(
    /(docUpload\.single\('file'\)),\s*\(req,\s*res\)\s*=>/g,
    "$1, async (req, res) =>"
  );
  src = src.replace(
    /(inquiryUpload\.array\('files',\s*5\)),\s*\(req,\s*res\)\s*=>/g,
    "$1, async (req, res) =>"
  );
  src = src.replace(/async async \(req/g, 'async (req');
  return src;
}
s = makeAsyncCallbacks(s);

// CALL SITE replacements only (definitions already removed)
const callMap = [
  ['readProducts()', 'await store.listProducts()'],
  ['readNews()', 'await store.listNews()'],
  ['readRes()', 'await store.listResources()'],
  ['readInq()', 'await store.listInquiries()'],
  ['readCats()', 'await store.listCategories()'],
];
for (const [a, b] of callMap) s = s.split(a).join(b);

// Fix .find chaining
s = s.split('await store.listProducts().find').join('(await store.listProducts()).find');
s = s.split('await store.listNews().find').join('(await store.listNews()).find');
s = s.split('await store.listResources().find').join('(await store.listResources()).find');
s = s.split('await store.listInquiries().find').join('(await store.listInquiries()).find');
s = s.split('await store.listCategories().filter').join('(await store.listCategories()).filter');

// Prefer getById
s = s.replace(
  /\(await store\.listProducts\(\)\)\.find\(\(x\) => x\.id === req\.params\.id\)/g,
  'await store.getProduct(req.params.id)'
);
s = s.replace(
  /\(await store\.listNews\(\)\)\.find\(\(x\) => x\.id === req\.params\.id\)/g,
  'await store.getNews(req.params.id)'
);
s = s.replace(
  /\(await store\.listResources\(\)\)\.find\(\(x\) => x\.id === req\.params\.id\)/g,
  'await store.getResource(req.params.id)'
);
s = s.replace(
  /\(await store\.listInquiries\(\)\)\.find\(\(x\) => x\.id === req\.params\.id\)/g,
  'await store.getInquiry(req.params.id)'
);

// write* call patterns
s = s.replace(
  /const list = await store\.listProducts\(\);\s*list\.unshift\((\w+)\);\s*writeProducts\(list\);/g,
  'await store.saveProduct($1);'
);
s = s.replace(/list\[idx\] = p;\s*writeProducts\(list\);/g, 'await store.saveProduct(p);');
s = s.replace(
  /list = list\.filter\(\(x\) => x\.id !== req\.params\.id\);\s*writeProducts\(list\);/g,
  'await store.deleteProduct(req.params.id);'
);
s = s.replace(/writeProducts\(reordered\);/g, 'await store.replaceProductsOrder(ids);');

s = s.replace(
  /const list = await store\.listNews\(\);\s*list\.unshift\((\w+)\);\s*writeNews\(list\);/g,
  'await store.saveNews($1);'
);
s = s.replace(/list\[idx\] = n;\s*writeNews\(list\);/g, 'await store.saveNews(n);');
s = s.replace(
  /writeNews\(list\.filter\(\(x\) => x\.id !== req\.params\.id\)\);/g,
  'await store.deleteNews(req.params.id);'
);

s = s.replace(
  /const list = await store\.listResources\(\);\s*list\.unshift\((\w+)\);\s*writeRes\(list\);/g,
  'await store.saveResource($1);'
);
s = s.replace(/list\[idx\] = r;\s*writeRes\(list\);/g, 'await store.saveResource(r);');
s = s.replace(
  /writeRes\(list\.filter\(\(x\) => x\.id !== req\.params\.id\)\);/g,
  'await store.deleteResource(req.params.id);'
);
// download counter
s = s.replace(
  /r\.downloads = \(r\.downloads \|\| 0\) \+ 1;\s*writeRes\(list\);/g,
  'r.downloads = (r.downloads || 0) + 1;\n  await store.saveResource(r);'
);

s = s.replace(
  /const list = await store\.listInquiries\(\);\s*list\.unshift\((\w+)\);\s*writeInq\(list\);/g,
  'await store.saveInquiry($1);'
);
s = s.replace(/writeInq\(list\);/g, 'await store.saveInquiry(it);');
s = s.replace(
  /writeInq\(list\.filter\(\(x\) => x\.id !== req\.params\.id\)\);/g,
  'await store.deleteInquiry(req.params.id);'
);

s = s.replace(
  /list\.push\(name\);\s*writeCats\(list\);/g,
  'list.push(name);\n  await store.saveCategories(list);'
);
s = s.replace(/writeCats\(list\);/g, 'await store.saveCategories(list);');

// content routes
s = s.replace(
  /app\.get\('\/api\/content\/:page', async \(req, res\) => \{\s*const all = readContent\(\);\s*res\.json\(all\[req\.params\.page\] \|\| \{\}\);\s*\}\);/,
  `app.get('/api/content/:page', async (req, res) => {
  res.json(await store.getPageContent(req.params.page));
});`
);
s = s.replace(
  /app\.put\('\/api\/content\/:page', requireAuth, async \(req, res\) => \{\s*const all = readContent\(\);\s*all\[req\.params\.page\] = \(req\.body && req\.body\.content\) \|\| \{\};\s*writeContent\(all\);\s*res\.json\(all\[req\.params\.page\]\);\s*\}\);/,
  `app.put('/api/content/:page', requireAuth, async (req, res) => {
  const content = (req.body && req.body.content) || {};
  res.json(await store.savePageContent(req.params.page, content));
});`
);

// images publish
s = s.replace(
  /await optimizeImages\(req\.files\);\s*const images = \(req\.files \|\| \[\]\)\.map\(\(f\) => '\/uploads\/' \+ f\.filename\);/g,
  `await optimizeImages(req.files);
  const images = await media.publishFiles(req.files, 'uploads');`
);
// news put concat
s = s.replace(
  /n\.images = kept\.concat\(\(req\.files \|\| \[\]\)\.map\(\(f\) => '\/uploads\/' \+ f\.filename\)\);/g,
  `n.images = kept.concat(await media.publishFiles(req.files, 'news'));`
);
s = s.replace(
  /const added = \(req\.files \|\| \[\]\)\.map\(\(f\) => '\/uploads\/' \+ f\.filename\);\s*p\.images = kept\.concat\(added\);/g,
  `const added = await media.publishFiles(req.files, 'products');
  p.images = kept.concat(added);`
);

// single upload
s = s.replace(
  /await optimizeImages\(\[req\.file\]\);\s*res\.json\(\{ url: '\/uploads\/' \+ req\.file\.filename \}\);/,
  `await optimizeImages([req.file]);
  res.json({ url: await media.publishSingle(req.file, 'cms') });`
);

// resource file fields
s = s.replace(
  /file: '\/uploads\/' \+ req\.file\.filename,/g,
  "file: await media.publishSingle(req.file, 'resources'),"
);
s = s.replace(
  /unlinkUploadUrl\(r\.file\);\s*r\.file = '\/uploads\/' \+ req\.file\.filename;/,
  `await media.deleteMediaUrl(r.file);
    r.file = await media.publishSingle(req.file, 'resources');`
);

// bulk image deletes
s = s.replace(
  /\(p\.images \|\| \[\]\)\.forEach\(\(u\) => \{\s*const f = resolveUploadUrl\(u\);\s*if \(f && fs\.existsSync\(f\)\) fs\.unlinkSync\(f\);\s*\}\);/g,
  'await media.deleteMediaUrls(p.images || []);'
);
s = s.replace(
  /\(p\.images \|\| \[\]\)\.forEach\(\(u\) => unlinkUploadUrl\(u\)\);/g,
  'await media.deleteMediaUrls(p.images || []);'
);
s = s.replace(
  /\(n\.images \|\| \[\]\)\.forEach\(\(u\) => \{ const f = resolveUploadUrl\(u\); if \(f && fs\.existsSync\(f\)\) fs\.unlinkSync\(f\); \}\);/g,
  'await media.deleteMediaUrls(n.images || []);'
);
s = s.replace(
  /removed\.forEach\(\(u\) => \{\s*const f = resolveUploadUrl\(u\);\s*if \(f && fs\.existsSync\(f\)\) fs\.unlinkSync\(f\);\s*\}\);/g,
  'await media.deleteMediaUrls(removed);'
);
s = s.replace(
  /removed\.forEach\(\(u\) => unlinkUploadUrl\(u\)\);/g,
  'await media.deleteMediaUrls(removed);'
);
// news kept filter delete - handled via simple string if present
if (s.includes('(n.images || []).filter((u) => !kept.includes(u)).forEach')) {
  s = s.replace(
    "(n.images || []).filter((u) => !kept.includes(u)).forEach((u) => {\n    const f = path.join(ROOT, u); if (fs.existsSync(f)) fs.unlinkSync(f);\n  });",
    "await media.deleteMediaUrls((n.images || []).filter((u) => !kept.includes(u)));"
  );
  s = s.replace(
    "(n.images || []).filter((u) => !kept.includes(u)).forEach((u) => {\n    const f = resolveUploadUrl(u); if (f && fs.existsSync(f)) fs.unlinkSync(f);\n  });",
    "await media.deleteMediaUrls((n.images || []).filter((u) => !kept.includes(u)));"
  );
}
s = s.replace(/unlinkUploadUrl\(r\.file\);/g, 'await media.deleteMediaUrl(r.file);');

// delete product after images
s = s.replace(
  /await media\.deleteMediaUrls\(p\.images \|\| \[\]\);\s*list = list\.filter[\s\S]*?writeProducts\(list\);/,
  'await media.deleteMediaUrls(p.images || []);\n  await store.deleteProduct(req.params.id);'
);

// sendResourceDownload - if file is http redirect
s = s.replace(
  /function sendResourceDownload\(req, res, r, list\) \{\s*if \(!r \|\| \(!isAdminReq\(req\) && !isPublished\(r\)\)\) return res\.status\(404\)\.send\('not found'\);\s*const f = resolveUploadUrl\(r\.file\);\s*if \(!f \|\| !fs\.existsSync\(f\)\) return res\.status\(404\)\.send\('file missing'\);\s*r\.downloads = \(r\.downloads \|\| 0\) \+ 1;\s*await store\.saveResource\(r\);\s*res\.download\(f, r\.originalName \|\| path\.basename\(f\)\);\s*\}/,
  `async function sendResourceDownload(req, res, r) {
  if (!r || (!isAdminReq(req) && !isPublished(r))) return res.status(404).send('not found');
  r.downloads = (r.downloads || 0) + 1;
  await store.saveResource(r);
  if (r.file && /^https?:\\/\\//i.test(r.file)) {
    return res.redirect(r.file);
  }
  const f = resolveUploadUrl(r.file);
  if (!f || !fs.existsSync(f)) return res.status(404).send('file missing');
  res.download(f, r.originalName || path.basename(f));
}`
);
s = s.replace(/sendResourceDownload\(req, res, r, list\)/g, 'sendResourceDownload(req, res, r)');
s = s.replace(
  /app\.get\('\/api\/resources\/brochure\/download', async \(req, res\) => \{\s*const list = await store\.listResources\(\);/,
  `app.get('/api/resources/brochure/download', async (req, res) => {
  const list = await store.listResources();`
);

// log mode
if (!s.includes('store.modeLabel')) {
  s = s.replace(
    'app.listen(PORT, () => {',
    `app.listen(PORT, () => {
  console.log('[store] mode=' + store.modeLabel());`
  );
}

// leftovers
for (const k of ['writeProducts', 'writeNews', 'writeRes', 'writeInq', 'writeCats', 'writeContent', 'readContent', 'readProducts', 'readNews', 'function await']) {
  const n = (s.match(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (n) console.log('LEFTOVER', k, n);
}

fs.writeFileSync(file, s);
console.log('OK bytes', s.length);
