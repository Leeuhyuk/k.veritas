/**
 * admin-app 빌드 결과를 저장소 루트 admin/ 에 복사 (GitHub Pages용)
 * + SPA 404 폴백
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'admin-app', 'dist');
const DEST = path.join(ROOT, 'admin');

function rmDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(path.join(SRC, 'index.html'))) {
  console.error('admin-app/dist 없음 — 먼저 npm run build:admin');
  process.exit(1);
}

rmDir(DEST);
copyDir(SRC, DEST);

// 공용 styles.css 링크 보장 (vite가 외부 상대경로를 빼는 경우 대비)
let index = fs.readFileSync(path.join(DEST, 'index.html'), 'utf8');
if (!index.includes('../styles.css') && !index.includes('href="/styles.css"')) {
  index = index.replace(
    '</head>',
    '    <link rel="stylesheet" href="../styles.css" />\n  </head>'
  );
}
// GitHub Pages SPA: 없는 경로 → index.html
fs.writeFileSync(path.join(DEST, 'index.html'), index);
fs.writeFileSync(path.join(DEST, '404.html'), index);

console.log('[publish-admin] copied to admin/ (+ 404.html SPA fallback)');
