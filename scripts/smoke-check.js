/**
 * HTTP 스모크 (서버가 떠 있어야 함)
 * 사용: node scripts/smoke-check.js
 */
const BASE = process.env.BASE || 'http://localhost:3000';

async function check(path, opts = {}) {
  const url = BASE + path;
  const res = await fetch(url, { redirect: opts.redirect || 'manual', ...opts });
  return { path, status: res.status, location: res.headers.get('location'), ok: res.ok };
}

async function main() {
  const results = [];
  const fail = [];

  const pages = [
    '/',
    '/showcase.html',
    '/reference.html',
    '/news.html',
    '/styles.css',
    '/api/products',
    '/api/resources',
    '/api/news',
    '/public-ui/assets/showcase.js',
    '/public-ui/assets/resources.js',
    '/public-ui/assets/news.js',
  ];
  for (const p of pages) {
    try {
      const r = await check(p);
      results.push(r);
      if (r.status < 200 || r.status >= 400) fail.push(r);
    } catch (e) {
      fail.push({ path: p, error: e.message });
    }
  }

  const adminPaths = ['/admin/', '/admin/news', '/admin/resources', '/admin/inquiries', '/admin/settings'];
  for (const p of adminPaths) {
    try {
      const r = await check(p);
      results.push(r);
      if (r.status !== 200) fail.push(r);
    } catch (e) {
      fail.push({ path: p, error: e.message });
    }
  }

  const redirects = [
    ['/admin.html', '/admin/'],
    ['/admin-news.html', '/admin/news'],
    ['/admin-resources.html', '/admin/resources'],
    ['/admin-inquiries.html', '/admin/inquiries'],
    ['/admin-settings.html', '/admin/settings'],
  ];
  for (const [from, to] of redirects) {
    try {
      const r = await check(from);
      results.push(r);
      const loc = r.location || '';
      if (r.status !== 302 && r.status !== 301) fail.push({ ...r, expect: '302→' + to });
      else if (!loc.includes(to.replace(/\/$/, '')) && loc !== to && !loc.endsWith(to)) {
        fail.push({ ...r, expect: to, got: loc });
      }
    } catch (e) {
      fail.push({ path: from, error: e.message });
    }
  }

  try {
    const showcase = await (await fetch(BASE + '/showcase.html')).text();
    if (!showcase.includes('showcase-root') || !showcase.includes('/public-ui/assets/showcase.js')) {
      fail.push({ path: '/showcase.html', error: 'public-ui showcase 마운트 누락' });
    }
    const ref = await (await fetch(BASE + '/reference.html')).text();
    if (!ref.includes('resources-root') || !ref.includes('/public-ui/assets/resources.js')) {
      fail.push({ path: '/reference.html', error: 'public-ui resources 마운트 누락' });
    }
    const news = await (await fetch(BASE + '/news.html')).text();
    if (!news.includes('news-root') || !news.includes('/public-ui/assets/news.js')) {
      fail.push({ path: '/news.html', error: 'public-ui news 마운트 누락' });
    }
  } catch (e) {
    fail.push({ path: 'html-check', error: e.message });
  }

  console.log('BASE', BASE);
  results.forEach((r) => {
    if (r.error) console.log('  ERR', r.path, r.error);
    else console.log(' ', r.status, r.path, r.location || '');
  });

  if (fail.length) {
    console.log('\nFAIL', fail.length);
    fail.forEach((f) => console.log(' ', JSON.stringify(f)));
    process.exit(1);
  }
  console.log('\nSMOKE OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
