/**
 * admin-app / public-ui dist 가 없으면 빌드한다.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function needBuild(pkgDir, markerRel) {
  const pkg = path.join(root, pkgDir, 'package.json');
  const marker = path.join(root, pkgDir, markerRel);
  if (!fs.existsSync(pkg)) return false;
  return !fs.existsSync(marker);
}

function run(script) {
  console.log(`[ensure-build] ${script}…`);
  const r = spawnSync(npm, ['run', script], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
}

if (needBuild('admin-app', path.join('dist', 'index.html'))) {
  run('build:admin');
} else {
  console.log('[ensure-build] admin dist OK');
}

const publicMarkers = ['showcase.js', 'resources.js', 'news.js'].map((f) =>
  path.join('dist', 'assets', f)
);
const publicMissing = publicMarkers.some((rel) =>
  needBuild('public-ui', rel)
);
if (publicMissing) {
  run('build:public');
} else {
  console.log('[ensure-build] public-ui dist OK');
}

process.exit(0);
