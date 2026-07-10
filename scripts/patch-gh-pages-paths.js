/**
 * 공개 HTML에 site-base.js 삽입 + /public-ui 절대경로를 상대경로로
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const publicPages = [
  'index.html',
  'about.html',
  'certifications.html',
  'facilities.html',
  'location.html',
  'products.html',
  'product-parts.html',
  'product-mold.html',
  'product-module.html',
  'biz-machining.html',
  'biz-mold.html',
  'biz-assembly.html',
  'showcase.html',
  'showcase-detail.html',
  'news.html',
  'news-detail.html',
  'reference.html',
  'resource-detail.html',
  'support.html',
  'privacy.html',
];

for (const name of publicPages) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  let changed = false;

  // /public-ui/ → public-ui/dist/ (상대, GitHub project pages 대응)
  if (s.includes('src="/public-ui/assets/')) {
    s = s.split('src="/public-ui/assets/').join('src="public-ui/dist/assets/');
    changed = true;
  }
  if (s.includes('src="public-ui/assets/')) {
    s = s.split('src="public-ui/assets/').join('src="public-ui/dist/assets/');
    changed = true;
  }

  // site-base.js 삽입 (site.js 앞)
  if (!s.includes('site-base.js')) {
    if (s.includes('<script src="site.js"></script>')) {
      s = s.replace(
        '<script src="site.js"></script>',
        '<script src="site-base.js"></script>\n  <script src="site.js"></script>'
      );
      changed = true;
    } else if (s.includes("src='site.js'")) {
      s = s.replace(
        "<script src='site.js'></script>",
        "<script src='site-base.js'></script>\n  <script src='site.js'></script>"
      );
      changed = true;
    } else if (s.includes('</body>')) {
      s = s.replace('</body>', '  <script src="site-base.js"></script>\n</body>');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, s);
    console.log('patched', name);
  }
}

console.log('done');
